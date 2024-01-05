import fs from "fs"
import YAML from "yaml"
import { type Device, switch_devices_of_rooms } from "./devices"
import {
  daylight_start_time,
  daylight_end_time,
  default_illuminance_threshold,
} from "./config"

export interface Room {
  name: string
  devices: Device[]
  illuminance?: number
  nightOnly?: boolean
  timeout?: NodeJS.Timeout
}

const file = fs.readFileSync("./config/rooms.yml", "utf8")
export const rooms: Room[] = YAML.parse(file)

export const turn_lights_on_in_current_room = (new_location: string) => {
  const room: any = rooms.find(({ name }) => name === new_location)
  if (!room) return
  if (room.nightOnly) {
    // if illuminance data not available, turn lights on based on time of the day
    const current_hour = new Date().getHours()
    if (
      current_hour <= daylight_start_time ||
      current_hour >= daylight_end_time
    ) {
      console.log(
        `[Location] Turning lights on in ${room.name} because of the time of the day`
      )
      switch_devices_of_rooms(room, "light", "ON")
    }

    // Turn lights on if illuminance is low
    else if (room.illuminance) {
      const illuminance_threshold =
        room.illuminance_threshold || default_illuminance_threshold
      if (room.illuminance < illuminance_threshold) {
        console.log(
          `[Location] Turning lights on in ${room.name} because of low illuminance (${room.illuminance} < ${illuminance_threshold})`
        )
        switch_devices_of_rooms(room, "light", "ON")
      }
    } else
      console.log(
        "[Location] This room is night time only and it's not dark enough"
      )
  } else {
    console.log(
      `[Location] Turning lights on in ${room.name} regardless of time`
    )
    switch_devices_of_rooms(room, "light", "ON")
  }

  // clear timouts
  if (room.timeout) {
    console.log(`[Timer] clearing lights timeout for ${room.name}`)
    clearTimeout(room.timeout)
  }
}
