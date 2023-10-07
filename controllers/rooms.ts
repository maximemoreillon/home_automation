import { Request, Response } from "express"
import { rooms } from "../rooms"

export const readRooms = (req: Request, res: Response) => {
  res.send(rooms.map(({ timeout, ...r }) => r))
}
