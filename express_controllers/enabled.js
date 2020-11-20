var state = require('../state.js')

exports.get_enabled = (req, res) => {
  res.send(status.enabled)
}

exports.set_enabled = (req, res) => {
  let new_state = req.body.enabled
  if(!state.enabled) return res.status(400).send(`enabled not set`)
  state.enabled = new_state
  res.send(status.enabled)
  console.log(`Automations enabled: ${state.enabled}`)
}
