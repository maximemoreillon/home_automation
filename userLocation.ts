import { getIo } from "./server"
import { getEnabled } from "./state"
import chalk from "chalk"
import { setTimeoutForLightsOff, turn_all_devices_off } from "./devices"
import { turn_lights_on_in_current_room } from "./rooms"
import { mqtt_client } from "./mqtt"
import { MQTT_LOCATION_TOPIC } from "./config"

let location = "unknown"

export const getLocation = () => location

export const updateLocation = (new_location: string) => {
  if (location === new_location) return
  const previousLocation = location
  location = new_location

  console.log(`[Location] Location changed to ${chalk.yellow(location)}`)

  getIo().to("authenticated").emit("location", location)
  mqtt_client.publish(MQTT_LOCATION_TOPIC, location)

  // NOTE: takes priority over automations being disabled
  if (location === "out") {
    console.log("[Location] User is outside, turning everything off")
    turn_all_devices_off()
  }

  // Actions upon location update
  if (!getEnabled()) return console.log(`Automations are disabled`)

  turn_lights_on_in_current_room(location)
  setTimeoutForLightsOff(previousLocation)
}
