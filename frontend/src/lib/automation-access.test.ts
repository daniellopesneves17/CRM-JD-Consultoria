import assert from "node:assert/strict";
import test from "node:test";
import { resolveAutomationActive } from "./automation-access";

test("preferência do corretor substitui o padrão global", () => {
  assert.equal(resolveAutomationActive(true, false), false);
  assert.equal(resolveAutomationActive(false, true), true);
});

test("automação herda o padrão global sem preferência própria", () => {
  assert.equal(resolveAutomationActive(true), true);
  assert.equal(resolveAutomationActive(false, null), false);
});
