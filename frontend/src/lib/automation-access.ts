import { Role, type AutomationRule } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AutomationActor = { id: string; role: Role };

export function resolveAutomationActive(globalActive: boolean, preference?: boolean | null) {
  return preference ?? globalActive;
}

export async function listAutomationsForActor(actor: AutomationActor) {
  const [rules, preferences] = await Promise.all([
    prisma.automationRule.findMany({ orderBy: { createdAt: "asc" } }),
    actor.role === Role.ADMIN
      ? Promise.resolve([])
      : prisma.automationPreference.findMany({ where: { userId: actor.id }, select: { automationId: true, active: true } }),
  ]);
  const preferenceByAutomation = new Map(preferences.map((preference) => [preference.automationId, preference.active]));

  return rules.map((rule) => {
    const preference = preferenceByAutomation.get(rule.id);
    return {
      ...rule,
      active: actor.role === Role.ADMIN ? rule.active : resolveAutomationActive(rule.active, preference),
      globalActive: rule.active,
      customized: preference !== undefined,
    };
  });
}

export async function setAutomationActiveForActor(actor: AutomationActor, automationId: string, active: boolean) {
  const rule = await prisma.automationRule.findUnique({ where: { id: automationId } });
  if (!rule) throw new Error("Automação não encontrada.");

  if (actor.role === Role.ADMIN) {
    return prisma.automationRule.update({ where: { id: automationId }, data: { active } });
  }

  const preference = await prisma.automationPreference.upsert({
    where: { userId_automationId: { userId: actor.id, automationId } },
    update: { active },
    create: { userId: actor.id, automationId, active },
  });
  return { ...rule, active: preference.active, globalActive: rule.active, customized: true };
}

export async function isAutomationActiveForUser(automationId: string, userId?: string | null) {
  const [rule, preference] = await Promise.all([
    prisma.automationRule.findUnique({ where: { id: automationId } }),
    userId
      ? prisma.automationPreference.findUnique({ where: { userId_automationId: { userId, automationId } }, select: { active: true } })
      : Promise.resolve(null),
  ]);
  if (!rule) return false;
  return resolveAutomationActive(rule.active, preference?.active);
}

export async function enabledAutomationUsers(automation: Pick<AutomationRule, "id" | "active">) {
  const users = await prisma.user.findMany({
    where: { active: true, crmEnabled: true },
    select: {
      id: true,
      automationPreferences: { where: { automationId: automation.id }, select: { active: true } },
    },
  });
  return users
    .filter((user) => resolveAutomationActive(automation.active, user.automationPreferences[0]?.active))
    .map((user) => user.id);
}
