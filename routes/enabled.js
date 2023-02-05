const { Router } = require("express")
const { get_enabled, set_enabled } = require("../controllers/enabled.js")
const router = Router()

router.route("/").get(get_enabled).put(set_enabled)

module.exports = router
