import { NextRequest } from "next/server";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { fail, getIpAddress, ok, optionsResponse } from "@/lib/http";
import { requireAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { handleRoute } from "@/lib/route";
import { serialize } from "@/lib/serializers";

const updateSchema = z.object({
  scheduled_date: z.string().optional(),
  scheduled_time: z.string().optional(),
  notes: z.string().nullable().optional(),
});

async function appointmentWithRelations(id: number) {
  return prisma.appointment.findUnique({
    where: { id },
    include: {
      farmer: { include: { user: true } },
      sorter: { include: { user: true } },
      sortingSession: { include: { sortingLogs: true } },
    },
  });
}

function canAccess(user: Awaited<ReturnType<typeof requireAuth>>, appt: NonNullable<Awaited<ReturnType<typeof appointmentWithRelations>>>) {
  if (user.role === "admin") return true;
  if (user.role === "farmer") return appt.farmerId === user.farmer?.id;
  return appt.sorterId === user.sorter?.id;
}

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    const appointment = await appointmentWithRelations(Number(params.id));
    if (!appointment) return fail("Not found.", 404);
    if (!canAccess(user, appointment)) return fail("Forbidden.", 403);
    return ok(serialize(appointment));
  });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    const appointment = await appointmentWithRelations(Number(params.id));
    if (!appointment) return fail("Not found.", 404);
    if (!canAccess(user, appointment)) return fail("Forbidden.", 403);
    if (appointment.status !== "pending") return fail("Only pending appointments can be edited.", 422);

    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return fail("The given data was invalid.", 422);

    const before = {
      scheduled_date: appointment.scheduledDate.toISOString(),
      scheduled_time: appointment.scheduledTime,
      notes: appointment.notes,
    };

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        scheduledDate: parsed.data.scheduled_date ? new Date(parsed.data.scheduled_date) : undefined,
        scheduledTime: parsed.data.scheduled_time,
        notes: parsed.data.notes,
      },
      include: { farmer: { include: { user: true } }, sorter: { include: { user: true } } },
    });

    await logActivity({
      userId: user.id,
      action: "updated",
      modelType: "Appointment",
      modelId: appointment.id,
      description: `${user.fullName} updated appointment #${appointment.id}.`,
      changes: { before, after: parsed.data },
      ipAddress: getIpAddress(request),
    });

    return ok(serialize(updated));
  });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    const appointment = await appointmentWithRelations(Number(params.id));
    if (!appointment) return fail("Not found.", 404);
    if (!canAccess(user, appointment)) return fail("Forbidden.", 403);
    if (appointment.status === "completed") return fail("Completed appointments cannot be deleted.", 422);

    await prisma.appointment.delete({ where: { id: appointment.id } });
    await logActivity({
      userId: user.id,
      action: "deleted",
      modelType: "Appointment",
      modelId: appointment.id,
      description: `${user.fullName} cancelled appointment #${appointment.id} scheduled on ${appointment.scheduledDate.toISOString().slice(0, 10)}.`,
      ipAddress: getIpAddress(request),
    });
    return ok({ message: "Appointment cancelled." });
  });
}
