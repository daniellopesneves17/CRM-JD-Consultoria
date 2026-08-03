// Fila interna para atualização consolidada das metas.
import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { PrismaClient } from "@prisma/client";

export const queueNames = ["goal-update"] as const;
export type QueueName = typeof queueNames[number];
export type JobPayload = { conversationId?: string; leadId?: string; messageId?: string; audioUrl?: string; phone?: string; userId?: string };

export class QueueService {
  readonly queues: Record<QueueName, Queue<JobPayload>>;
  private workers: Worker[] = [];
  private connection: Redis;
  constructor(private prisma: PrismaClient, redisUrl: string) {
    this.connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    this.queues = Object.fromEntries(queueNames.map((name) => [name, new Queue<JobPayload>(name, { connection: this.connection })])) as Record<QueueName, Queue<JobPayload>>;
  }
  async add(name: QueueName, data: JobPayload, options?: { delay?: number }) {
    return this.queues[name].add(name, data, { removeOnComplete: 100, removeOnFail: 200, attempts: 3, backoff: { type: "exponential", delay: 3000 }, ...options });
  }
  startWorkers() {
    const worker = (name: QueueName, processor: (data: JobPayload) => Promise<unknown>) => {
      this.workers.push(new Worker<JobPayload>(name, (job) => processor(job.data), { connection: this.connection, concurrency: 3 }));
    };
    worker("goal-update", async ({ userId }) => {
      if (!userId) return;
      const now = new Date();
      const proposals = await this.prisma.proposal.aggregate({ _sum: { monthlyValue: true }, where: { status: "ACEITA", acceptedAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) }, lead: { userId } } });
      await this.prisma.goal.updateMany({ where: { userId, month: now.getMonth() + 1, year: now.getFullYear() }, data: { currentValue: proposals._sum.monthlyValue ?? 0 } });
    });
  }
  async close() {
    await Promise.all(this.workers.map((worker) => worker.close()));
    await Promise.all(Object.values(this.queues).map((queue) => queue.close()));
    await this.connection.quit();
  }
}
