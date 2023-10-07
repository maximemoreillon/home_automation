import dotenv from "dotenv"
dotenv.config()

import express from "express"
import { Server, Socket } from "socket.io"
import http from "http"
import cors from "cors"
import pjson from "./package.json"
import { getLocation } from "./userLocation"
import enabledRouter from "./routes/enabled"
import locationRouter from "./routes/location"
import roomsRouter from "./routes/rooms"
import auth from "@moreillon/express_identification_middleware"
import axios from "axios"

process.env.TZ = "Asia/Tokyo"

const {
  EXPRESS_PORT = 80,
  MQTT_URL,
  IDENTIFICATION_URL = "http://user-manager/users/self",
} = process.env

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

app.use(auth({ url: IDENTIFICATION_URL }))
app.use("/location", locationRouter)
app.use("/enabled", enabledRouter)
app.use("/rooms", roomsRouter)

io.on("connection", async (socket: Socket) => {
  console.log("[Websocket] a user connected")

  try {
    const authHeader = socket.handshake.headers?.authorization
    if (!authHeader) throw "unauthorized"
    const token = authHeader?.split(" ")[1]
    if (!token) throw "unauthorized"
    const headers = { authorization: `Bearer ${token}` }
    await axios.get(IDENTIFICATION_URL, { headers })
    console.log("Socket authenticated")
    socket.join("authenticated")
    socket.emit("location", getLocation())
  } catch (error) {
    console.log("Unauthenticatd socket")
    socket.disconnect()
  }
})

http_server.listen(EXPRESS_PORT, () => {
  console.log(`[Express] Listening on port ${EXPRESS_PORT}`)
})
