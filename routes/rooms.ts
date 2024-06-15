import { Router } from "express"
import {
  createRoom,
  deleteRoom,
  readRoom,
  readRooms,
  updateRoom,
} from "../controllers/rooms"

const router = Router()

router.route("/").get(readRooms).post(createRoom)

router.route("/:_id").get(readRoom).patch(updateRoom).delete(deleteRoom)

export default router
