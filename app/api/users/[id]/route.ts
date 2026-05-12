import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok, optionsResponse } from "@/lib/http";
import { requireAuth, requireRole } from "@/lib/middleware";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { handleRoute } from "@/lib/route";
import { serialize } from "@/lib/serializers";

const updateSchema = z.object({
  full_name: z.string().max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
});

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    requireRole(user, ["admin"]);
    const target = await prisma.user.findUnique({
      where: { id: Number(params.id) },
      include: { farmer: true, sorter: true },
    });
    if (!target) return fail("Not found.", 404);
    return ok(serialize(target));
  });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    requireRole(user, ["admin"]);
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return fail("The given data was invalid.", 422);
    const updated = await prisma.user.update({
      where: { id: Number(params.id) },
      data: {
        fullName: parsed.data.full_name,
        email: parsed.data.email,
        passwordHash: parsed.data.password ? await hashPassword(parsed.data.password) : undefined,
      },
      include: { farmer: true, sorter: true },
    });
    return ok(serialize(updated));
  });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    requireRole(user, ["admin"]);
    await prisma.user.delete({ where: { id: Number(params.id) } });
    return ok({ message: "User deleted." });
  });
}
