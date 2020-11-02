const mqtt = require('mqtt')
const express = require('express')
const socketio = require('socket.io')
const http = require('http')
const history = require('connect-history-api-fallback')
const bodyParser = require("body-parser")
const cors = require('cors')
const path = require('path')
const dotenv = require('dotenv')
const chalk = require('chalk')

let rooms = require('./config/rooms.js')

dotenv.config()

process.env.TZ = 'Asia/Tokyo'

// Parameters
const port = process.env.APP_PORT || 80

// Todo: Move this to a config file
let lights_off_delay = 1*60*1000 // [ms]
let daylight_start_time = 6 // [h]
let daylight_end_time = 17 // [h]
let illuminance_threshold = 500

// User location
let location = "unknown" // Default location
let enabled = true

//let timeouts = {} // experimental: storing timeouts

// Express instance
const app = express()
const http_server = http.Server(app)
const io = socketio(http_server)

const mqtt_client  = mqtt.connect(
  process.env.MQTT_URL,
  {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
  }
)

app.use(bodyParser.json())
app.use(cors())

// Connect to MQTT

function subscribe_to_all(){
  // Subscribing to all topics

  console.log(`[MQTT] Subscribing to all topics`)

  rooms.forEach(room => {
    //console.log(`[MQTT] Subscribing to topics for room ${room.name}`)

    if(room.motion_sensors){
      room.motion_sensors.forEach(sensor => { mqtt_client.subscribe(sensor.topic) })
    }

    if(room.illuminance_sensors) {
      room.illuminance_sensors.forEach(sensor => { mqtt_client.subscribe(sensor.topic) })
    }

  })

}


function switch_lights_of_room(room, state){
  let mqtt_payload = {state: state}

  console.log(`[MQTT] turning lights of ${chalk.yellow(room.name)} ${state}`)

  // Check if room has lights
  if(!room.lights) return

  room.lights.forEach( light => {
    if(light.disabled) return
    //mqtt_client.publish(light.topic, JSON.stringify(mqtt_payload))
    mqtt_client.publish(light.topic, JSON.stringify(mqtt_payload))
  })

}

function turn_all_ac_off(){
  let mqtt_payload = {state: 'OFF'}
  console.log(`[MQTT] turning AC of all rooms OFF`)

  rooms.forEach(room => {
    /*
    if(!room.ac_command_topics) return

    room.ac_command_topics.forEach(topic => {
      mqtt_client.publish(topic, JSON.stringify(mqtt_payload), {qos: 1, retain: true})
    })
    */

    if(!room.air_conditioners) return

    room.air_conditioners.forEach( device => {
      mqtt_client.publish(device.topic, JSON.stringify(mqtt_payload), {qos: 1, retain: true})
    })

  })
}


function timeOutCallback(room){
  // Turn off after timeout expires
  //turn_all_lights_of_room_off(room);
  return () => {switch_lights_of_room(room, 'OFF')}
}



function turn_previous_room_lights_off(previous_location){
  // Check if previous location is a room
  let previous_room = rooms.find(room => { return room.name === previous_location})

  // if the previous location is not a room, do nothing
  if(!previous_room) return

  // set timeout for previous room to turn off
  console.log(`[Timer] Setting ${lights_off_delay}ms timer for ${chalk.yellow(previous_room.name)} lights to turn OFF`)
  previous_room.lights_timeout = setTimeout(timeOutCallback(previous_room), lights_off_delay)
  //timeouts[previous_room.name] = setTimeout(timeOutCallback(previous_room), lights_off_delay)

}

function turn_lights_on_in_current_room(new_location){
  // Check if new location is a known room
  let new_room = rooms.find(room => { return room.name === new_location})

  if(!new_room) return

  // But if it's a night time only room, check if it's night time first
  if(new_room.nightTimeOnly){

    // if illuminance data not available, turn lights on based on time of the day
    if((new Date().getHours() <= daylight_start_time || new Date().getHours() >= daylight_end_time)){
      console.log(`[Location] Turning lights on in ${new_room.name} because of the time of the day`)
      switch_lights_of_room(new_room, 'ON')
    }

    // Turn lights on if illuminance is low
    else if(new_room.illuminance) {
      console.log(`[Location] Turning lights on in ${new_room.name} because of low illuminance`)
      if(new_room.illuminance < illuminance_threshold) {
        switch_lights_of_room(new_room, 'ON')
      }
    }

    // Nothing otherwise
    else console.log("[Location] This room is night time only and it's not dark enough")

  }
  else {
    console.log(`[Location] Turning lights on in ${new_room.name} regardless of time`)
    switch_lights_of_room(new_room, 'ON')
  }

  // clear timouts
  // Todo: might want to rename
  if(new_room.lights_timeout){
    console.log(`[Timer] clearing timer for ${chalk.yellow(new_room.name)}`)
    clearTimeout(new_room.lights_timeout)
  }

  /*
  if(timeouts[new_room.name]){
    console.log(`[Timer] clearing timer for ${new_room.name}`)
    clearTimeout(timeouts[new_room.name])
  }
  */

}

