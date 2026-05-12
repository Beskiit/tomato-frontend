import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

type LogPayload = {
  userId?: number | null;
  action: string;
  modelType?: string | null;
  modelId?: number | null;
  description: string;
  changes?: Prisma.JsonValue | null;
  ipAddress?: string | null;
};

export async function logActivity(payload: LogPayload): Promise<void> {
  await prisma.activityLog.create({
    data: {
      userId: payload.userId ?? null,
      action: payload.action,
      modelType: payload.modelType ?? null,
      modelId: payload.modelId ?? null,
      description: payload.description,
      changes: payload.changes ?? Prisma.JsonNull,
      ipAddress: payload.ipAddress ?? null,
    },
  });
}
