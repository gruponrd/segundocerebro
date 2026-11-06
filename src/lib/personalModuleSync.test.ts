import { describe, expect, it } from "vitest";
import { decideModuleSync } from "./personalModuleSync";

describe("sincronização conservadora", () => {
  it("não escolhe entre versões diferentes sem uma referência comum", () => {
    expect(decideModuleSync("local", "nuvem", null)).toBe("conflict");
    expect(decideModuleSync("local", "nuvem", "antigo")).toBe("conflict");
  });
  it("só transfere alterações quando a outra cópia continua no ponto sincronizado", () => {
    expect(decideModuleSync("novo", "antigo", "antigo")).toBe("upload");
    expect(decideModuleSync("antigo", "novo", "antigo")).toBe("download");
    expect(decideModuleSync(null, "novo", null)).toBe("download");
    expect(decideModuleSync("novo", null, null)).toBe("upload");
    expect(decideModuleSync(null, "novo", "antigo")).toBe("conflict");
    expect(decideModuleSync("novo", null, "antigo")).toBe("conflict");
  });
});
