import { NextRequest } from "next/server";
import { ok, optionsResponse } from "../../../../lib/http";
import { requireAuth } from "../../../../lib/middleware";
import { handleRoute } from "../../../../lib/route";
import { serialize } from "../../../../lib/serializers";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    return ok(serialize(user));
  });
}
