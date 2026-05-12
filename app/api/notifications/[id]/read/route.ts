import { NextRequest } from "next/server";
import { fail, ok, optionsResponse } from "@/lib/http";
import { requireAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { handleRoute } from "@/lib/route";
import { serialize } from "@/lib/serializers";

export async function OPTIONS() {
  return optionsResponse();
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    const notification = await prisma.notification.findUnique({ where: { id: Number(params.id) } });
    if (!notification) return fail("Not found.", 404);
    if (notification.userId !== user.id) return fail("Forbidden.", 403);
    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true },
    });
    return ok(serialize(updated));
  });
}
