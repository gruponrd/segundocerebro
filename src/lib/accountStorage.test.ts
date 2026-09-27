import { beforeEach, describe, expect, it } from "vitest";
import { accountStorageKey, importLegacyModuleData, readAccountJson, writeAccountJson } from "./accountStorage";

describe("armazenamento por conta", () => {
  beforeEach(() => localStorage.clear());

  it("não lê dados legados nem de outra conta sem importação explícita", () => {
    localStorage.setItem("fin_trades", JSON.stringify([{ id: "legacy" }]));
    writeAccountJson("a", "fin_trades", [{ id: "a" }]);
    expect(readAccountJson("b", "fin_trades", [])).toEqual([]);
    importLegacyModuleData("b");
    expect(readAccountJson("b", "fin_trades", [])).toEqual([{ id: "legacy" }]);
    expect(localStorage.getItem(accountStorageKey("a", "fin_trades"))).toContain("a");
  });
});
