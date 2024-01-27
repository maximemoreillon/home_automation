import { connect } from "mqtt"
import { rooms } from "./rooms"
import { Room } from "./rooms"
import { register_motion, register_illuminance } from "./devices"
import { MQTT_COMMAND_TOPIC } from "./config"
import { setEnabled } from "./state"
import { updateLocation } from "./userLocation"

export const {
  MQTT_USERNAME,
  MQTT_PASSWORD,
  MQTT_URL = "mqtt://localhost:8118",
} = process.env

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

const subscribe_to_all = () => {
  rooms.forEach(({ devices }: Room) => {
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
