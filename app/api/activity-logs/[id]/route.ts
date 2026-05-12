import { NextRequest } from "next/server";
import { fail, ok, optionsResponse } from "@/lib/http";
import { requireAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { handleRoute } from "@/lib/route";
import { serialize } from "@/lib/serializers";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    const activityLog = await prisma.activityLog.findUnique({
      where: { id: Number(params.id) },
      include: { user: true },
    });
    if (!activityLog) return fail("Not found.", 404);
    if (user.role !== "admin" && activityLog.userId !== user.id) return fail("Access denied.", 403);
    return ok(serialize(activityLog));
  });
}
