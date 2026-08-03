// Expõe somente o estado público necessário para a tela de manutenção.
import { FastifyPluginAsync } from "fastify";

const systemRoutes: FastifyPluginAsync = async (app) => {
  app.get("/settings", async () => {
    const settings = await app.prisma.systemSettings.upsert({
      where: { id: "global" },
      update: {},
      create: { id: "global" }
    });

    return {
      crmEnabled: settings.crmEnabled,
      maintenanceMessage: settings.maintenanceMessage,
      updatedAt: settings.updatedAt
    };
  });
};

export default systemRoutes;
