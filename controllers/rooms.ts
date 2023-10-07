import { Request, Response } from "express"
import fs from "fs"
import YAML from "yaml"

export const readRooms = (req: Request, res: Response) => {
  const file = fs.readFileSync("./config/rooms.yml", "utf8")
  res.send(YAML.parse(file))
}
