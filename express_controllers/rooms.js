
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

exports.set_room_occupants = (req, res) => {


  const name = req.params.name
  if(!name) return res.status(400).send('name not defined')

  if(!'occupants' in req.body) return res.status(400).send('occupants not defined')
  /*
  //res.send('OK')

  let found_room = rooms.find(room => {return room.name === name})
  if(!found_room) return res.status(400).send(`Room ${name} not found`)
  found_room.occupants = req.body.occupants

  */
  res.send('OK')


  io.emit('occupancy', {name: name, occupants: req.body.occupants})


}
