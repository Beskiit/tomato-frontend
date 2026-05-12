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
    const user = await requireAuth(request);
    const role = user.role;

    if (role === "admin") {
      const [
        totalAppointments,
        pendingAppointments,
        confirmedAppointments,
        completedAppointments,
        totalUsers,
        totalFarmers,
        totalSorters,
        recentAppointments,
      ] = await Promise.all([
        prisma.appointment.count(),
        prisma.appointment.count({ where: { status: "pending" } }),
        prisma.appointment.count({ where: { status: "confirmed" } }),
        prisma.appointment.count({ where: { status: "completed" } }),
        prisma.user.count({ where: { role: { not: "admin" } } }),
        prisma.user.count({ where: { role: "farmer" } }),
        prisma.user.count({ where: { role: "sorter" } }),
        prisma.appointment.findMany({
          orderBy: { id: "desc" },
          take: 5,
          include: { farmer: { include: { user: true } }, sorter: { include: { user: true } } },
        }),
      ]);

      return ok(
        serialize({
          total_appointments: totalAppointments,
          pending_appointments: pendingAppointments,
          confirmed_appointments: confirmedAppointments,
          completed_appointments: completedAppointments,
          total_users: totalUsers,
          total_farmers: totalFarmers,
          total_sorters: totalSorters,
          recent_appointments: recentAppointments,
        })
      );
    }

    const targetField = role === "farmer" ? { farmerId: user.farmer?.id } : { sorterId: user.sorter?.id };
    const where = targetField.farmerId ? { farmerId: targetField.farmerId } : { sorterId: targetField.sorterId };
    const [total, pending, confirmed, completed, recent] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.count({ where: { ...where, status: "pending" } }),
      prisma.appointment.count({ where: { ...where, status: "confirmed" } }),
      prisma.appointment.count({ where: { ...where, status: "completed" } }),
      prisma.appointment.findMany({
        where,
        orderBy: { id: "desc" },
        take: 5,
        include:
          role === "farmer"
            ? { sorter: { include: { user: true } }, sortingSession: true }
            : { farmer: { include: { user: true } }, sortingSession: true },
      }),
    ]);

    return ok(
      serialize({
        total_appointments: total,
        pending_appointments: pending,
        confirmed_appointments: confirmed,
        completed_appointments: completed,
        recent_appointments: recent,
      })
    );
  });
}
