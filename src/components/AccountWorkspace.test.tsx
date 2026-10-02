import { act, render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { readAccountJson, writeAccountJson } from "@/lib/accountStorage";

const mock = vi.hoisted(() => ({ userId: "a" }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: mock.userId } }) }));
import { AccountWorkspace } from "./AccountWorkspace";
function Module() {
  const [items] = useState(() => readAccountJson<string[]>(mock.userId, "fin_wishes_v1", []));
  useEffect(() => { writeAccountJson(mock.userId, "fin_wishes_v1", items); }, [items]);
  return <p>{items.join(",") || "Nenhum desejo"}</p>;
}
beforeEach(() => { mock.userId = "a"; localStorage.clear(); });
it("remonta os módulos ao trocar de conta sem copiar nem apagar os registros anteriores", () => {
  writeAccountJson("a", "fin_wishes_v1", ["Desejo de A"]);
  const { rerender } = render(<AccountWorkspace><Module /></AccountWorkspace>);
  expect(screen.getByText("Desejo de A")).toBeInTheDocument();
  act(() => { mock.userId = "b"; rerender(<AccountWorkspace><Module /></AccountWorkspace>); });
  expect(screen.getByText("Nenhum desejo")).toBeInTheDocument();
  expect(readAccountJson("b", "fin_wishes_v1", null)).toEqual([]);
  expect(readAccountJson("a", "fin_wishes_v1", null)).toEqual(["Desejo de A"]);
});
