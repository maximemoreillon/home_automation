const mqtt = require('mqtt');
const express = require('express');
const socketio = require('socket.io');
const http = require('http');
const history = require('connect-history-api-fallback');
const bodyParser = require("body-parser");
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

var rooms = require('./config/rooms.js');

dotenv.config();

process.env.TZ = 'Asia/Tokyo';

// Parameters
const port = process.env.APP_PORT || 80

const lights_off_delay = 1*60*1000
const daylight_start_time = 6
const daylight_end_time = 17
const illuminance_threshold = 450

// User location
var location = "unknown"; // Default location

// Express instance
const app = express();
const http_server = http.Server(app);
const io = socketio(http_server);
const mqtt_client  = mqtt.connect(
  process.env.MQTT_URL,
  {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD
  }
)

app.use(bodyParser.json())
app.use(cors())

// Connect to MQTT

function subscribe_to_all(){
  // Subscribing to all topics
  rooms.forEach(room => {
    if(room.motion_sensor_topics){
      room.motion_sensor_topics.forEach(topic => { mqtt_client.subscribe(topic) });
    }

    if(room.illuminance_topics) {
      room.illuminance_topics.forEach(topic => { mqtt_client.subscribe(topic) });
    }

  });

}

function turn_all_lights_of_room_off(room){
  // Turn all lights of given room OFF
  console.log(`[MQTT] turning lights of ${room.name}  OFF`);
  room.light_topics.forEach( topic => {
    mqtt_client.publish(topic, "{'state':'OFF'}");
  });

}

function turn_all_lights_of_room_on(room){
  // Turn all lights of given room ON
  console.log(`[MQTT] turning lights of ${room.name}  ON`);
  room.light_topics.forEach( topic => {
    mqtt_client.publish(topic, "{'state':'ON'}");
  });
}

function turn_all_ac_off(){

  console.log(`[MQTT] turning AC of all rooms OFF`);
  rooms.forEach(room => {
    if(room.ac_command_topics){
      room.ac_command_topics.forEach(topic => { mqtt_client.publish(topic, "{'state':'OFF'}") });
    }

  });
}


function timeOutCallback(room){
  // Turn off after timeout expires
  turn_all_lights_of_room_off(room);
}



function turn_previous_room_lights_off(previous_location){
  // Check if previous location is a room
  let previous_room = rooms.find(room => { return room.name === previous_location})
  if(previous_room) {
    // set timeout for previous room to turn off
    console.log(`Setting timer for lights of ${previous_room.name} to turn OFF`);
    previous_room.timeOut = setTimeout(timeOutCallback, lights_off_delay, previous_room);
  }
}

function turn_lights_on_in_current_room(new_location){
  // Check if new location is a known room
  let new_room = rooms.find(room => { return room.name === new_location})

  if(new_room) {
    console.log(`[Location] ${new_location} is a known room`)
      // But if it's a night time only room, check if it's night time first
      if(new_room.nightTimeOnly){

        // if illuminance data not available, turn lights on based on time of the day
        if((new Date().getHours() <= daylight_start_time
          || new Date().getHours() >= daylight_end_time)){
          console.log(`[Location] Turning lights on in ${new_room.name} because of the time of the day`)
          turn_all_lights_of_room_on(new_room)
        }

        // Turn lights on if illuminance is low
        else if(new_room.illuminance) {
          console.log(`[Location] Turning lights on in ${new_room.name} because of low illuminance`)
          if(new_room.illuminance < illuminance_threshold) {
            turn_all_lights_of_room_on(new_room)
          }
        }



        // Turn lights on anyway
        else console.log("[Location] This room is night time only and it's not dark enough")

      }
      else {
        console.log(`[Location] Turning lights on in ${new_room.name} regardless of time`)
        turn_all_lights_of_room_on(new_room)
      }

    // clear timouts
    // SOMETHING BAD IS GOING TO HAPPEN HERE
    clearTimeout(new_room.timeOut);
  }
}

function register_illuminance(topic, payload_json){
  // Check what room the event was triggered from
  if(payload_json.illuminance){
    console.log(`[MQTT] Received illuminance information`)
    let matching_room = rooms.find( room => {
      if(room.illuminance_topics){
        return room.illuminance_topics.includes(topic)
      }
    })
    console.log(`[MQTT] Matching room for illuminance: ${matching_room.name}`)
    if(matching_room) matching_room.illuminance = payload_json.illuminance
  }
}

function register_motion(topic, payload_json){
  if(payload_json.state){
    if(payload_json.state === 'motion'){
      console.log('[MQTT] motion sensor triggered')
      // Check what room the event was triggered from
      let matching_room = rooms.find( room => {return room.motion_sensor_topics.includes(topic)})
      console.log(`[MQTT] Matching room for motion: ${matching_room.name}`)
      if(matching_room) update_location(matching_room.name);
    }
  }
}

function update_location(new_location){

  // Check if location changed
  if(location !== new_location){

    //  Check if new location is 'out'
    if(new_location === 'out'){
      console.log('[Location] No occupant at home, turning AC off')
      turn_all_ac_off()
    }

    // Deal with new room
    turn_lights_on_in_current_room(new_location)

    // Deal with previous room
    turn_previous_room_lights_off(location)

    // Update location
    location = new_location;
    io.emit('location', location)
    console.log(`[Location] Location changed to ${location}`);
  }
}


// MQTT connection callback
mqtt_client.on('connect', () => {
  console.log("[MQTT] Connected to MQTT broker");
  subscribe_to_all();
});


// MQTT message callback
mqtt_client.on('message', (topic, payload) => {
  console.log(`[MQTT] Message arrived on ${topic}: ${payload}`);

  // TODO: Check if parseable
  let payload_json = JSON.parse(payload)

  // Register illuminance
  register_illuminance(topic, payload_json)

  // reister motion
  register_motion(topic, payload_json)
});

app.get('/location', (req, res) => {
  res.send(location);
});

app.get('/location_update', (req, res) => {
  // RestFul API to update location
  if(!req.query.location) return res.status(400).send("location attribute not defined");

  update_location(req.query.location);
  res.send(location);

})

app.post('/location_update', (req, res) => {
  // RestFul API to update location
  if(!req.body.location) return res.status(400).send("location attribute not defined");

  update_location(req.body.location);
  res.send(location);

})

app.put('/location', (req, res) => {
  // RestFul API to update location
  if(!req.body.location) return res.status(400).send("location attribute not defined");

  update_location(req.body.location);
  res.send(location);
})


io.on('connection', (socket) =>{
  console.log('a user connected');
  socket.emit('location',location)
});

// Start the web server
http_server.listen(port, () => console.log(`Example app listening on port ${port}!`))
