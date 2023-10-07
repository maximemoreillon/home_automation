import { getEnabled, setEnabled } from "../state"
import createHttpError from "http-errors"
import { Request, Response } from "express"

export const get_enabled = (req: Request, res: Response) => {
  res.send(getEnabled())
}

export const update_enabled = (req: Request, res: Response) => {
  const { enabled } = req.body
  if (enabled === undefined) throw createHttpError(400, "Enabled not defined")
  setEnabled(!!enabled)
  res.send(getEnabled())
}
