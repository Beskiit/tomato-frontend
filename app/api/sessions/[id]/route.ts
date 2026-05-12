import { NextRequest } from "next/server";
import { fail, ok, optionsResponse } from "@/lib/http";
import { requireAuth, requireRole } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { handleRoute } from "@/lib/route";
import { serialize } from "@/lib/serializers";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    requireRole(user, ["admin", "sorter", "farmer"]);
    const session = await prisma.sortingSession.findUnique({
      where: { id: Number(params.id) },
      include: {
        sortingLogs: true,
        appointment: { include: { farmer: { include: { user: true } }, sorter: { include: { user: true } } } },
      },
    });
    if (!session) return fail("Not found.", 404);

    if (user.role === "sorter" && session.appointment.sorterId !== user.sorter?.id) return fail("Forbidden.", 403);
    if (user.role === "farmer" && session.appointment.farmerId !== user.farmer?.id) return fail("Forbidden.", 403);
    return ok(serialize(session));
  });
}
