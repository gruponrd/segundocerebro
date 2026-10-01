import { lazy, Suspense } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { RouteRecovery } from "./RouteRecovery";

afterEach(() => vi.restoreAllMocks());

it("recovers a failed page import while preserving the surrounding app and allowing navigation", async () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  const UnavailablePage = lazy(() => Promise.reject(new TypeError("Failed to fetch dynamically imported module")));
  render(
    <MemoryRouter initialEntries={["/unavailable"]}>
      <input aria-label="Edição pendente" defaultValue="Preservar" />
      <Link to="/healthy">Outra seção</Link>
      <RouteRecovery>
        <Suspense fallback={<p>Carregando...</p>}>
          <Routes>
            <Route path="/unavailable" element={<UnavailablePage />} />
            <Route path="/healthy" element={<p>Seção disponível</p>} />
          </Routes>
        </Suspense>
      </RouteRecovery>
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Edição pendente"), { target: { value: "Ainda não terminei" } });
  expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível abrir esta tela");
  expect(screen.getByRole("button", { name: "Recarregar aplicativo" })).toBeVisible();
  expect(screen.getByLabelText("Edição pendente")).toHaveValue("Ainda não terminei");
  fireEvent.click(screen.getByRole("link", { name: "Outra seção" }));
  expect(await screen.findByText("Seção disponível")).toBeVisible();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByLabelText("Edição pendente")).toHaveValue("Ainda não terminei");
});
