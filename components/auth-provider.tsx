"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { authErrorMessage } from "@/lib/auth-errors";

type ShopUser = { id: string; email: string; name: string };
type AuthResult = { error?: string; needsConfirmation?: boolean };
type AuthContextValue = {
  user: ShopUser | null;
  loading: boolean;
  accessToken: string | null;
  mode: "supabase" | "unconfigured";
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  resendConfirmation: (email: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const unavailable = { error: "Autentificarea nu este configurată. Adaugă variabilele Supabase." };
const fromSession = (session: Session): ShopUser => ({ id: session.user.id, email: session.user.email || "", name: String(session.user.user_metadata.full_name || session.user.email?.split("@")[0] || "Client") });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [user, setUser] = useState<ShopUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session ? fromSession(data.session) : null);
      setAccessToken(data.session?.access_token || null);
      setLoading(false);
    }).catch(() => setLoading(false));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session ? fromSession(session) : null);
      setAccessToken(session?.access_token || null);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  const value = useMemo<AuthContextValue>(() => ({
    user, loading, accessToken, mode: supabase ? "supabase" : "unconfigured",
    async signUp(name, email, password) {
      if (!supabase) return unavailable;
      if (password.length < 8) return { error: "Parola trebuie să aibă minimum 8 caractere." };
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: `${location.origin}/cont/profil` } });
      if (error) return { error: authErrorMessage(error) };
      if (data.session) { setUser(fromSession(data.session)); setAccessToken(data.session.access_token); }
      return { needsConfirmation: !data.session };
    },
    async signIn(email, password) {
      if (!supabase) return unavailable;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.code === "email_not_confirmed" ? authErrorMessage(error) : "Email sau parolă incorectă.", needsConfirmation: error.code === "email_not_confirmed" };
      if (data.session) { setUser(fromSession(data.session)); setAccessToken(data.session.access_token); }
      return {};
    },
    async resetPassword(email) {
      if (!supabase) return unavailable;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/cont/parola` });
      return error ? { error: authErrorMessage(error) } : {};
    },
    async resendConfirmation(email) {
      if (!supabase) return unavailable;
      const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${location.origin}/cont/profil` } });
      return error ? { error: authErrorMessage(error) } : {};
    },
    async signOut() {
      if (supabase) await supabase.auth.signOut();
      setUser(null); setAccessToken(null);
    },
  }), [accessToken, loading, supabase, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
