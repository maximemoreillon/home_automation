const {
  // TODO: remove initial "/"
  MQTT_STATE_TOPIC = "/home-automation/state",
} = process.env

export const state_topic = MQTT_STATE_TOPIC
export const timeoutDelay = 1 * 60 * 1000 // [ms]
export const daylight_start_time = 6 // [h]
export const daylight_end_time = 17 // [h]

export const default_illuminance_threshold = 500
