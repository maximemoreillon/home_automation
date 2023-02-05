const mqtt = require("mqtt")
const express = require("express")
const socketio = require("socket.io")
const http = require("http")
const cors = require("cors")
const dotenv = require("dotenv")
const chalk = require("chalk")
const pjson = require("./package.json")

const rooms = require("./config/rooms.js")

const state_topic = "/home-automation/state"
dotenv.config()

process.env.TZ = "Asia/Tokyo"

const { APP_PORT = 80, MQTT_USERNAME, MQTT_PASSWORD, MQTT_URL } = process.env

// Parameters

// Todo: Move this to a config file
const lights_off_delay = 1 * 60 * 1000 // [ms]
const daylight_start_time = 6 // [h]
const daylight_end_time = 17 // [h]
const illuminance_threshold = 500
const climate_control_off_delay = 30 * 60 * 1000 // [ms]
//const climate_control_off_delay = 5 * 1000 // [ms]

let state = require("./state.js")

let lights_timeouts = {} // experimental: storing lights_timeouts
let climate_control_timeouts = {}

// Express instance
const app = express()
const http_server = http.Server(app)
const io = socketio(http_server)

const mqtt_client = mqtt.connect(MQTT_URL, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
})

// Exports
exports.io = io
exports.mqtt_client = mqtt_client

app.use(express.json())
app.use(cors())

// Connect to MQTT

const subscribe_to_all = () => {
  // Subscribing to all topics

  console.log(`[MQTT] Subscribing to all topics`)

  rooms.forEach((room) => {
    //console.log(`[MQTT] Subscribing to topics for room ${room.name}`)

    // There should be a better way to subscribe to everyting
    // maybe {name: 'bedroom', topics: {motion: [], illuminance: []}}
    if (room.motion_sensors) {
      room.motion_sensors.forEach(({ topic }) => {
        mqtt_client.subscribe(topic)
      })
    }

    if (room.illuminance_sensors) {
      room.illuminance_sensors.forEach(({ topic }) => {
        mqtt_client.subscribe(topic)
      })
    }
  })

  // Also subscribing to direct state update topic
  mqtt_client.subscribe(state_topic)
}

const switch_devices_of_rooms = ({ room, device_type, state }) => {
  const mqtt_payload = JSON.stringify({ state })
  const mqtt_options = { qos: 1, retain: true }

  const devices = room[device_type]

  // Check if room has lights
  if (!devices) return

  console.log(
    `[MQTT] turning ${device_type}(s) of ${chalk.yellow(room.name)} ${state}`
  )

  devices
    .filter(({ disabled }) => !disabled)
    .forEach(({ topic }) =>
      mqtt_client.publish(topic, mqtt_payload, mqtt_options)
    )
}

const turn_all_ac_off = () => {
  // Might not be necessary now that climate control is controlled based on location

  console.log(`[MQTT] turning climate control of all rooms OFF`)

  rooms.forEach((room) => {
    switch_devices_of_rooms({
      room,
      state: "OFF",
      device_type: "air_conditioners",
    })
  })
}

const turn_all_lights_off = () => {
  // Might not be necessary now that climate control is controlled based on location

  console.log(`[MQTT] turning climate control of all rooms OFF`)

  rooms.forEach((room) => {
    switch_devices_of_rooms({ room, state: "OFF", device_type: "lights" })
  })
}

const lights_timeout_callback = (room) => () => {
  // Turn off after timeout expires
  // Note the function returning a function
  switch_devices_of_rooms({ room, state: "OFF", device_type: "lights" })
}

const climate_control_timeout_callback = (room) => () => {
  // Turn off after timeout expires
  // Note the function returning a function
  switch_devices_of_rooms({
    room,
    state: "OFF",
    device_type: "air_conditioners",
  })
}

const turn_previous_room_lights_off = (previous_location) => {
  // Check if previous location is a room
  const previous_room = rooms.find(({ name }) => name === previous_location)

  // if the previous location is not a room, do nothing
  if (!previous_room) return

  // set timeout for previous room to turn off
  console.log(
    `[Timer] Setting ${lights_off_delay}ms timer for ${chalk.yellow(
      previous_room.name
    )} lights to turn OFF`
  )
  //previous_room.lights_timeout = setTimeout(timeOutCallback(previous_room), lights_off_delay)
  lights_timeouts[previous_room.name] = setTimeout(
    lights_timeout_callback(previous_room),
    lights_off_delay
  )
}

const turn_previous_room_climate_control_off = (previous_location) => {
  // Check if previous location is a room
  const previous_room = rooms.find(({ name }) => name === previous_location)

  // if the previous location is not a room, do nothing
  if (!previous_room) return

  // set timeout for previous room to turn off
  console.log(
    `[Timer] Setting ${climate_control_off_delay}ms timer for ${chalk.yellow(
      previous_room.name
    )} climate control to turn OFF`
  )
  //previous_room.lights_timeout = setTimeout(timeOutCallback(previous_room), lights_off_delay)
  climate_control_timeouts[previous_room.name] = setTimeout(
    climate_control_timeout_callback(previous_room),
    climate_control_off_delay
  )
}

