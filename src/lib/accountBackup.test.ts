import { beforeEach, describe, expect, it } from "vitest";
import { createAccountBackup } from "./accountBackup";
import { accountStorageKey } from "./accountStorage";

describe("backup pessoal", () => {
  beforeEach(() => localStorage.clear());
  it("preserva o JSON da nuvem, IDs e campos desconhecidos sem aplicar defaults", () => {
    const row = { user_id: "owner", updated_at: "2026-09-30T12:00:00Z", data: { banks: [{ id: "original", balanceUsed: 123.45 }], custom: { value: false }, cashflowMonths: [] } };
    const result = JSON.parse(JSON.stringify(createAccountBackup(row, "Gabriel", localStorage)));
    expect(result.financial).toEqual(row);
    expect(result.financial.data.cashflowMonths).toEqual([]);
  });
  it("exclui sessões, dados legados e dados de outras contas; mantém apenas os módulos conhecidos do titular", () => {
    localStorage.setItem("sb-project-auth-token", "SECRET");
    localStorage.setItem("fin_wishes_v1", "unowned");
    localStorage.setItem(accountStorageKey("other", "fin_wishes_v1"), "foreign");
    localStorage.setItem(accountStorageKey("owner", "unknown-token"), "SECRET");
    localStorage.setItem(accountStorageKey("owner", "fin_wishes_v1"), '[{"id":"wish"}]');
    const result = createAccountBackup({ user_id: "owner", updated_at: "now", data: {} }, "Gabriel", localStorage);
    expect(result.local.modules).toEqual({ fin_wishes_v1: '[{"id":"wish"}]' });
    expect(JSON.stringify(result)).not.toMatch(/SECRET|foreign|unowned/);
  });
  it("mantém a cópia local separada da nuvem e não altera o armazenamento", () => {
    localStorage.setItem("fin_user_owner", '{"salary":99}');
    const result = createAccountBackup({ user_id: "owner", updated_at: "now", data: { salary: 100 } }, "Gabriel", localStorage);
    expect(result.local.financialCache).toBe('{"salary":99}');
    expect(result.financial.data).toEqual({ salary: 100 });
    expect(localStorage.getItem("fin_user_owner")).toBe('{"salary":99}');
  });
});
