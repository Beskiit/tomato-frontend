import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser(args: {
  fullName: string;
  email: string;
  role: "admin" | "sorter" | "farmer";
  plainPassword: string;
}) {
  const passwordHash = await bcrypt.hash(args.plainPassword, 10);
  return prisma.user.upsert({
    where: { email: args.email },
    update: {
      fullName: args.fullName,
      role: args.role,
      passwordHash,
    },
    create: {
      fullName: args.fullName,
      email: args.email,
      role: args.role,
      passwordHash,
    },
  });
}

async function main() {
  const admin = await upsertUser({
    fullName: "System Admin",
    email: "admin@tomato.local",
    role: "admin",
    plainPassword: "Password123!",
  });

  const sorterUser = await upsertUser({
    fullName: "Default Sorter",
    email: "sorter@tomato.local",
    role: "sorter",
    plainPassword: "Password123!",
  });

  const farmerUser = await upsertUser({
    fullName: "Default Farmer",
    email: "farmer@tomato.local",
    role: "farmer",
    plainPassword: "Password123!",
  });

  const sorter = await prisma.sorter.upsert({
    where: { userId: sorterUser.id },
    update: {
      location: "Main Sorting Facility",
      contactNumber: "09170000002",
      isAvailable: true,
    },
    create: {
      userId: sorterUser.id,
      location: "Main Sorting Facility",
      contactNumber: "09170000002",
      isAvailable: true,
    },
  });

  const farmer = await prisma.farmer.upsert({
    where: { userId: farmerUser.id },
    update: {
      farmName: "Sunrise Tomato Farm",
      contactNumber: "09170000001",
      address: "Barangay Tomato, City",
    },
    create: {
      userId: farmerUser.id,
      farmName: "Sunrise Tomato Farm",
      contactNumber: "09170000001",
      address: "Barangay Tomato, City",
    },
  });

  let appointment = await prisma.appointment.findFirst({
    where: { notes: "Seeded smoke-test appointment" },
  });

  if (!appointment) {
    appointment = await prisma.appointment.create({
      data: {
        farmerId: farmer.id,
        sorterId: sorter.id,
        scheduledDate: new Date(),
        scheduledTime: "09:00",
        status: "confirmed",
        notes: "Seeded smoke-test appointment",
      },
    });
  }

  let session = await prisma.sortingSession.findUnique({
    where: { appointmentId: appointment.id },
  });

  if (!session) {
    session = await prisma.sortingSession.create({
      data: {
        appointmentId: appointment.id,
        startedAt: new Date(),
        endedAt: new Date(),
        ripeCount: 1,
        unripeCount: 1,
        rottenCount: 1,
        raspberryPiId: "pi-seed-001",
        sessionStatus: "completed",
      },
    });
  }

  const existingLogCount = await prisma.sortingLog.count({
    where: { sessionId: session.id },
  });

  if (existingLogCount === 0) {
    await prisma.sortingLog.createMany({
      data: [
        {
          sessionId: session.id,
          tomatoClassification: "ripe",
          imagePath: "/seed/ripe.jpg",
          aiConfidence: 0.97,
        },
        {
          sessionId: session.id,
          tomatoClassification: "unripe",
          imagePath: "/seed/unripe.jpg",
          aiConfidence: 0.88,
        },
        {
          sessionId: session.id,
          tomatoClassification: "rotten",
          imagePath: "/seed/rotten.jpg",
          aiConfidence: 0.93,
        },
      ],
    });
  }

  await prisma.notification.createMany({
    data: [
      {
        userId: farmerUser.id,
        appointmentId: appointment.id,
        message: "Your seeded appointment is confirmed.",
        isRead: false,
      },
      {
        userId: sorterUser.id,
        appointmentId: appointment.id,
        message: "A seeded appointment is assigned to you.",
        isRead: false,
      },
    ],
  });

  await prisma.activityLog.createMany({
    data: [
      {
        userId: admin.id,
        action: "created",
        modelType: "Seed",
        modelId: appointment.id,
        description: "Seed data initialized by db seed script.",
        ipAddress: "127.0.0.1",
      },
      {
        userId: sorterUser.id,
        action: "session_completed",
        modelType: "SortingSession",
        modelId: session.id,
        description: "Seeded sorting session marked as completed.",
        ipAddress: "127.0.0.1",
      },
    ],
  });

  console.log("Seed complete.");
  console.log("Admin: admin@tomato.local / Password123!");
  console.log("Sorter: sorter@tomato.local / Password123!");
  console.log("Farmer: farmer@tomato.local / Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
