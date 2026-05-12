import { NextRequest } from "next/server";
import { ok, optionsResponse } from "../../../lib/http";
import { requireAuth } from "../../../lib/middleware";
import { prisma } from "../../../lib/prisma";
import { handleRoute } from "../../../lib/route";
import { serialize } from "../../../lib/serializers";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requireAuth(request);
    const sorters = await prisma.sorter.findMany({
      where: { isAvailable: true },
      include: { user: true },
    });
    return ok(serialize(sorters));
  });
}
