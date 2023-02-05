var state = require("../state.js")

exports.get_enabled = (req, res) => {
  res.send(state.enabled)
}

exports.set_enabled = (req, res) => {
  // TODO: use http-errors
  if (!("enabled" in req.body))
    return res.status(400).send(`enabled not defined`)
  state.enabled = !!req.body.enabled

  console.log(`[HTTP] Automations enabled: ${state.enabled}`)
  res.send(state.enabled)
}
