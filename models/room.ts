import { Schema, model } from "mongoose"

const deviceSchema = new Schema({
  name: String,
  statusTopic: String,
  commandTopic: String,
})

const roomSchema = new Schema({
  name: String,

  nightOnly: Boolean,
  illuminance_threshold: Number,

  devices: [deviceSchema],
})

const Room = model("Room", roomSchema)

export default Room
