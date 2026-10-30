import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
