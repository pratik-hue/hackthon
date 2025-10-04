import bcrypt from "bcryptjs"
import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-me")
const COOKIE_NAME = "expman_jwt"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export type JwtPayload = {
  sub: string // user id
  cid: string // company id
  role: "ADMIN" | "MANAGER" | "EMPLOYEE"
  name: string
  email: string
}

export async function signSession(payload: JwtPayload) {
  const token = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    // Use a relative duration; jose supports strings like "7d" or seconds with "s"
    .setExpirationTime(`${COOKIE_MAX_AGE}s`)
    .sign(JWT_SECRET)
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  })
  return token
}

export async function readSession(): Promise<JwtPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JwtPayload
  } catch {
    return null
  }
}

export function clearSession() {
  cookies().set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 })
}
