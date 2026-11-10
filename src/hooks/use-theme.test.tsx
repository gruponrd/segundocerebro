import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeProvider, useTheme } from "./use-theme";

const wrapper = ({ children }: { children: ReactNode }) => <ThemeProvider>{children}</ThemeProvider>;
afterEach(() => { localStorage.clear(); document.documentElement.classList.remove("light", "monochrome"); });
describe("light and dark preference", () => {
  it("toggles both ways and restores the saved preference", () => {
    const first = renderHook(() => useTheme(), { wrapper });
    expect(first.result.current.theme).toBe("dark");
    act(() => first.result.current.toggleTheme());
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(localStorage.getItem("fin_theme")).toBe("light");
    first.unmount();
    const reopened = renderHook(() => useTheme(), { wrapper });
    expect(reopened.result.current.theme).toBe("light");
    act(() => reopened.result.current.toggleTheme());
    expect(reopened.result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });
  it("keeps existing monochrome preferences until the toggle is used", () => {
    localStorage.setItem("fin_theme", "monochrome");
    const view = renderHook(() => useTheme(), { wrapper });
    expect(view.result.current.theme).toBe("monochrome");
    act(() => view.result.current.toggleTheme());
    expect(view.result.current.theme).toBe("light");
  });
});
