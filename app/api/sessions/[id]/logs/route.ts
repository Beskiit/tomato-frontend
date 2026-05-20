import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok, optionsResponse, parsePagination, toPaginated } from "@/lib/http";
import { requireAuth, requireRole } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { handleRoute } from "@/lib/route";
import { serialize } from "@/lib/serializers";

const schema = z.object({
  tomato_classification: z.enum(["ripe", "unripe", "rotten"]),
  image_path: z.string().max(255).optional().nullable(),
  ai_confidence: z.number().min(0).max(1).optional().nullable(),
});

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    requireRole(user, ["admin", "sorter", "farmer"]);
    const session = await prisma.sortingSession.findUnique({
      where: { id: Number(params.id) },
      include: { appointment: true },
    });
    if (!session) return fail("Not found.", 404);
    if (user.role === "sorter" && session.appointment.sorterId !== user.sorter?.id) return fail("Forbidden.", 403);
    if (user.role === "farmer" && session.appointment.farmerId !== user.farmer?.id) return fail("Forbidden.", 403);

    const { page, perPage } = parsePagination(request, 50);
    const [total, data] = await Promise.all([
      prisma.sortingLog.count({ where: { sessionId: session.id } }),
      prisma.sortingLog.findMany({
        where: { sessionId: session.id },
        orderBy: { loggedAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);
    return ok(serialize(toPaginated(data, page, perPage, total)));
  });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    requireRole(user, ["admin", "sorter"]);

    const session = await prisma.sortingSession.findUnique({
      where: { id: Number(params.id) },
      include: { appointment: true },
    });
    if (!session) return fail("Not found.", 404);
    if (user.role === "sorter" && session.appointment.sorterId !== user.sorter?.id) return fail("Forbidden.", 403);
    if (session.sessionStatus !== "in_progress") return fail("Cannot log to a completed or failed session.", 422);

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return fail("The given data was invalid.", 422);

    const log = await prisma.sortingLog.create({
      data: {
        sessionId: session.id,
        loggedAt: new Date(),
        tomatoClassification: parsed.data.tomato_classification,
        imagePath: parsed.data.image_path ?? null,
        aiConfidence: parsed.data.ai_confidence?.toString(),
      },
    });

    const countField =
      parsed.data.tomato_classification === "ripe"
        ? "ripeCount"
        : parsed.data.tomato_classification === "unripe"
          ? "unripeCount"
          : "rottenCount";

    await prisma.sortingSession.update({
      where: { id: session.id },
      data: { [countField]: { increment: 1 } },
    });
    return ok(serialize(log), 201);
  });
}