const turn_lights_on_in_current_room = (new_location) => {
  // Check if new location is a known room
  let new_room = rooms.find(({ name }) => name === new_location)

  if (!new_room) return

  // But if it's a night time only room, check if it's night time first
  if (new_room.nightTimeOnly) {
    // if illuminance data not available, turn lights on based on time of the day
    const current_hour = new Date().getHours()
    if (
      current_hour <= daylight_start_time ||
      current_hour >= daylight_end_time
    ) {
      console.log(
        `[Location] Turning lights on in ${new_room.name} because of the time of the day`
      )
      switch_devices_of_rooms({
        room: new_room,
        state: "ON",
        device_type: "lights",
      })
    }

    // Turn lights on if illuminance is low
    else if (new_room.illuminance) {
      console.log(
        `[Location] Turning lights on in ${new_room.name} because of low illuminance`
      )
      if (new_room.illuminance < illuminance_threshold) {
        switch_devices_of_rooms({
          room: new_room,
          state: "ON",
          device_type: "lights",
        })
      }
    }

    // Nothing otherwise
    else
      console.log(
        "[Location] This room is night time only and it's not dark enough"
      )
  } else {
    console.log(
      `[Location] Turning lights on in ${new_room.name} regardless of time`
    )
    switch_devices_of_rooms({
      room: new_room,
      state: "ON",
      device_type: "lights",
    })
  }

  // clear timouts
  if (lights_timeouts[new_room.name]) {
    console.log(`[Timer] clearing lights timeout for ${new_room.name}`)
    clearTimeout(lights_timeouts[new_room.name])
  }
}

const clear_timer_for_climate_control = (new_location) => {
  const new_room = rooms.find(({ name }) => name === new_location)

  if (!new_room) return

  if (!climate_control_timeouts[new_room.name]) return

  console.log(`[Timer] clearing climate control timeout for ${new_room.name}`)
  clearTimeout(climate_control_timeouts[new_room.name])
}

const register_illuminance = (topic, payload_json) => {
  // Check what room the event was triggered from
  if (!payload_json?.illuminance) return

  let matching_room = rooms
    .filter(({ illuminance_sensors }) => !!illuminance_sensors)
    .find(({ illuminance_sensors }) =>
      illuminance_sensors.find((sensor) => sensor.topic === topic)
    )

  // Do nothing if the room could not be found
  if (!matching_room) return

  //console.log(`[MQTT] Illuminance of ${matching_room.name}: ${payload_json.illuminance}`)

  // Store the illuminance value
  // Todo: find better way to store illuminance
  matching_room.illuminance = payload_json.illuminance
}

const register_motion = (topic, payload_json) => {
  // Check if the payload has a state
  if (!payload_json?.state) return

  // Check if the state relates to motion
  if (payload_json.state !== "motion") return

  // Check what room the event was triggered from
  const matching_room = rooms
    .filter(({ motion_sensors }) => !!motion_sensors)
    .find((room) => {
      const sensor = room.motion_sensors.find(
        (sensor) => sensor.topic === topic
      )

      if (!sensor) return false

      // Do nothing if the sensor is not enabled
      if (sensor.disabled) console.log(`[Motion] Sensor is disabled`)
      else return sensor
    })

  // Don't do anything if the room could not be found
  if (!matching_room) return

  console.log(
    `[MQTT] Motion detected in ${chalk.yellow(matching_room.name)} by ${topic}`
  )

  // Actions following motion detection => location update
  // This could be a callback
  update_location(matching_room.name)
}

const update_state = (topic, payload_json) => {
  if (topic !== state_topic || !payload_json) return

  const { location, enabled } = payload_json

  if (enabled) {
    if (enabled === "false") {
      console.log("[MQTT] Disabling automations")
      state.enabled = false
    } else if (enabled === "true") {
      console.log("[MQTT] Enabling automations")
      state.enabled = true
    }
  }

  if (location) {
    console.log("[MQTT] location update")
    update_location(location)
  }
}

const update_location = (new_location) => {
  // Check if location changed
  if (state.location === new_location) return

  const previous_location = state.location
  state.location = new_location

  console.log(`[Location] Location changed to ${chalk.yellow(state.location)}`)

  // Websocket emit
  io.emit("location", state.location)

  // Actions upon location update
  if (!state.enabled) return console.log(`Automations disabled`)

  //  Check if new location is 'out'
  if (state.location === "out") {
    console.log("[Location] User is outside, turning everything off")
    turn_all_ac_off()
    turn_all_lights_off()
  }

  // Deal with new room
  turn_lights_on_in_current_room(state.location)
  clear_timer_for_climate_control(state.location)

  // Deal with previous room
  turn_previous_room_lights_off(previous_location)
  turn_previous_room_climate_control_off(previous_location)
}

// MQTT connection callback
mqtt_client.on("connect", () => {
  console.log("[MQTT] Connected to MQTT broker")
  subscribe_to_all()
})

// MQTT message callback
mqtt_client.on("message", (topic, payload) => {
  //console.log(`[MQTT] Message arrived on ${topic}: ${payload}`);

  // Parse the payload
  let payload_json = undefined

  try {
    payload_json = JSON.parse(payload)
  } catch (e) {
    console.log(`[MQTT] Failed to parse payload`)
    return
  }

  // register motion
  register_motion(topic, payload_json)

  // Register illuminance
  register_illuminance(topic, payload_json)

  // Direct state update via MQTT
  update_state(topic, payload_json)
})

app.get("/", (req, res) => {
  res.send({
    application_name: "Maxime MOREILLON",
    version: pjson.version,
    mqtt_urL: MQTT_URL,
  })
})

// TODO: use express routers
app.use("/location", require("./routes/location"))
app.use("/enabled", require("./routes/enabled"))
app.use("/rooms", require("./routes/rooms"))

io.on("connection", (socket) => {
  console.log("[Websocket] a user connected")
  socket.emit("location", state.location)
})

// Start the web server
http_server.listen(APP_PORT, () => {
  console.log(`[Express] Home automation API listening on port ${APP_PORT}`)
})

exports.update_location = update_location
