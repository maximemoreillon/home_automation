const { Router } = require("express")
const { get_rooms, get_room } = require("../controllers/rooms.js")

const router = Router()

router.route("/").get(get_rooms)

router.route("/:name").get(get_room)

module.exports = router
