import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  listener: null as null | ((event: string, session: unknown) => void),
  profiles: new Map<string, Promise<{ data: { display_name: string } | null }>>(),
  profileCalls: [] as string[],
  signup: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: {
    onAuthStateChange: (listener: typeof mock.listener) => { mock.listener = listener; return { data: { subscription: { unsubscribe: vi.fn() } } }; },
    getSession: async () => ({ data: { session: null } }),
    signUp: mock.signup,
    signInWithPassword: vi.fn(), signOut: vi.fn(),
  },
  from: () => {
    let id = "";
    const query = { select: () => query, eq: (_column: string, value: string) => { id = value; return query; },
      maybeSingle: () => { mock.profileCalls.push(id); return mock.profiles.get(id) ?? Promise.resolve({ data: null }); } };
    return query;
  },
} }));

import { AuthProvider, useAuth } from "./useAuth";
const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;
const session = (id: string, name?: string) => ({ user: { id, user_metadata: name ? { display_name: name } : {} } }) as Session;

describe("identidade da conta", () => {
  beforeEach(() => { mock.profiles.clear(); mock.profileCalls.length = 0; mock.signup.mockReset(); });

  it("usa o nome do cadastro e ignora uma resposta atrasada do perfil anterior", async () => {
    let resolveOld!: (value: { data: { display_name: string } }) => void;
    mock.profiles.set("a", new Promise(resolve => { resolveOld = resolve; }));
    const { result } = renderHook(useAuth, { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => mock.listener!("SIGNED_IN", session("a", "Gabriel")));
    await waitFor(() => expect(mock.profileCalls).toContain("a"));
    act(() => mock.listener!("SIGNED_IN", session("b", "Marina Costa")));
    await waitFor(() => expect(mock.profileCalls).toContain("b"));
    await act(async () => resolveOld({ data: { display_name: "Gabriel antigo" } }));
    expect(result.current.displayName).toBe("Marina Costa");
    expect(result.current.user?.id).toBe("b");
  });

  it("não reutiliza o nome anterior quando uma conta não tem nome", async () => {
    const { result } = renderHook(useAuth, { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => mock.listener!("SIGNED_IN", session("a", "Gabriel")));
    act(() => mock.listener!("SIGNED_IN", session("b")));
    expect(result.current.displayName).toBe("");
    act(() => mock.listener!("SIGNED_OUT", null));
    expect(result.current.user).toBeNull();
    expect(result.current.displayName).toBe("");
  });

  it("envia nome normalizado e distingue confirmação de email de acesso imediato", async () => {
    mock.signup.mockResolvedValueOnce({ data: { session: null }, error: null })
      .mockResolvedValueOnce({ data: { session: session("b", "Marina") }, error: null });
    const { result } = renderHook(useAuth, { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const first = await result.current.signUp(" marina@example.com ", "test-only", "  Marina   Costa  ");
    expect(first.needsEmailConfirmation).toBe(true);
    expect(mock.signup).toHaveBeenCalledWith(expect.objectContaining({ email: "marina@example.com", options: {
      data: { display_name: "Marina Costa" }, emailRedirectTo: window.location.origin,
    } }));
    expect((await result.current.signUp("marina@example.com", "test-only", "Marina")).needsEmailConfirmation).toBe(false);
  });
});
