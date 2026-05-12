import { NextRequest } from "next/server";
import { z } from "zod";
import { logActivity } from "../../../lib/activity";
import { fail, getIpAddress, ok, optionsResponse, parsePagination, toPaginated } from "../../../lib/http";
import { requireAuth } from "../../../lib/middleware";
import { prisma } from "../../../lib/prisma";
import { handleRoute } from "../../../lib/route";
import { serialize } from "../../../lib/serializers";

const createSchema = z.object({
  sorter_id: z.number().int(),
  scheduled_date: z.string().min(1),
  scheduled_time: z.string().min(1),
  notes: z.string().optional().nullable(),
});

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    const { page, perPage } = parsePagination(request, 15);
    const status = request.nextUrl.searchParams.get("status");
    const hasSession = request.nextUrl.searchParams.get("has_session") === "true";
    const where: Record<string, unknown> = {};

    if (user.role === "farmer") where.farmerId = user.farmer?.id;
    if (user.role === "sorter") where.sorterId = user.sorter?.id;
    if (status) where.status = status;
    if (hasSession) where.sortingSession = { isNot: null };

    const [total, data] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({
        where,
        include: { farmer: { include: { user: true } }, sorter: { include: { user: true } }, sortingSession: true },
        orderBy: { id: "desc" },
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
    if (user.role !== "farmer") return fail("Only farmers can book appointments.", 403);

    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return fail("The given data was invalid.", 422);

    const appointment = await prisma.appointment.create({
      data: {
        farmerId: user.farmer!.id,
        sorterId: parsed.data.sorter_id,
        scheduledDate: new Date(parsed.data.scheduled_date),
        scheduledTime: parsed.data.scheduled_time,
        status: "pending",
        notes: parsed.data.notes ?? null,
      },
      include: { farmer: { include: { user: true } }, sorter: { include: { user: true } } },
    });

    await prisma.notification.create({
      data: {
        userId: appointment.sorter.userId,
        appointmentId: appointment.id,
        message: `New appointment booked by ${user.fullName} on ${parsed.data.scheduled_date} at ${parsed.data.scheduled_time}.`,
        isRead: false,
      },
    });

    await logActivity({
      userId: user.id,
      action: "created",
      modelType: "Appointment",
      modelId: appointment.id,
      description: `${user.fullName} booked appointment #${appointment.id} on ${parsed.data.scheduled_date} at ${parsed.data.scheduled_time}.`,
      ipAddress: getIpAddress(request),
    });

    return ok(serialize(appointment), 201);
  });
}
