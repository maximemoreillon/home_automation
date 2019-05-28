var mqtt = require('mqtt');
var express = require('express');

var credentials = require('../common/credentials.js');
var rooms = require('./config/rooms.js').rooms;

process.env.TZ = 'Asia/Tokyo';

const port = 8083;
var location = "unknown"; // Default location
var lights_off_delay = 1*60*1000

// Express instance
var app = express();

// Connect to MQTT
var mqtt_client  = mqtt.connect('mqtt://192.168.1.2', {
  username: credentials.mqtt_username,
  password: credentials.mqtt_password
});

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


function timeOutCallback(room){
  // Turn off after timeout expires
  turn_all_lights_of_room_off(room);
}

function located_in(new_location){

  console.log("Located in " + new_location);

  // Deal with new location
  // Check if new location is a room
  for(var room_index=0; room_index<rooms.length; room_index++){
    if(new_location === rooms[room_index].name){

      // If it is a room, turn its lights on
      // But if it's a night time only room, check if it's night time first
      if(!rooms[room_index].nightTimeOnly || (new Date().getHours() <= 6 || new Date().getHours() >= 18)){
        turn_all_lights_of_room_on(rooms[room_index])
      }
      else {
        console.log("This room is night time only and it's not night time")
      }
      // clear timouts
      clearTimeout(rooms[room_index].timeOut);
    }
  }


  // need to check if changed
  if(location !== new_location){


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
    console.log("location has changed to " + location);
  }
}


// MQTT connection callback
mqtt_client.on('connect', function () {
  console.log("[MQTT] Connected to MQTT broker");
  subscribe_to_all();
});



mqtt_client.on('message', function (topic, payload) {
  console.log("[MQTT] Message arrived on " + topic + ": " + payload);

  // Check what room the event was triggered from
  for(var room_index=0; room_index<rooms.length; room_index++){
    if(rooms[room_index].motion_sensor_topics.includes(topic) && payload =='{"state":"motion"}'){
      located_in(rooms[room_index].name);
    }
  }
});



app.get('/presence', function(req, res) {
  // RestFul API

  // New logic
  if(req.query.location){
    located_in(req.query.location);
    res.send("OK")
  }
  else {
    res.send("Presence not defined")
    console.log("[HTTP] Invalid request")
  }
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
