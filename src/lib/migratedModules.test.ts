import { beforeEach, describe, expect, it } from "vitest";
import { restoreMigratedModules } from "./migratedModules";
import { accountStorageKey } from "./accountStorage";

describe("módulos recuperados durante a migração", () => {
  beforeEach(() => localStorage.clear());
  it("recupera apenas módulos conhecidos e não substitui dados novos ou de outras contas", () => {
    localStorage.setItem(accountStorageKey("new", "fin_trades"), '[{"id":"newer"}]');
    localStorage.setItem(accountStorageKey("other", "fin_wishes_v1"), '[]');
    restoreMigratedModules("new", { fin_trades: '[{"id":"old"}]', fin_wishes_v1: '[{"id":"wish"}]', token: '"secret"' }, localStorage);
    expect(localStorage.getItem(accountStorageKey("new", "fin_trades"))).toContain("newer");
    expect(localStorage.getItem(accountStorageKey("new", "fin_wishes_v1"))).toContain("wish");
    expect(localStorage.getItem(accountStorageKey("other", "fin_wishes_v1"))).toBe('[]');
    expect(localStorage.getItem(accountStorageKey("new", "token"))).toBeNull();
  });
  it("valida todo o backup antes de escrever ou marcar como restaurado", () => {
    expect(() => restoreMigratedModules("new", { fin_trades: '[]', fin_wishes_v1: 'broken' }, localStorage)).toThrow();
    expect(localStorage.getItem(accountStorageKey("new", "fin_trades"))).toBeNull();
    expect(localStorage.getItem("fin_migrated_modules_restored_new")).toBeNull();
  });
});
