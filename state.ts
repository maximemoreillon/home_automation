import { getIo } from "./"
import { MQTT_STATE_TOPIC } from "./config"
import { mqtt_client } from "./mqtt"

let enabled = true

export const getEnabled = () => enabled
export const setEnabled = (newEnabled: boolean) => {
  enabled = newEnabled
  if (enabled) console.log("[Enabled] Turning automations ON")
  else console.log("[Enabled] Turning automations Off")
  getIo().to("authenticated").emit("enabled", enabled)
  mqtt_client.publish(MQTT_STATE_TOPIC, enabled ? "enabled" : "disabled")
}
