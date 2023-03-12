const { Router } = require("express")
const { get_enabled, update_enabled } = require("../controllers/enabled.js")
const router = Router()

router.route("/").get(get_enabled).put(update_enabled)

module.exports = router
