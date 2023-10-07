import { Router } from "express"
import { get_location, update_location } from "../controllers/location"
const router = Router()

router.route("/").get(get_location).put(update_location)

export default router
