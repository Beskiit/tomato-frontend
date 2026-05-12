import { NextRequest } from "next/server";
import { z } from "zod";
import { logActivity } from "../../../../lib/activity";
import { signToken } from "../../../../lib/auth";
import { fail, getIpAddress, ok, optionsResponse } from "../../../../lib/http";
import { hashPassword } from "../../../../lib/password";
import { prisma } from "../../../../lib/prisma";
import { handleRoute } from "../../../../lib/route";
import { serialize } from "../../../../lib/serializers";

const schema = z
  .object({
    full_name: z.string().min(1).max(100),
    email: z.string().email(),
    password: z.string().min(8),
    password_confirmation: z.string().min(8),
    role: z.enum(["farmer", "sorter"]),
    farm_name: z.string().optional(),
    address: z.string().optional(),
    location: z.string().optional(),
    contact_number: z.string().optional(),
  })
  .refine((d) => d.password === d.password_confirmation, {
    message: "Password confirmation does not match.",
    path: ["password_confirmation"],
  });

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail("The given data was invalid.", 422);

    const data = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return fail("The given data was invalid.", 422, { email: ["The email has already been taken."] });

    const user = await prisma.user.create({
      data: {
        fullName: data.full_name,
        email: data.email,
        passwordHash: await hashPassword(data.password),
        role: data.role,
      },
    });

    if (data.role === "farmer") {
      await prisma.farmer.create({
        data: {
          userId: user.id,
          farmName: data.farm_name ?? "",
          contactNumber: data.contact_number,
          address: data.address,
        },
      });
    } else {
      await prisma.sorter.create({
        data: {
          userId: user.id,
          location: data.location ?? "",
          contactNumber: data.contact_number,
          isAvailable: true,
        },
      });
    }

    const userWithRelations = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { farmer: true, sorter: true },
    });

    await logActivity({
      userId: user.id,
      action: "registered",
      modelType: "User",
      modelId: user.id,
      description: `${user.fullName} (${user.role}) created a new account.`,
      ipAddress: getIpAddress(request),
    });

    const token = await signToken({
      sub: String(user.id),
      user_id: user.id,
      role: user.role as "admin" | "sorter" | "farmer",
      email: user.email,
      full_name: user.fullName,
    });

    return ok(serialize({ message: "Account created successfully.", token, user: userWithRelations }), 201);
  });
}
