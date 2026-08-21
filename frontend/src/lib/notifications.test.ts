import assert from "node:assert/strict";
import test from "node:test";
import { isAdminOnlyNotificationType, notificationVisibility } from "@/lib/notifications";

test("notificações de falha são exclusivas dos administradores", () => {
  assert.equal(isAdminOnlyNotificationType("SYSTEM_ERROR"), true);
  assert.deepEqual(notificationVisibility("ADMIN"), {});
  assert.deepEqual(notificationVisibility("CORRETOR"), { type: { notIn: ["SYSTEM_ERROR"] } });
});

test("notificações comerciais continuam disponíveis aos corretores", () => {
  assert.equal(isAdminOnlyNotificationType("NEW_MESSAGE"), false);
  assert.equal(isAdminOnlyNotificationType("TASK_DUE"), false);
});
