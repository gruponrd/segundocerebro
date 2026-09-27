import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "dark" | "light" | "monochrome";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "dark", toggleTheme: () => {}, setTheme: () => {} });

const THEME_ORDER: Theme[] = ["light", "dark", "monochrome"];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("fin_theme");
    return (stored === "light" || stored === "dark" || stored === "monochrome") ? stored : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "monochrome");
    if (theme === "light") {
      root.classList.add("light");
    } else if (theme === "monochrome") {
      root.classList.add("monochrome");
    }
    localStorage.setItem("fin_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) => {
      const idx = THEME_ORDER.indexOf(t);
      return THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
