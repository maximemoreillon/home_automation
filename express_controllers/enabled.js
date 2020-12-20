var state = require('../state.js')

exports.get_enabled = (req, res) => {
  res.send(state.enabled)
}

exports.set_enabled = (req, res) => {



  if(!('enabled' in req.body)) return res.status(400).send(`enabled not defined`)
  state.enabled = !!req.body.enabled

  res.send(state.enabled)
  console.log(`Automations enabled: ${state.enabled}`)
}
