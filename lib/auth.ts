import { jwtVerify, SignJWT } from "jose";

type Role = "admin" | "sorter" | "farmer";

export type JwtPayload = {
  sub: string;
  user_id: number;
  role: Role;
  email: string;
  full_name: string;
};

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is missing");
  }
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.user_id))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secretKey());
  return payload as unknown as JwtPayload;
}