function register_illuminance(topic, payload_json){
  // Check what room the event was triggered from
  if(!payload_json.illuminance) return

  let matching_room = rooms.find( room => {

    //if(!room.illuminance_topics) return false
    //return room.illuminance_topics.includes(topic)

    if(!room.illuminance_sensors) return

    return room.illuminance_sensors.find(sensor => {
      return sensor.topic === topic
    })

  })

  // Do nothing if the room could not be found
  if(!matching_room) return

  //console.log(`[MQTT] Illuminance of ${matching_room.name}: ${payload_json.illuminance}`)

  // Store the illuminance value
  matching_room.illuminance = payload_json.illuminance
}

function register_motion(topic, payload_json){

  // Check if the payload has a state
  if(!payload_json.state) return

  // Check if the state relates to motion
  if(payload_json.state !== 'motion') return

  // Check what room the event was triggered from
  const matching_room = rooms.find( room => {

    //if(!room.motion_sensor_topics) return false
    //return room.motion_sensor_topics.includes(topic)

    if(!room.motion_sensors) return

    let sensor = room.motion_sensors.find(sensor => {
      return sensor.topic === topic
    })

    if(!sensor) return false

    // Do nothing if the sensor is not enabled
    if(sensor.disabled) console.log(`[Motion] Sensor is disabled`)
    else return sensor

  })

  // Don't do anything if the room could not be found
  if(!matching_room) return

  console.log(`[MQTT] Motion detected in ${chalk.yellow(matching_room.name)} by ${topic}`)

  // Actions following motion detection => location update
  // This could be a callback
  exports.update_location(matching_room.name)

}

exports.update_location = (new_location) => {

  // Check if location changed
  if(location === new_location) return

  const previous_location = location
  location = new_location

  console.log(`[Location] Location changed to ${chalk.yellow(location)}`)

  // Websocket emit
  io.emit('location', location)

  // Actions upon location update
  if(enabled) {

    //  Check if new location is 'out'
    if(location === 'out'){
      console.log('[Location] User is outside, turning AC off')
      turn_all_ac_off()
    }

    // Deal with new room
    turn_lights_on_in_current_room(location)

    // Deal with previous room
    turn_previous_room_lights_off(previous_location)

  }

}


// MQTT connection callback
mqtt_client.on('connect', () => {
  console.log("[MQTT] Connected to MQTT broker")
  subscribe_to_all()
})


// MQTT message callback
mqtt_client.on('message', (topic, payload) => {
  //console.log(`[MQTT] Message arrived on ${topic}: ${payload}`);

  // Parse the payload
  let payload_json = undefined

  try {
    payload_json = JSON.parse(payload)
  }
  catch (e) {
    console.log(`[MQTT] Failed to parse payload`)
    return
  }


  // reister motion
  register_motion(topic, payload_json)

  // Register illuminance
  register_illuminance(topic, payload_json)
})

// Express controllers
let get_location = (req, res) => {
  res.send(location)
}

let express_update_location = (req, res) => {
  // RestFul API to update location

  let new_location = req.body.location
  if(!new_location) return res.status(400).send("location not defined");

  exports.update_location(new_location)
  res.send(location);
}

app.route('/location')
  .get(get_location)
  .put(express_update_location)

app.get('/enabled', (req, res) => {
  res.send(location)
})

app.put('/enabled', (req, res) => {
  let new_state = req.body.enabled
  if(!enabled) return res.status(400).send(`enabled not set`)
  enabled = new_state
  res.send(enabled)
})





io.on('connection', (socket) =>{
  console.log('[Websocket] a user connected');
  socket.emit('location',location)
})

// Start the web server
http_server.listen(port, () => {
  console.log(`Example app listening on port ${port}!`)
})
