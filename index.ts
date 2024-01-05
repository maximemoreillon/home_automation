import dotenv from "dotenv"
dotenv.config()

import express from "express"
import { Server, Socket } from "socket.io"
import http from "http"
import cors from "cors"
import { version, author } from "./package.json"
import { getLocation } from "./userLocation"
import { LOKI_URL } from "./logger"
import enabledRouter from "./routes/enabled"
import locationRouter from "./routes/location"
import roomsRouter from "./routes/rooms"
import auth from "@moreillon/express_identification_middleware"
import axios from "axios"
import promBundle from "express-prom-bundle"

process.env.TZ = "Asia/Tokyo"

const {
  EXPRESS_PORT = 80,
  MQTT_URL,
  IDENTIFICATION_URL = "http://user-manager/users/self",
} = process.env

const promOptions = { includeMethod: true, includePath: true }

const app = express()
const http_server = new http.Server(app)
const io = new Server(http_server, {
  cors: {
    origin: "*",
  },
})

app.use(express.json())
app.use(cors())
app.use(promBundle(promOptions))

app.get("/", (req, res) => {
  res.send({
    application_name: "Home automation",
    author,
    version,
    mqtt_urL: MQTT_URL,
    loki_url: LOKI_URL,
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
    console.log("[Websocket] Socket authenticated")
    socket.join("authenticated")
    socket.emit("location", getLocation())
  } catch (error) {
    console.log("[Websocket] Unauthorized socket")
    socket.disconnect()
  }
})

http_server.listen(EXPRESS_PORT, () => {
  console.log(`[Express] Listening on port ${EXPRESS_PORT}`)
})

export const getIo = () => io
