import dotenv from "dotenv"
dotenv.config()

import express from "express"
import { Server } from "socket.io"
import http from "http"
import cors from "cors"
import pjson from "./package.json"
import { getLocation } from "./userLocation"
import enabledRouter from "./routes/enabled"
import locationRouter from "./routes/location"
import roomsRouter from "./routes/rooms"

process.env.TZ = "Asia/Tokyo"

const { EXPRESS_PORT = 80, MQTT_URL } = process.env

const app = express()
const http_server = new http.Server(app)
const io = new Server(http_server, {
  cors: {
    origin: "*",
  },
})

export const getIo = () => io

app.use(express.json())
app.use(cors())

app.get("/", (req, res) => {
  res.send({
    application_name: "Maxime MOREILLON",
    version: pjson.version,
    mqtt_urL: MQTT_URL,
  })
})

app.use("/location", locationRouter)
app.use("/enabled", enabledRouter)
app.use("/rooms", roomsRouter)

io.on("connection", (socket: any) => {
  console.log("[Websocket] a user connected")
  socket.emit("location", getLocation())
})

http_server.listen(EXPRESS_PORT, () => {
  console.log(`[Express] Listening on port ${EXPRESS_PORT}`)
})
