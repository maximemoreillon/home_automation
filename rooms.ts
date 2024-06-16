// import { type Device, switch_devices_of_rooms } from "./devices"
import {
  daylight_start_time,
  daylight_end_time,
  default_illuminance_threshold,
} from "./config"
import Room from "./models/room"

// export interface Room {
//   name: string
//   devices: Device[]
//   illuminance?: number
//   nightOnly?: boolean
//   timeout?: NodeJS.Timeout
//   illuminance_threshold?: number
// }

export const turn_lights_on_in_current_room = async (new_location: string) => {
  const room = await Room.findOne({ name: new_location })
  // const room = rooms.find(({ name }) => name === new_location)
  if (!room) {
    console.log(`Room ${new_location} not found, cannot turn lights ON`)
    return
  }
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
      // switch_devices_of_rooms(room, "light", "ON")
      room.switchDevices("light", "ON")
    }

    // Turn lights on if illuminance is low
    else if (room.illuminance) {
      const illuminance_threshold =
        room.illuminance_threshold || default_illuminance_threshold
      if (room.illuminance < illuminance_threshold) {
        console.log(
          `[Location] Turning lights on in ${room.name} because of low illuminance (${room.illuminance} < ${illuminance_threshold})`
        )
        // switch_devices_of_rooms(room, "light", "ON")
        room.switchDevices("light", "ON")
      }
    } else
      console.log(
        "[Location] This room is night time only and it's not dark enough"
      )
  } else {
    console.log(
      `[Location] Turning lights on in ${room.name} regardless of time`
    )
    // switch_devices_of_rooms(room, "light", "ON")
    room.switchDevices("light", "ON")
  }

  // clear timouts
  // if (timeouts[room._id]) {
  //   console.log(`[Timer] clearing lights timeout for ${room.name}`)
  //   clearTimeout(room.timeout)
  // }

  room.clearTimeout()
}
