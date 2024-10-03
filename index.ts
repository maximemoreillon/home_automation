import dotenv from "dotenv"
dotenv.config()

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
import legacyAuth from "@moreillon/express_identification_middleware"
import oidcAuth from "@moreillon/express-oidc"
import promBundle from "express-prom-bundle"
import swaggerUi from "swagger-ui-express"
import swaggerDocument from "./swagger-output.json"
import {
  IDENTIFICATION_URL,
  OIDC_JWKS_URI,
  verifyJwtLegacy,
  verifyJwtWithJwks,
} from "./auth"
process.env.TZ = "Asia/Tokyo"

const { EXPRESS_PORT = 80 } = process.env

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
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument))

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

if (OIDC_JWKS_URI) {
  console.log(`[Auth] Enabling OIDC auth with ${OIDC_JWKS_URI}`)
  app.use(oidcAuth({ jwksUri: OIDC_JWKS_URI }))
} else if (IDENTIFICATION_URL) {
  console.log(`[Auth] Enabling AUTH auth with ${IDENTIFICATION_URL}`)
  app.use(legacyAuth({ url: IDENTIFICATION_URL }))
}
app.use("/location", locationRouter)
app.use("/enabled", enabledRouter)
app.use("/rooms", roomsRouter)

io.on("connection", async (socket: Socket) => {
  console.log("[Websocket] a user connected")

  if (!IDENTIFICATION_URL && !OIDC_JWKS_URI) return
  try {
    const authHeader = socket.handshake.headers?.authorization
    if (!authHeader) throw new Error("unauthorized")
    const token = authHeader?.split(" ")[1]
    if (!token) throw new Error("unauthorized")

    if (OIDC_JWKS_URI) await verifyJwtWithJwks(token)
    else if (IDENTIFICATION_URL) await verifyJwtLegacy(token)

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
