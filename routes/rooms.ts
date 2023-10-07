import { Router } from "express"
import { readRooms } from "../controllers/rooms"

const router = Router()

router.route("/").get(readRooms)

export default router
