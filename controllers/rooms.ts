import { Request, Response } from "express"
import Room from "../models/room"

// export const readRooms = (req: Request, res: Response) => {
//   res.send(rooms.map(({ timeout, ...r }) => r))
// }

export const createRoom = async (req: Request, res: Response) => {
  const { name } = req.body
  const newRoom = await Room.create({ name })
  return newRoom
}

export const readRooms = async (req: Request, res: Response) => {
  const { _id } = req.params
  const room = await Room.findById(_id)
  return room
}

export const readRoom = async (req: Request, res: Response) => {
  const { _id } = req.params
  const room = await Room.findById(_id)
  return room
}

export const updateRoom = async (req: Request, res: Response) => {
  const { _id } = req.params
  const newProperties = req.body
  const updatedRoom = await Room.findByIdAndUpdate(_id, newProperties)
  return updatedRoom
}

export const deleteRoom = async (req: Request, res: Response) => {
  const { _id } = req.params
  const deletedRoom = await Room.findByIdAndDelete(_id)
  return deletedRoom
}
