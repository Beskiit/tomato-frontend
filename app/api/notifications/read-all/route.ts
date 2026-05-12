import { NextRequest } from "next/server";
import { ok, optionsResponse } from "@/lib/http";
import { requireAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { handleRoute } from "@/lib/route";

export async function OPTIONS() {
  return optionsResponse();
}

export async function PATCH(request: NextRequest) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
    return ok({ message: "All notifications marked as read." });
  });
}
