import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

/** Reset in-memory route and module state whenever the signed-in account changes. */
export function AccountWorkspace({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return <div key={user?.id ?? "signed-out"} className="contents">{children}</div>;
}
