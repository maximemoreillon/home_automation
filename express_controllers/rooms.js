
let rooms =require('../config/rooms.js')
let io = require('../home_automation.js').io

exports.get_rooms = (req, res) => {
 res.send(rooms)
}

exports.get_room = (req, res) => {
  const name = req.params.name
  if(!name) return res.status(400).send('name not defined')

  let found_room = rooms.find(room => {return room.name === name})
  if(!found_room) return res.status(400).send(`Room ${name} not found`)

  res.send(found_room)
}
