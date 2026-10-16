import assert from "node:assert/strict";
import test from "node:test";
import { isScheduledAutomationDue, scheduledMinutes, saoPauloClock } from "@/lib/automation-schedule";

test("interpreta o horário programado das automações", () => {
  assert.equal(scheduledMinutes({ horario_programado: "14:00" }), 14 * 60);
  assert.equal(scheduledMinutes({ janela_horario: "09:35" }), 9 * 60 + 35);
  assert.equal(scheduledMinutes({ horario_programado: "25:00" }), null);
});

test("avalia o gatilho no fuso de São Paulo", () => {
  const before = new Date("2026-10-16T16:59:00.000Z");
  const due = new Date("2026-10-16T17:00:00.000Z");
  assert.deepEqual(saoPauloClock(due), { dateKey: "2026-10-16", minutes: 14 * 60 });
  assert.equal(isScheduledAutomationDue({ horario_programado: "14:00" }, before), false);
  assert.equal(isScheduledAutomationDue({ horario_programado: "14:00" }, due), true);
});
