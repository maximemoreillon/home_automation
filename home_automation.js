const mqtt = require('mqtt');
const express = require('express');
const socketio = require('socket.io');
const http = require('http');
const history = require('connect-history-api-fallback');
const bodyParser = require("body-parser");
const cors = require('cors');
const path = require('path');

var secrets = require('./secrets.js');

var rooms = require('./config/rooms.js');

process.env.TZ = 'Asia/Tokyo';

// Parameters
const port = 7073;
const lights_off_delay = 1*60*1000;

// User location
var location = "unknown"; // Default location

// Express instance
const app = express();
const http_server = http.Server(app);
const io = socketio(http_server);
const mqtt_client  = mqtt.connect('mqtt://192.168.1.2', secrets.mqtt);

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'dist')));
app.use(history({
  // Ignore routes for connect-history-api-fallback
  rewrites: [
    { from: '/presence', to: '/presence'},
    { from: '/location', to: '/location'},
  ]
}));



// Connect to MQTT

function subscribe_to_all(){
  // Subscribing to all topics
  for(var room_index=0; room_index<rooms.length; room_index++){
    for(var topic_index=0; topic_index<rooms[room_index].motion_sensor_topics.length; topic_index++){
      console.log("[MQTT] Subscribing to: " + rooms[room_index].motion_sensor_topics[topic_index])
      mqtt_client.subscribe(rooms[room_index].motion_sensor_topics[topic_index]);
    }
  }
}

function turn_all_lights_of_room_off(room){
  // Turn all lights of given room OFF
  console.log("[MQTT] turning lights of " + room.name + " OFF");
  for(var topic_index=0; topic_index<room.light_topics.length; topic_index++){
    mqtt_client.publish(room.light_topics[topic_index], "{'state':'OFF'}");
  }
}

function turn_all_lights_of_room_on(room){
  // Turn all lights of given room ON
  console.log("[MQTT] turning lights of " + room.name + " ON");
  for(var topic_index=0; topic_index<room.light_topics.length; topic_index++){
    mqtt_client.publish(room.light_topics[topic_index], "{'state':'ON'}");
  }
}

function turn_all_ac_off(){
  for(var room_index=0; room_index<rooms.length; room_index++){
    var room = rooms[room_index];

    // Check if the room has one of more AC units
    if(room.ac_command_topics){

      // If so, turn all off
      for(var topic_index=0; topic_index<room.ac_command_topics.length; topic_index++){
        mqtt_client.publish(room.ac_command_topics[topic_index], "{'state':'OFF'}");
      }
    }
  }
}


function timeOutCallback(room){
  // Turn off after timeout expires
  turn_all_lights_of_room_off(room);
}

function located_in(new_location){

  // Check if location changed
  if(location !== new_location){

    // Deal with new location


    //  Check if new location is 'out'
    if(new_location === 'out'){
      console.log('Apartment empty, turning AC units off');
      turn_all_ac_off();
    }

    // Check if new location is a room
    for(var room_index=0; room_index<rooms.length; room_index++){
      if(new_location === rooms[room_index].name){

        // If it is a room, turn its lights on
        // But if it's a night time only room, check if it's night time first
        if(!rooms[room_index].nightTimeOnly || (new Date().getHours() <= 6 || new Date().getHours() >= 17)){
          turn_all_lights_of_room_on(rooms[room_index])
        }
        else {
          console.log("This room is night time only and it's not night time")
        }
        // clear timouts
        clearTimeout(rooms[room_index].timeOut);
      }
    }

    // Deal with previous room
    // Check if previous location is a room
    for(var room_index=0; room_index<rooms.length; room_index++){
      if(location === rooms[room_index].name){
        // set timeout for previous room to turn off
        console.log("Setting timer for lights of " + rooms[room_index].name + " to turn OFF");
        rooms[room_index].timeOut = setTimeout(timeOutCallback, lights_off_delay, rooms[room_index]);
      }
    }

    // Update location
    location = new_location;
    console.log("Location changed to " + location);
  }
}


// MQTT connection callback
mqtt_client.on('connect', () => {
  console.log("[MQTT] Connected to MQTT broker");
  subscribe_to_all();
});


// MQTT message callback
mqtt_client.on('message', (topic, payload) => {
  console.log("[MQTT] Message arrived on " + topic + ": " + payload);

  // Check what room the event was triggered from
  for(var room_index=0; room_index<rooms.length; room_index++){
    if(rooms[room_index].motion_sensor_topics.includes(topic) && payload =='{"state":"motion"}'){
      located_in(rooms[room_index].name);
    }
  }
});

app.get('/location', (req, res) => {
  res.send(location);
});

app.get('/location_update', (req, res) => {
  // RestFul API to update location
  if(req.query.location){
    located_in(req.query.location);
    console.log("[HTTP] Location GET request");
    res.send(location);
  }
  else {
    // TODO: Send invalid code
    res.status(400).send("Presence not defined");
    console.log("[HTTP] Invalid request");
  }
});

// Start the web server
app.listen(port, () => console.log(`Example app listening on port ${port}!`))
