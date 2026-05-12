import { NextRequest } from "next/server";
import { logActivity } from "@/lib/activity";
import { fail, getIpAddress, ok, optionsResponse } from "@/lib/http";
import { requireAuth, requireRole } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { handleRoute } from "@/lib/route";
import { serialize } from "@/lib/serializers";

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    requireRole(user, ["admin", "sorter"]);
    const session = await prisma.sortingSession.findUnique({
      where: { id: Number(params.id) },
      include: { appointment: true },
    });
    if (!session) return fail("Not found.", 404);
    if (user.role === "sorter" && session.appointment.sorterId !== user.sorter?.id) return fail("Forbidden.", 403);
    if (session.sessionStatus !== "in_progress") return fail("Session is not in progress.", 422);

    const [ripe, unripe, rotten] = await Promise.all([
      prisma.sortingLog.count({ where: { sessionId: session.id, tomatoClassification: "ripe" } }),
      prisma.sortingLog.count({ where: { sessionId: session.id, tomatoClassification: "unripe" } }),
      prisma.sortingLog.count({ where: { sessionId: session.id, tomatoClassification: "rotten" } }),
    ]);

    const updated = await prisma.sortingSession.update({
      where: { id: session.id },
      data: {
        endedAt: new Date(),
        sessionStatus: "completed",
        ripeCount: ripe,
        unripeCount: unripe,
        rottenCount: rotten,
      },
      include: { sortingLogs: true },
    });

    await logActivity({
      userId: user.id,
      action: "session_completed",
      modelType: "SortingSession",
      modelId: session.id,
      description: `${user.fullName} completed sorting session #${session.id}.`,
      ipAddress: getIpAddress(request),
    });

    return ok(serialize(updated));
  });
}
