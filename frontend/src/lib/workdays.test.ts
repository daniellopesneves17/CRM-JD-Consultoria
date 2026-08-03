// Testes da regra de semáforo e do calendário comercial brasileiro.
import assert from "node:assert/strict";
import test from "node:test";
import { calculateGoalStatus } from "./workdays";

test("meta concluída permanece verde", () => {
  const status = calculateGoalStatus({ targetValue: 10_000, currentValue: 10_000, month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  assert.equal(status.color, "green");
  assert.equal(status.percentage, 100);
  assert.equal(status.dailyNeeded, 0);
});

test("meta sem realizado calcula valores finitos", () => {
  const status = calculateGoalStatus({ targetValue: 50_000, currentValue: 0, month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  assert.ok(Number.isFinite(status.projectedEnd));
  assert.ok(Number.isFinite(status.dailyNeeded));
  assert.ok(status.workdaysTotal >= status.workdaysElapsed);
});
