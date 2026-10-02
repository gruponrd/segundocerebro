import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isPreviewMode } from "@/lib/previewMode";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { accountDisplayName, normalizeDisplayName } from "@/lib/accountIdentity";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  displayName: string;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: AuthError | null; needsEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (isPreviewMode) {
      let cancelled = false;
      // Reuse an already authenticated browser session when one exists. This
      // lets the local redesign display the real account without prompting for
      // credentials again. If there is no session, use an isolated local user.
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return;
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          setDisplayName(accountDisplayName(session.user.user_metadata));
        } else {
          const previewUser = {
            id: "preview-user",
            email: "preview@local",
            app_metadata: {},
            user_metadata: { display_name: "Prévia" },
            aud: "authenticated",
            created_at: new Date(0).toISOString(),
          } as User;
          setUser(previewUser);
          setSession(null);
          setDisplayName("Prévia");
        }
        setLoading(false);
      });
      return () => { cancelled = true; };
    }

    let alive = true;
    let generation = 0;
    let receivedAuthEvent = false;
    const applySession = (nextSession: Session | null) => {
      if (!alive) return;
      const currentGeneration = ++generation;
      const nextUser = nextSession?.user ?? null;
      setSession(nextSession);
      setUser(nextUser);
      setDisplayName(accountDisplayName(nextUser?.user_metadata));
      setLoading(false);
      if (!nextUser) return;
      // Keep the auth callback synchronous. Ignore any response for an old account.
      setTimeout(async () => {
        if (!alive || generation !== currentGeneration) return;
        try {
          const { data } = await supabase.from("profiles")
            .select("display_name").eq("user_id", nextUser.id).maybeSingle();
          if (alive && generation === currentGeneration && data?.display_name?.trim()) {
            setDisplayName(data.display_name.trim());
          }
        } catch { /* The name supplied at registration remains available. */ }
      }, 0);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      receivedAuthEvent = true;
      applySession(nextSession);
    });
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!receivedAuthEvent) applySession(initialSession);
    }).catch(() => { if (!receivedAuthEvent) applySession(null); });

    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: normalizeDisplayName(name) },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error, needsEmailConfirmation: !error && !data.session };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, displayName, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
