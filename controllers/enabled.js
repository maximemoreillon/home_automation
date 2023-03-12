const state = require("../state.js")
const createHttpError = require("http-errors")
exports.get_enabled = (req, res) => {
  res.send(state.enabled)
}

const set_enabled = (enabled) => {
  state.enabled = enabled
  if (enabled) console.log("[Enabled] Turning automations ON")
  else console.log("[Enabled] Turning automations Off")
  const { io } = require("../")
  io.emit("enabled", enabled)
}

exports.update_enabled = (req, res) => {
  // TODO: use http-errors
  if (!("enabled" in req.body))
    throw createHttpError(400, "Enabled not defined")
  set_enabled(!!req.body.enabled)

  res.send(state.enabled)
}

exports.set_enabled = set_enabled
