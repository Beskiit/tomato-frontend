import { NextRequest } from "next/server";
import { ok, optionsResponse } from "@/lib/http";
import { requireAuth, requireRole } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { handleRoute } from "@/lib/route";
import { serialize } from "@/lib/serializers";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest, { params }: { params: { piId: string } }) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    requireRole(user, ["admin", "sorter"]);

    const session = await prisma.sortingSession.findFirst({
      where: {
        raspberryPiId: params.piId,
        sessionStatus: "in_progress",
        ...(user.role === "sorter" && user.sorter
          ? { appointment: { sorterId: user.sorter.id } }
          : {}),
      },
      orderBy: { startedAt: "desc" },
    });

    return ok(session ? serialize(session) : null);
  });
}
