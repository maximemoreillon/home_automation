import { getIo } from "./"

let enabled = true

export const getEnabled = () => enabled
export const setEnabled = (newEnabled: boolean) => {
  enabled = newEnabled
  if (enabled) console.log("[Enabled] Turning automations ON")
  else console.log("[Enabled] Turning automations Off")
  getIo().to("authenticated").emit("enabled", enabled)
}
