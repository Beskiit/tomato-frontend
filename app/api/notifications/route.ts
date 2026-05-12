import { NextRequest } from "next/server";
import { ok, optionsResponse, parsePagination, toPaginated } from "../../../lib/http";
import { requireAuth } from "../../../lib/middleware";
import { prisma } from "../../../lib/prisma";
import { handleRoute } from "../../../lib/route";
import { serialize } from "../../../lib/serializers";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    const { page, perPage } = parsePagination(request, 20);
    const where = { userId: user.id };
    const [total, data] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        include: { appointment: true },
        orderBy: { sentAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);
    return ok(serialize(toPaginated(data, page, perPage, total)));
  });
}
