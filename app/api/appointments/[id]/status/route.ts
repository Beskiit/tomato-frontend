import { NextRequest } from "next/server";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { fail, getIpAddress, ok, optionsResponse } from "@/lib/http";
import { requireAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { handleRoute } from "@/lib/route";
import { serialize } from "@/lib/serializers";

const schema = z.object({
  status: z.enum(["confirmed", "cancelled", "completed"]),
});

export async function OPTIONS() {
  return optionsResponse();
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    if (user.role === "farmer") return fail("Farmers cannot change appointment status.", 403);
    const appointment = await prisma.appointment.findUnique({
      where: { id: Number(params.id) },
      include: { farmer: { include: { user: true } }, sorter: { include: { user: true } } },
    });
    if (!appointment) return fail("Not found.", 404);
    if (user.role === "sorter" && appointment.sorterId !== user.sorter?.id) return fail("Forbidden.", 403);

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return fail("The given data was invalid.", 422);

    const oldStatus = appointment.status;
    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: parsed.data.status },
      include: { farmer: { include: { user: true } }, sorter: { include: { user: true } } },
    });

    await prisma.notification.create({
      data: {
        userId: appointment.farmer.userId,
        appointmentId: appointment.id,
        message: `Your appointment on ${updated.scheduledDate.toISOString().slice(0, 10)} has been ${parsed.data.status}.`,
        isRead: false,
      },
    });

    await logActivity({
      userId: user.id,
      action: "status_changed",
      modelType: "Appointment",
      modelId: appointment.id,
      description: `${user.fullName} changed appointment #${appointment.id} status from ${oldStatus} to ${parsed.data.status}.`,
      changes: { before: { status: oldStatus }, after: { status: parsed.data.status } },
      ipAddress: getIpAddress(request),
    });
    return ok(serialize(updated));
  });
}
