import createJwksClient, { JwksClient } from "jwks-rsa"
import jwt from "jsonwebtoken"
import axios from "axios"

export const { IDENTIFICATION_URL, OIDC_JWKS_URI } = process.env

let jwksClient: JwksClient

if (OIDC_JWKS_URI)
  jwksClient = createJwksClient({
    jwksUri: OIDC_JWKS_URI,
    cache: true,
    rateLimit: true,
  })

export const verifyJwtWithJwks = async (token: string) => {
  const decoded = jwt.decode(token, { complete: true })
  if (!decoded) throw new Error(`Decoded token is null`)

  const kid = decoded.header?.kid
  if (!kid) throw new Error("Missing token kid")

  const key = await jwksClient.getSigningKey(kid)

  return jwt.verify(token, key.getPublicKey())
}

export const verifyJwtLegacy = async (token: string) => {
  if (!IDENTIFICATION_URL) return
  const headers = { authorization: `Bearer ${token}` }
  await axios.get(IDENTIFICATION_URL, { headers })
}
