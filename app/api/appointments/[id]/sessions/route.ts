import { NextRequest } from "next/server";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { fail, getIpAddress, ok, optionsResponse } from "@/lib/http";
import { requireAuth, requireRole } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { handleRoute } from "@/lib/route";
import { serialize } from "@/lib/serializers";

const schema = z.object({
  raspberry_pi_id: z.string().min(1).max(50),
});

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    requireRole(user, ["admin", "sorter"]);
    const appointment = await prisma.appointment.findUnique({ where: { id: Number(params.id) } });
    if (!appointment) return fail("Not found.", 404);
    if (user.role === "sorter" && appointment.sorterId !== user.sorter?.id) return fail("Forbidden.", 403);
    if (appointment.status !== "confirmed") {
      return fail("Appointment must be confirmed before starting a session.", 422);
    }

    const existing = await prisma.sortingSession.findUnique({ where: { appointmentId: appointment.id } });
    if (existing) return fail("A session already exists for this appointment.", 422);

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return fail("The given data was invalid.", 422);

    await prisma.sortingSession.updateMany({
      where: { raspberryPiId: parsed.data.raspberry_pi_id, sessionStatus: "in_progress" },
      data: { sessionStatus: "completed" },
    });

    const session = await prisma.sortingSession.create({
      data: {
        appointmentId: appointment.id,
        startedAt: new Date(),
        ripeCount: 0,
        unripeCount: 0,
        rottenCount: 0,
        raspberryPiId: parsed.data.raspberry_pi_id,
        sessionStatus: "in_progress",
      },
    });

    await prisma.appointment.update({ where: { id: appointment.id }, data: { status: "completed" } });
    await logActivity({
      userId: user.id,
      action: "session_started",
      modelType: "SortingSession",
      modelId: session.id,
      description: `${user.fullName} started sorting session #${session.id}.`,
      ipAddress: getIpAddress(request),
    });

    return ok(serialize(session), 201);
  });
}
