import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { Role, type Role as RoleValue } from "@generated/prisma/enums";

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must contain at least 32 characters");
}

const secret = new TextEncoder().encode(jwtSecret);

export interface SessionPayload extends JWTPayload {
  sub: string;
  role: RoleValue;
  tokenUse: "access";
}

export const ACCESS_TOKEN_TTL_SECONDS = 10 * 60;

export async function signAccessToken(
  payload: Pick<SessionPayload, "sub" | "role">,
): Promise<string> {
  return new SignJWT({ ...payload, tokenUse: "access" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret);
}

export async function verifyAccessToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, secret, {
      algorithms: ["HS256"],
    });

    const validRoles = Object.values(Role);
    
    if (
      typeof payload.sub !== "string" ||
      !validRoles.includes(payload.role as Role) ||
      payload.tokenUse !== "access"
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export const verifyToken = verifyAccessToken;