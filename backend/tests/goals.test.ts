// Testa a regra crítica do semáforo de metas sem depender de banco ou APIs.
import { describe, expect, it } from "vitest";
import { goalStatus } from "../src/modules/goals/index.js";
describe("goalStatus", () => {
  it("calcula percentual e projeção sem ultrapassar regras de domínio", () => {
    const status = goalStatus(18400, 30000, new Date(2026, 6, 15));
    expect(status.percentage).toBeCloseTo(61.3, 1);
    expect(["red", "yellow", "green"]).toContain(status.color);
    expect(status.dailyNeeded).toBeGreaterThanOrEqual(0);
    expect(status.projectedEnd).toBeGreaterThan(0);
  });
  it("não divide por zero quando a meta é zero", () => {
    expect(goalStatus(0, 0, new Date(2026, 6, 1)).percentage).toBe(0);
  });
});

