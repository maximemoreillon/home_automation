import express from "express"
import { Server, Socket } from "socket.io"
import http from "http"
import cors from "cors"
import { version, author } from "./package.json"
import { getLocation } from "./userLocation"
import { LOKI_URL } from "./logger"
import { MQTT_URL } from "./mqtt"
import enabledRouter from "./routes/enabled"
import locationRouter from "./routes/location"
import roomsRouter from "./routes/rooms"
import promBundle from "express-prom-bundle"
import swaggerUi from "swagger-ui-express"
import swaggerDocument from "./swagger-output.json"
import {
  expressAuthMiddleware,
  IDENTIFICATION_URL,
  OIDC_JWKS_URI,
  wsAuth,
} from "./auth"
process.env.TZ = "Asia/Tokyo"

const promOptions = { includeMethod: true, includePath: true }

const app = express()
export const http_server = new http.Server(app)
const io = new Server(http_server, {
  cors: {
    origin: "*",
  },
})

app.use(express.json())
app.use(cors())
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument))
app.use(promBundle(promOptions))

app.get("/", (req, res) => {
  res.send({
    application_name: "Home automation",
    author,
    version,
    mqtt_urL: MQTT_URL,
    loki_url: LOKI_URL,
    auth: {
      IDENTIFICATION_URL,
      OIDC_JWKS_URI,
    },
  })
})

app.use(expressAuthMiddleware)
app.use("/location", locationRouter)
app.use("/enabled", enabledRouter)
app.use("/rooms", roomsRouter)

io.on("connection", async (socket: Socket) => {
  console.log("[Websocket] a user connected")

  if (!IDENTIFICATION_URL && !OIDC_JWKS_URI) return
  try {
    await wsAuth(socket)
    socket.emit("location", getLocation())
  } catch (error) {
    console.log("[Websocket] Unauthorized socket")
    socket.disconnect()
  }
})

export const getIo = () => io
