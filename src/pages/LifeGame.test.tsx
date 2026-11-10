import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "journey-test" } }) }));
vi.mock("@/lib/previewMode", () => ({ isAccountPreview: false }));
import { accountStorageKey } from "@/lib/accountStorage";
import LifeGame from "./LifeGame";
const key = accountStorageKey("journey-test", "neuro-recovery-v1");
afterEach(() => { cleanup(); localStorage.clear(); vi.useRealTimers(); });

it("defaults to the Brasília date after 21h, prevents invalid dates and saves the selected day unchanged", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-30T01:30:00Z"));
  render(<LifeGame/>);
  const field = screen.getByLabelText("Data em que você parou");
  expect(field).toHaveValue("2026-10-29");
  expect(field).toHaveAttribute("max", "2026-10-29");
  fireEvent.change(field, { target: { value: "" } });
  expect(screen.getByRole("button", { name: "Iniciar Reconstrução" })).toBeDisabled();
  expect(localStorage.getItem(key)).toBeNull();
  fireEvent.change(field, { target: { value: "2026-10-29" } });
  fireEvent.click(screen.getByRole("button", { name: "Iniciar Reconstrução" }));
  expect(JSON.parse(localStorage.getItem(key)!).startDate).toBe("2026-10-29");
  expect(screen.getByText(/Início em 29\/10\/2026/)).toBeInTheDocument();
});
it("reopening an existing journey keeps its legacy date and progress untouched", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-29T18:00:00Z"));
  const raw = JSON.stringify({ startDate: "2026-09-19T03:00:00.000Z", defeatedBosses: ["b1"], bestStreakDays: 40, claimedCoins: [1, 3, 7, 14, 21, 30] });
  localStorage.setItem(key, raw);
  render(<LifeGame/>);
  expect(screen.getByText(/Início em 19\/09\/2026/)).toBeInTheDocument();
  expect(localStorage.getItem(key)).toBe(raw);
});
it("does not reopen an old day-one celebration when the journey is already six days old", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-06T15:00:00Z"));
  const saved = { startDate: "2026-10-31", defeatedBosses: ["b1"], bestStreakDays: 8, claimedCoins: [] };
  localStorage.setItem(key, JSON.stringify(saved));
  render(<LifeGame />);
  expect(screen.getByText("6 dias offline")).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(key)!)).toEqual(saved);
});
it("celebrates the current milestone once without resetting the saved journey", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-07T15:00:00Z"));
  const saved = { startDate: "2026-10-31", defeatedBosses: ["b1"], bestStreakDays: 8, claimedCoins: [] };
  localStorage.setItem(key, JSON.stringify(saved));
  const view = render(<LifeGame />);
  expect(screen.getByRole("dialog")).toHaveTextContent("Dia 7");
  expect(JSON.parse(localStorage.getItem(key)!)).toEqual({ ...saved, claimedCoins: [7] });
  view.unmount();
  render(<LifeGame />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByText("7 dias offline")).toBeInTheDocument();
});

it("allows adding a time to an existing journey and advances the counter without resetting progress", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-06T15:00:00Z"));
  const saved = { startDate: "2026-10-31", defeatedBosses: ["b1"], bestStreakDays: 8, claimedCoins: [1, 3] };
  localStorage.setItem(key, JSON.stringify(saved));
  render(<LifeGame />);
  expect(screen.getByText(/Horário não informado/)).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(key)!)).toEqual(saved);
  fireEvent.click(screen.getByRole("button", { name: "Ajustar horário" }));
  fireEvent.change(screen.getByLabelText("Horário de início"), { target: { value: "10:30" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar horário" }));
  expect(JSON.parse(localStorage.getItem(key)!)).toEqual({ ...saved, startTime: "10:30" });
  expect(screen.getByLabelText("6 dias, 1 horas, 30 minutos e 0 segundos")).toBeInTheDocument();
  act(() => { vi.advanceTimersByTime(61_000); });
  expect(screen.getByLabelText("6 dias, 1 horas, 31 minutos e 1 segundos")).toBeInTheDocument();
});
