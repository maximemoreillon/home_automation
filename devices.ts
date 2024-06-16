import { timeoutDelay } from "./config"
import { updateLocation } from "./userLocation"
import Room from "./models/room"
import { timeouts } from "./timeouts"

export const turn_all_lights_off = async () => {
  const rooms = await Room.find()
  rooms.forEach((room) => {
    room.switchDevices("light", "OFF")
  })
}

export const register_illuminance = async (topic: string, payload: any) => {
  const { illuminance } = payload
  if (!illuminance) return

  const room = await Room.findOne({ "devices.statusTopic": topic })

  if (!room) return

  room.illuminance = Number(illuminance)

  await room.save()
}

export const register_motion = async (topic: string, { state }: any) => {
  if (!state || state !== "motion") return

  const room = await Room.findOne({ "devices.statusTopic": topic })
  if (!room) return

  const device = room.devices.find((d) => d.statusTopic === topic)
  if (!device) {
    console.log(`Device with topic ${topic} not found in room ${room.name}`)
    return
  }
  if (!device.enabled) {
    console.log(`Device with topic ${topic} is disabled`)
    return
  }

  updateLocation(room.name)
}

export const setTimeoutForLightsOff = async (previousLocation: string) => {
  const previous_room = await Room.findOne({ name: previousLocation })
  if (!previous_room) {
    console.log(
      `Room ${previous_room} not found, skipping setting lights off timer`
    )
    return
  }

  console.log(
    `[Timer] Setting ${timeoutDelay}ms timer for ${previous_room.name} lights to turn OFF`
  )

  const { _id } = previous_room
  const timeout = setTimeout(() => {
    previous_room.switchDevices("light", "OFF")
  }, timeoutDelay)
  timeouts.set(_id.toString(), timeout)
}
