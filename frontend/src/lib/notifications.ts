import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type NotificationInput = {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
  sourceKey?: string | null;
};

export const ADMIN_ONLY_NOTIFICATION_TYPES = ["SYSTEM_ERROR"] as const;

export function isAdminOnlyNotificationType(type: string) {
  return ADMIN_ONLY_NOTIFICATION_TYPES.includes(type as (typeof ADMIN_ONLY_NOTIFICATION_TYPES)[number]);
}

export function notificationVisibility(role: Role) {
  return role === "ADMIN" ? {} : { type: { notIn: [...ADMIN_ONLY_NOTIFICATION_TYPES] } };
}

export async function createNotification(input: NotificationInput) {
  if (isAdminOnlyNotificationType(input.type)) {
    const recipient = await prisma.user.findUnique({ where: { id: input.userId }, select: { role: true } });
    if (recipient?.role !== "ADMIN") return null;
  }
  if (input.sourceKey) {
    return prisma.notification.upsert({
      where: { userId_sourceKey: { userId: input.userId, sourceKey: input.sourceKey } },
      update: { title: input.title, body: input.body, href: input.href, type: input.type },
      create: input,
    });
  }
  return prisma.notification.create({ data: input });
}

export async function notifyAdmins(input: Omit<NotificationInput, "userId">) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", active: true, crmEnabled: true },
    select: { id: true },
  });
  if (!admins.length) return;
  await prisma.notification.createMany({
    data: admins.map(({ id }) => ({ ...input, userId: id })),
    skipDuplicates: true,
  });
}

export async function syncActionableNotifications(user: { id: string; role: Role }) {
  const now = new Date();
  const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const leadScope = user.role === "ADMIN" ? {} : { userId: user.id };

  const [tasks, contracts, errors] = await Promise.all([
    prisma.task.findMany({
      where: { done: false, dueAt: { lte: nextDay }, lead: leadScope },
      select: { id: true, title: true, dueAt: true, lead: { select: { id: true, name: true } } },
      orderBy: { dueAt: "asc" },
      take: 40,
    }),
    prisma.lead.findMany({
      where: { ...leadScope, contractEndDate: { gte: now, lte: nextMonth }, stage: { not: "PERDIDO" } },
      select: { id: true, name: true, contractEndDate: true },
      orderBy: { contractEndDate: "asc" },
      take: 40,
    }),
    user.role === "ADMIN"
      ? prisma.errorLog.findMany({ where: { resolved: false }, select: { id: true, source: true, message: true }, orderBy: { createdAt: "desc" }, take: 20 })
      : Promise.resolve([]),
  ]);

  const records: NotificationInput[] = [
    ...tasks.map((task) => ({
      userId: user.id,
      type: task.dueAt < now ? "TASK_OVERDUE" : "TASK_DUE",
      title: task.dueAt < now ? "Tarefa vencida" : "Tarefa próxima do prazo",
      body: `${task.title} - ${task.lead.name}`,
      href: `/leads/${task.lead.id}`,
      sourceKey: `task:${task.id}:${task.dueAt.toISOString()}`,
    })),
    ...contracts.map((lead) => ({
      userId: user.id,
      type: "CONTRACT_EXPIRING",
      title: "Contrato próximo do vencimento",
      body: lead.name,
      href: `/leads/${lead.id}`,
      sourceKey: `contract:${lead.id}:${lead.contractEndDate?.toISOString()}`,
    })),
    ...errors.map((error) => ({
      userId: user.id,
      type: "SYSTEM_ERROR",
      title: `Falha em ${error.source}`,
      body: error.message,
      href: "/admin/logs",
      sourceKey: `error:${error.id}`,
    })),
  ];

  if (records.length) await prisma.notification.createMany({ data: records, skipDuplicates: true });
}
