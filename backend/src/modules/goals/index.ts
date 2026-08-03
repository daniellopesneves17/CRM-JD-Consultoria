// Metas mensais, semáforo de ritmo e projeção até o fechamento do mês.
import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AppError } from "../../utils/errors.js";

const businessDays = (start: Date, end: Date) => {
  let count = 0;
  const cursor = new Date(start);
  cursor.setHours(12, 0, 0, 0);
  while (cursor <= end) {
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
};

export function goalStatus(current: number, target: number, date = new Date()) {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const totalWorkdays = businessDays(monthStart, monthEnd);
  const elapsed = businessDays(monthStart, date);
  const workdaysRemaining = businessDays(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1), monthEnd);
  const percentage = target ? (current / target) * 100 : 0;
  const elapsedPercentage = totalWorkdays ? (elapsed / totalWorkdays) * 100 : 100;
  const ratio = elapsedPercentage ? percentage / elapsedPercentage : 1;
  const color = ratio >= 1.1 ? "green" : ratio >= 0.85 ? "yellow" : "red";
  const dailyAverage = elapsed ? current / elapsed : 0;
  return {
    percentage: Number(percentage.toFixed(1)), color, workdaysRemaining,
    dailyNeeded: Number((workdaysRemaining ? Math.max(0, target - current) / workdaysRemaining : 0).toFixed(2)),
    projectedEnd: Number((dailyAverage * totalWorkdays).toFixed(2)), onTrack: dailyAverage * totalWorkdays >= target
  };
}

const routes: FastifyPluginAsync = async (app) => {
  app.get("/current", { preHandler: [app.authenticate] }, async (request) => {
    const now = new Date();
    const goal = await app.prisma.goal.findUnique({ where: { userId_month_year: { userId: request.user.id, month: now.getMonth() + 1, year: now.getFullYear() } } });
    if (!goal) throw new AppError("Meta do mês ainda não configurada.", 404);
    return { ...goal, status: goalStatus(Number(goal.currentValue), Number(goal.targetValue), now) };
  });
  app.get("/team", { preHandler: [app.requireAdmin] }, async () => {
    const now = new Date();
    const goals = await app.prisma.goal.findMany({ where: { month: now.getMonth() + 1, year: now.getFullYear() }, include: { user: { select: { id: true, name: true, avatarUrl: true } } } });
    return goals.map((goal) => ({ ...goal, status: goalStatus(Number(goal.currentValue), Number(goal.targetValue), now) }));
  });
  app.post("/", { preHandler: [app.authenticate] }, async (request) => {
    const body = z.object({ userId: z.string().optional(), month: z.number().int().min(1).max(12), year: z.number().int().min(2020), targetValue: z.number().positive() }).parse(request.body);
    const userId = request.user.role === "ADMIN" && body.userId ? body.userId : request.user.id;
    return app.prisma.goal.upsert({ where: { userId_month_year: { userId, month: body.month, year: body.year } }, update: { targetValue: body.targetValue }, create: { userId, month: body.month, year: body.year, targetValue: body.targetValue } });
  });
  app.get("/projection", { preHandler: [app.authenticate] }, async (request) => {
    const now = new Date();
    const goal = await app.prisma.goal.findUnique({ where: { userId_month_year: { userId: request.user.id, month: now.getMonth() + 1, year: now.getFullYear() } } });
    if (!goal) throw new AppError("Meta do mês ainda não configurada.", 404);
    return goalStatus(Number(goal.currentValue), Number(goal.targetValue), now);
  });
  app.get("/history", { preHandler: [app.authenticate] }, async (request) => app.prisma.goal.findMany({ where: { userId: request.user.id }, orderBy: [{ year: "desc" }, { month: "desc" }], take: 6 }));
};
export default routes;

