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
    const q = request.nextUrl.searchParams;
    const where: Record<string, unknown> = {};

    if (user.role !== "admin") {
      where.userId = user.id;
      where.action = { notIn: ["login_failed"] };
    } else {
      if (q.get("user_id")) where.userId = Number(q.get("user_id"));
      if (q.get("model")) where.modelType = q.get("model");
      if (q.get("from") || q.get("to")) {
        where.performedAt = {
          ...(q.get("from") ? { gte: new Date(String(q.get("from"))) } : {}),
          ...(q.get("to") ? { lte: new Date(String(q.get("to"))) } : {}),
        };
      }
    }

    if (q.get("action")) where.action = q.get("action");
    if (q.get("search")) where.description = { contains: q.get("search"), mode: "insensitive" };

    const [total, data] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        include: { user: true },
        orderBy: { performedAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);
    return ok(serialize(toPaginated(data, page, perPage, total)));
  });
}
