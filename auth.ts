import createJwksClient, { JwksClient } from "jwks-rsa"
import jwt from "jsonwebtoken"
import axios from "axios"
import { NextFunction, Request, Response } from "express"
import { Socket } from "socket.io"

export const { IDENTIFICATION_URL, OIDC_JWKS_URI } = process.env

let jwksClient: JwksClient

if (OIDC_JWKS_URI)
  jwksClient = createJwksClient({
    jwksUri: OIDC_JWKS_URI,
    cache: true,
    rateLimit: true,
  })

async function verifyJwtWithJwks(token: string) {
  const decoded = jwt.decode(token, { complete: true })
  if (!decoded) throw new Error(`Decoded token is null`)

  const kid = decoded.header?.kid
  if (!kid) throw new Error("Missing token kid")

  const key = await jwksClient.getSigningKey(kid)

  return jwt.verify(token, key.getPublicKey())
}

async function verifyJwtLegacy(token: string) {
  if (!IDENTIFICATION_URL) return
  const headers = { authorization: `Bearer ${token}` }
  await axios.get(IDENTIFICATION_URL, { headers })
}

function extractJwt({ headers, query }: Request) {
  return (
    headers.authorization?.split(" ")[1] ??
    headers.authorization ??
    (query.jwt as string) ??
    (query.token as string)
  )
}

export async function wsAuth(socket: Socket) {
  const authHeader = socket.handshake.headers?.authorization
  if (!authHeader) throw new Error("unauthorized")
  const token = authHeader?.split(" ")[1]
  if (!token) throw new Error("unauthorized")

  if (OIDC_JWKS_URI) await verifyJwtWithJwks(token)
  else if (IDENTIFICATION_URL) await verifyJwtLegacy(token)

  console.log("[Websocket] Socket authenticated")
  socket.join("authenticated")
}

export async function expressAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = extractJwt(req)
    if (!token) throw new Error("Missing token")

    if (OIDC_JWKS_URI) await verifyJwtWithJwks(token)
    else if (IDENTIFICATION_URL) await verifyJwtLegacy(token)

    next()
  } catch (error: any) {
    console.error(error)
    return res.status(401).send(error.toString())
  }
}
