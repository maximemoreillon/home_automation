import { getLocation, updateLocation } from "../userLocation"
import { Request, Response } from "express"

export const get_location = (req: Request, res: Response) => {
  res.send(getLocation())
}

export const update_location = (req: Request, res: Response) => {
  const { location } = req.body
  if (!location) return res.status(400).send("location not defined")

  updateLocation(location)
  res.send(getLocation())
}
