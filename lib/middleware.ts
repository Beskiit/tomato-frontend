import { User } from "@prisma/client";
import { NextRequest } from "next/server";
import { verifyToken } from "./auth";
import { prisma } from "./prisma";

export type Role = "admin" | "sorter" | "farmer";

export type AuthedUser = User & {
  farmer: { id: number; userId: number } | null;
  sorter: { id: number; userId: number } | null;
};

export async function requireAuth(request: NextRequest): Promise<AuthedUser> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("UNAUTHORIZED");
  }

  const token = authorization.slice(7);
  const payload = await verifyToken(token);
  const user = await prisma.user.findUnique({
    where: { id: payload.user_id },
    include: { farmer: true, sorter: true },
  });

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  return user;
}

export function requireRole(user: AuthedUser, roles: Role[]): void {
  if (!roles.includes(user.role as Role)) {
    throw new Error("FORBIDDEN");
  }
}
