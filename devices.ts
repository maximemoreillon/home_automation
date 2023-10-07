import { Room, rooms } from "./rooms"
import { mqtt_client } from "./mqtt"
import {
  state_topic,
  timeoutDelay,
  daylight_start_time,
  daylight_end_time,
  illuminance_threshold,
} from "./config"
import { updateLocation } from "./userLocation"

export interface Device {
  type: string
  statusTopic?: string
  commandTopic?: string
  disabled?: boolean
}

export const switch_devices_of_rooms = (
  room: Room,
  type: string,
  state: string
) => {
  const mqtt_payload = JSON.stringify({ state })

  room.devices
    .filter((d: Device) => !d.disabled && d.type === type)
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

export const turn_all_lights_off = () => {
  rooms.forEach((room: any) => {
    switch_devices_of_rooms(room, "light", "OFF")
  })
}

export const register_illuminance = (topic: string, payload: any) => {
  const { illuminance } = payload
  if (!illuminance) return

  const room = rooms.find((r) =>
    r.devices.some((d) => d.statusTopic === topic && !d.disabled)
  )

  if (!room) return

  room.illuminance = Number(illuminance)
}

export const register_motion = (topic: string, { state }: any) => {
  if (!state || state !== "motion") return

  const room = rooms.find((r) =>
    r.devices.some((d) => d.statusTopic === topic && !d.disabled)
  )
  if (room) updateLocation(room.name)
}

export const timeout_callback = (room: any) => () => {
  switch_devices_of_rooms(room, "light", "OFF")
}

export const setTimeoutForLightsOff = (previousLocation: string) => {
  const previous_room = rooms.find(({ name }: any) => name === previousLocation)

  if (!previous_room) return

  console.log(
    `[Timer] Setting ${timeoutDelay}ms timer for ${previous_room.name} lights to turn OFF`
  )

  previous_room.timeout = setTimeout(
    timeout_callback(previous_room),
    timeoutDelay
  )
}
