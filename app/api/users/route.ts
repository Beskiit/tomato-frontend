import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok, optionsResponse, parsePagination, toPaginated } from "../../../lib/http";
import { requireAuth, requireRole } from "../../../lib/middleware";
import { hashPassword } from "../../../lib/password";
import { prisma } from "../../../lib/prisma";
import { handleRoute } from "../../../lib/route";
import { serialize } from "../../../lib/serializers";

const schema = z.object({
  full_name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["farmer", "sorter", "admin"]),
  farm_name: z.string().optional(),
  address: z.string().optional(),
  location: z.string().optional(),
  contact_number: z.string().optional(),
});

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    requireRole(user, ["admin"]);
    const { page, perPage } = parsePagination(request, 20);
    const role = request.nextUrl.searchParams.get("role");
    const where = role ? { role } : {};
    const [total, data] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: { farmer: true, sorter: true },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);
    return ok(serialize(toPaginated(data, page, perPage, total)));
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    requireRole(user, ["admin"]);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return fail("The given data was invalid.", 422);
    const data = parsed.data;

    const created = await prisma.user.create({
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
          userId: created.id,
          farmName: data.farm_name ?? "",
          contactNumber: data.contact_number,
          address: data.address,
        },
      });
    }
    if (data.role === "sorter") {
      await prisma.sorter.create({
        data: {
          userId: created.id,
          location: data.location ?? "",
          contactNumber: data.contact_number,
          isAvailable: true,
        },
      });
    }

    const loaded = await prisma.user.findUniqueOrThrow({
      where: { id: created.id },
      include: { farmer: true, sorter: true },
    });
    return ok(serialize(loaded), 201);
  });
}
