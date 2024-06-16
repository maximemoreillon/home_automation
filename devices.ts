// import { mqtt_client } from "./mqtt"
import { timeoutDelay } from "./config"
import { updateLocation } from "./userLocation"
import { logger } from "./logger"
import Room from "./models/room"
import { timeouts } from "./timeouts"

// export interface Device {
//   type: string
//   statusTopic?: string
//   commandTopic?: string
//   // disabled?: boolean
// }

// export const switch_devices_of_rooms = (
//   room: typeof Room,
//   type: string,
//   state: string
// ) => {
//   const mqtt_payload = JSON.stringify({ state })

//   room.devices
//     .filter((d: Device) => d.type === type)
//     .forEach(({ commandTopic }: Device) => {
//       console.log(
//         `[MQTT] turning ${type} ${commandTopic} of ${room.name} ${state}`
//       )
//       if (commandTopic)
//         mqtt_client.publish(commandTopic, mqtt_payload, {
//           qos: 1,

//           retain: true,
//         })
//     })
// }

export const turn_all_lights_off = async () => {
  const rooms = await Room.find()
  rooms.forEach((room) => {
    // switch_devices_of_rooms(room.toJSON(), "light", "OFF")
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

  logger.info({
    message: `Motion detected in ${room.name} by sensor ${topic}`,
  })

  updateLocation(room.name)
}

// export const timeout_callback = (room: Room) => () => {
//   switch_devices_of_rooms(room, "light", "OFF")
// }

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

  // previous_room.timeout = setTimeout(
  //   timeout_callback(previous_room),
  //   timeoutDelay
  // )
}
