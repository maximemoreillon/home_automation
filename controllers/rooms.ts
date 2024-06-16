import { Request, Response } from "express"
import Room from "../models/room"
import { subscribe_to_all } from "../mqtt"
// export const readRooms = (req: Request, res: Response) => {
//   res.send(rooms.map(({ timeout, ...r }) => r))
// }

export const createRoom = async (req: Request, res: Response) => {
  const { name } = req.body
  const newRoom = await Room.create({ name })
  res.send(newRoom)
}

export const readRooms = async (req: Request, res: Response) => {
  const rooms = await Room.find()
  res.send(rooms)
}

export const readRoom = async (req: Request, res: Response) => {
  const { _id } = req.params
  const room = await Room.findById(_id)
  res.send(room)
}

export const updateRoom = async (req: Request, res: Response) => {
  const { _id } = req.params
  const newProperties = req.body
  const updatedRoom = await Room.findByIdAndUpdate(_id, newProperties, {
    new: true,
  })
  res.send(updatedRoom)
  subscribe_to_all()
}

export const deleteRoom = async (req: Request, res: Response) => {
  const { _id } = req.params
  const deletedRoom = await Room.findByIdAndDelete(_id)
  res.send(deletedRoom)
  subscribe_to_all()
}
