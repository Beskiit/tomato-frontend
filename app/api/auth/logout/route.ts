import { NextRequest } from "next/server";
import { logActivity } from "../../../../lib/activity";
import { getIpAddress, ok, optionsResponse } from "../../../../lib/http";
import { requireAuth } from "../../../../lib/middleware";
import { handleRoute } from "../../../../lib/route";

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    await logActivity({
      userId: user.id,
      action: "logged_out",
      modelType: "User",
      modelId: user.id,
      description: `${user.fullName} (${user.role}) logged out.`,
      ipAddress: getIpAddress(request),
    });
    return ok({ message: "Logged out successfully." });
  });
}
