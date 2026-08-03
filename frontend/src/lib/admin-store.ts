// Persistência local do painel admin enquanto o backend PostgreSQL não estiver disponível.
import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type UpdatePolicy = "AUTOMATIC" | "ON_COMPLETION";
export type AdminAccount = {
  id: string; name: string; email: string; passwordHash: string; role: "ADMIN" | "CORRETOR";
  active: boolean; crmEnabled: boolean; createdAt: string; lastLoginAt?: string;
  metrics: { leads: number; qualified: number; closed: number; revenue: number; target: number; current: number; averageTicket: number };
};
export type AdminStore = {
  settings: { crmEnabled: boolean; updatePolicy: UpdatePolicy; maintenanceMessage: string; updatedAt: string };
  accounts: AdminAccount[];
};

const dataDir = path.join(process.cwd(), ".data");
const dataFile = path.join(dataDir, "admin-store.json");
const adminEmail = () => (process.env.ADMIN_EMAIL || "").toLowerCase();

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, stored: string) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const supplied = scryptSync(password, salt, 64);
  const expected = Buffer.from(key, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

async function initialStore(): Promise<AdminStore> {
  return {
    settings: { crmEnabled: true, updatePolicy: "ON_COMPLETION", maintenanceMessage: "CRM temporariamente indisponível para atualização.", updatedAt: new Date().toISOString() },
    accounts: [{
      id: "admin-owner", name: "Daniel Lopes", email: adminEmail(),
      passwordHash: hashPassword(process.env.ADMIN_PASSWORD || ""), role: "ADMIN", active: true, crmEnabled: true,
      createdAt: new Date().toISOString(), metrics: { leads: 0, qualified: 0, closed: 0, revenue: 0, target: 0, current: 0, averageTicket: 0 }
    }]
  };
}
export async function readAdminStore() {
  try { return JSON.parse(await readFile(dataFile, "utf8")) as AdminStore; }
  catch {
    const store = await initialStore();
    await saveAdminStore(store);
    return store;
  }
}
export async function saveAdminStore(store: AdminStore) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, JSON.stringify(store, null, 2), "utf8");
}
export function publicAccount(account: AdminAccount) {
  const { passwordHash: _passwordHash, ...safe } = account;
  return safe;
}
export function performanceInsight(account: AdminAccount) {
  const { target, current, leads, qualified, closed } = account.metrics;
  if (!target) return { status: "NO_DATA", label: "Sem meta", message: "Defina uma meta para iniciar a análise de desempenho." };
  const progress = current / target;
  const day = new Date().getDate();
  const expected = day / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  if (progress >= expected * 1.05) return { status: "ON_TRACK", label: "No ritmo", message: "Está acompanhando ou superando o ritmo necessário para a meta." };
  if (leads > 0 && qualified / leads < 0.25) return { status: "DIFFICULTY", label: "Atenção", message: "A taxa de qualificação está baixa; revise abordagem e perfil dos leads." };
  if (qualified > 0 && closed / qualified < 0.15) return { status: "DIFFICULTY", label: "Atenção", message: "Há oportunidades qualificadas, mas o fechamento está abaixo do esperado." };
  return { status: "BEHIND", label: "Abaixo do ritmo", message: "O realizado está abaixo do ritmo da meta neste momento." };
}

