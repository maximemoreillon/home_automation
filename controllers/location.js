const state = require("../state.js")
const main = require("../index.js")

// Express controllers
exports.get_location = (req, res) => {
  res.send(state.location)
}

exports.update_location = (req, res) => {
  // RestFul API to update location

  let new_location = req.body.location
  if (!new_location) return res.status(400).send("location not defined")

  main.update_location(new_location)
  res.send(state.location)
}