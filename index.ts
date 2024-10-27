import dotenv from "dotenv"
dotenv.config()

import { http_server } from "./server"

const { EXPRESS_PORT = 80 } = process.env

http_server.listen(EXPRESS_PORT, () => {
  console.log(`[Express] Listening on port ${EXPRESS_PORT}`)
})
