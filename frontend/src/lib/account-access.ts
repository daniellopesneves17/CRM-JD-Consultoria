import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AccountAccess = { active: boolean; crmEnabled: boolean; role: Role; systemEnabled: boolean };
type CacheEntry = { expiresAt: number; value: Promise<AccountAccess | null> };

const globalAccess = globalThis as unknown as { accountAccessCache?: Map<string, CacheEntry> };
const cache = globalAccess.accountAccessCache ?? new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15_000;

if (process.env.NODE_ENV !== "production") globalAccess.accountAccessCache = cache;

export async function getAccountAccess(userId: string) {
  const now = Date.now();
  const cached = cache.get(userId);
  if (cached && cached.expiresAt > now) return cached.value;

  const value = Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { active: true, crmEnabled: true, role: true } }),
    prisma.systemSettings.findUnique({ where: { id: "global" }, select: { crmEnabled: true } }),
  ]).then(([user, settings]) => user ? { ...user, systemEnabled: settings?.crmEnabled ?? true } : null);

  cache.set(userId, { expiresAt: now + CACHE_TTL_MS, value });
  try {
    return await value;
  } catch (error) {
    cache.delete(userId);
    throw error;
  }
}
