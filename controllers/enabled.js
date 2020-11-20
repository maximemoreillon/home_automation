let status = require('../home_automation.js')
exports.get_enabled = (req, res) => {
  res.send(status.enabled)
}

exports.set_enabled = (req, res) => {
  let new_state = req.body.enabled
  if(!status.enabled) return res.status(400).send(`enabled not set`)
  status.enabled = new_state
  res.send(status.enabled)
  console.log(`Automations enabled: ${status.enabled}`)
}
