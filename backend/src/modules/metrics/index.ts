// KPIs comerciais, funil, receita, IA e ranking da equipe.
import { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const period = z.object({ days: z.coerce.number().int().min(1).max(730).default(30) });
const routes: FastifyPluginAsync = async (app) => {
  app.get("/overview", { preHandler: [app.authenticate] }, async (request) => {
    const { days } = period.parse(request.query);
    const since = new Date(Date.now() - days * 86_400_000);
    const [leads, qualified, closed, revenue, lives] = await app.prisma.$transaction([
      app.prisma.lead.count({ where: { createdAt: { gte: since } } }),
      app.prisma.lead.count({ where: { createdAt: { gte: since }, stage: { notIn: ["NOVO", "PERDIDO"] } } }),
      app.prisma.lead.count({ where: { createdAt: { gte: since }, stage: "FECHADO" } }),
      app.prisma.proposal.aggregate({ _sum: { monthlyValue: true }, _avg: { monthlyValue: true }, where: { status: "ACEITA", acceptedAt: { gte: since } } }),
      app.prisma.lead.aggregate({ _sum: { livesCount: true }, where: { stage: "FECHADO" } })
    ]);
    return {
      leads, qualificationRate: leads ? qualified / leads * 100 : 0, closingRate: qualified ? closed / qualified * 100 : 0,
      averageTicket: Number(revenue._avg.monthlyValue ?? 0), revenue: Number(revenue._sum.monthlyValue ?? 0),
      activeLives: lives._sum.livesCount ?? 0, churnRate: 0, averageClosingDays: 0
    };
  });
  app.get("/funnel", { preHandler: [app.authenticate] }, async () => {
    const groups = await app.prisma.lead.groupBy({ by: ["stage"], _count: true });
    return groups.map((group) => ({ stage: group.stage, value: group._count }));
  });
  app.get("/revenue", { preHandler: [app.authenticate] }, async () => {
    const items = await app.prisma.proposal.findMany({ where: { status: "ACEITA" }, include: { lead: { include: { assignedTo: { select: { name: true } } } } } });
    return items.map((item) => ({ date: item.acceptedAt ?? item.createdAt, operator: item.operator, broker: item.lead.assignedTo?.name ?? "Sem corretor", value: Number(item.monthlyValue) }));
  });
  app.get("/team", { preHandler: [app.requireAdmin] }, async () => {
    const users = await app.prisma.user.findMany({ where: { active: true }, include: { leads: { where: { stage: "FECHADO" }, include: { proposals: { where: { status: "ACEITA" } } } } } });
    return users.map((user) => ({ id: user.id, name: user.name, sales: user.leads.length, revenue: user.leads.flatMap((lead) => lead.proposals).reduce((sum, proposal) => sum + Number(proposal.monthlyValue), 0) })).sort((a, b) => b.revenue - a.revenue);
  });
};
export default routes;
