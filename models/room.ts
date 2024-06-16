import { Schema, model } from "mongoose"
import { mqtt_client } from "../mqtt"
import { timeouts } from "../timeouts"

const deviceSchema = new Schema({
  name: String,
  type: String,
  enabled: { type: Boolean, default: true },
  statusTopic: String,
  commandTopic: String,
})

const roomSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },

    nightOnly: Boolean,
    illuminance: Number,
    illuminance_threshold: Number,

    devices: [deviceSchema],
  },
  {
    methods: {
      switchDevices(type: "light", state: "ON" | "OFF") {
        const mqtt_payload = JSON.stringify({ state })

        this.devices
          .filter((d) => d.type === type)
          .forEach(({ commandTopic }) => {
            console.log(
              `[MQTT] turning ${type} ${commandTopic} of ${this.name} ${state}`
            )
            if (commandTopic)
              mqtt_client.publish(commandTopic, mqtt_payload, {
                qos: 1,

                retain: true,
              })
          })
      },
      clearTimeout() {
        const _id = this._id.toString()
        const timeout = timeouts.get(_id)
        if (timeout) {
          console.log(`[Timer] clearing lights timeout for ${this.name}`)
          clearTimeout(timeout)
        }
      },
    },
  }
)

const Room = model("Room", roomSchema)

export default Room
