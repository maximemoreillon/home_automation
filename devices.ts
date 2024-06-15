import { mqtt_client } from "./mqtt"
import { timeoutDelay } from "./config"
import { updateLocation } from "./userLocation"
import { logger } from "./logger"
import Room from "./models/room"

export interface Device {
  type: string
  statusTopic?: string
  commandTopic?: string
  // disabled?: boolean
}

export const switch_devices_of_rooms = (
  room: typeof Room,
  type: string,
  state: string
) => {
  const mqtt_payload = JSON.stringify({ state })

  room.devices
    .filter((d: Device) => d.type === type)
    .forEach(({ commandTopic }: Device) => {
      console.log(
        `[MQTT] turning ${type} ${commandTopic} of ${room.name} ${state}`
      )
      if (commandTopic)
        mqtt_client.publish(commandTopic, mqtt_payload, {
          qos: 1,

          retain: true,
        })
    })
}

export const turn_all_lights_off = async () => {
  const rooms = await Room.find()
  rooms.forEach((room) => {
    switch_devices_of_rooms(room.toJSON(), "light", "OFF")
  })
}

export const register_illuminance = async (topic: string, payload: any) => {
  const { illuminance } = payload
  if (!illuminance) return

  // TODO: elematch
  const rooms = await Room.find()
  const room = rooms.find((r) => r.devices.some((d) => d.statusTopic === topic))

  if (!room) return

  room.illuminance = Number(illuminance)
}

export const register_motion = (topic: string, { state }: any) => {
  if (!state || state !== "motion") return

  // TODO: elematch
  const rooms = await Room.find()
  const room = rooms.find((r) => r.devices.some((d) => d.statusTopic === topic))
  if (!room) return

  logger.info({
    message: `Motion detected in ${room.name} by sensor ${topic}`,
  })

  updateLocation(room.name)
}

export const timeout_callback = (room: Room) => () => {
  switch_devices_of_rooms(room, "light", "OFF")
}

export const setTimeoutForLightsOff = (previousLocation: string) => {
  const previous_room = rooms.find(({ name }) => name === previousLocation)

  if (!previous_room) return

  console.log(
    `[Timer] Setting ${timeoutDelay}ms timer for ${previous_room.name} lights to turn OFF`
  )

  previous_room.timeout = setTimeout(
    timeout_callback(previous_room),
    timeoutDelay
  )
}
