const { Router } = require("express")
const { get_location, update_location } = require("../controllers/location.js")
const router = Router()

router.route("/").get(get_location).put(update_location)

module.exports = router
