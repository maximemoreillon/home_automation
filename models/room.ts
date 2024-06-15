import { Schema, model } from "mongoose"
import { mqtt_client } from "../mqtt"
import { timeouts } from "../timeouts"

const deviceSchema = new Schema({
  name: String,
  type: String,
  statusTopic: String,
  commandTopic: String,
})

const roomSchema = new Schema(
  {
    name: { type: String, required: true },

    nightOnly: Boolean,
    illuminance: Number,
    illuminance_threshold: Number,

    devices: [deviceSchema],
  },
  {
    methods: {
      switchDevices(type: string, state: string) {
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
        const timeout = timeouts[this._id]
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
