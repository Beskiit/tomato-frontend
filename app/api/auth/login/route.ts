import { NextRequest } from "next/server";
import { z } from "zod";
import { signToken } from "../../../../lib/auth";
import { logActivity } from "../../../../lib/activity";
import { fail, getIpAddress, ok, optionsResponse } from "../../../../lib/http";
import { prisma } from "../../../../lib/prisma";
import { handleRoute } from "../../../../lib/route";
import { serialize } from "../../../../lib/serializers";
import { verifyPassword } from "../../../../lib/password";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return fail("The given data was invalid.", 422, { email: ["The provided credentials are incorrect."] });
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      include: { farmer: true, sorter: true },
    });

    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      await logActivity({
        action: "login_failed",
        description: `Failed login attempt for email: ${parsed.data.email}.`,
        ipAddress: getIpAddress(request),
      });
      return fail("The given data was invalid.", 422, { email: ["The provided credentials are incorrect."] });
    }

    const token = await signToken({
      sub: String(user.id),
      user_id: user.id,
      role: user.role as "admin" | "sorter" | "farmer",
      email: user.email,
      full_name: user.fullName,
    });

    await logActivity({
      userId: user.id,
      action: "logged_in",
      modelType: "User",
      modelId: user.id,
      description: `${user.fullName} (${user.role}) logged in.`,
      ipAddress: getIpAddress(request),
    });

    return ok(serialize({ token, user }));
  });
}
