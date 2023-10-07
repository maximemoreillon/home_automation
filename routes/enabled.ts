import { Router } from "express"
import { get_enabled, update_enabled } from "../controllers/enabled"
const router = Router()

router.route("/").get(get_enabled).put(update_enabled)

export default router
