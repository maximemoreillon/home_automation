import { connect } from "mqtt"
import { register_motion, register_illuminance } from "./devices"
import { MQTT_COMMAND_TOPIC } from "./config"
import { setEnabled } from "./state"
import { updateLocation } from "./userLocation"
import Room from "./models/room"
import { get_state as get_mongodb_state } from "./db"

export const {
  MQTT_USERNAME,
  MQTT_PASSWORD,
  MQTT_URL = "mqtt://localhost:8118",
} = process.env

// TODO: connect after the DB is connected
export const mqtt_client = connect(MQTT_URL, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
})

mqtt_client.on("connect", () => {
  console.log("[MQTT] Connected to MQTT broker")
  subscribe_to_all()
})

mqtt_client.on("error", console.error)

mqtt_client.on("message", (topic, payloadBuffer) => {
  let payload: any

  try {
    payload = JSON.parse(payloadBuffer.toString())
  } catch (e) {
    console.log(`[MQTT] Failed to parse payload`)
    return
  }

  register_motion(topic, payload)
  register_illuminance(topic, payload)

  if (topic == MQTT_COMMAND_TOPIC) {
    // Problem: if disabled first, then automation to turn everything off won't work
    const { location, enabled } = payload

    if (enabled) setEnabled(enabled === "true")
    if (location) updateLocation(location)
  }
})

export const subscribe_to_all = async () => {
  if (get_mongodb_state() !== 1) {
    console.log(`[MQTT] MongoDB not connected, retrying in 3s`)
    setTimeout(subscribe_to_all, 3000)
    return
  }

  const rooms = await Room.find()

  rooms.forEach(({ devices }) => {
    devices.forEach(({ statusTopic }) => {
      if (statusTopic) {
        console.log(`[MQTT] Subscribing to ${statusTopic}`)
        mqtt_client.subscribe(statusTopic)
      }
    })
  })

  // Also subscribing to direct state update topic
  mqtt_client.subscribe(MQTT_COMMAND_TOPIC)
}
