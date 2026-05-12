import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import posthog from "posthog-js";

interface AuthUser {
  name: string;
  email: string;
  iniciais: string;
  id: string;
}

interface SubscriptionInfo {
  subscribed: boolean;
  plan: string;
  subscription_end?: string;
  trial_ends_at?: string;
  _loaded: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  supabaseUser: User | null;
  loading: boolean;
  subscription: SubscriptionInfo;
  needsTermsAcceptance: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; errorCode?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  refreshSubscription: () => Promise<void>;
  acceptTerms: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function buildAuthUser(user: User): AuthUser {
  const email = user.email ?? "";
  const name = user.user_metadata?.name || user.user_metadata?.full_name || email.split("@")[0];
  const parts = name.split(" ").filter(Boolean);
  const iniciais = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
  return { id: user.id, name, email, iniciais };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    subscribed: false,
    plan: "free",
    _loaded: false,
  });

  const [needsTermsAcceptance, setNeedsTermsAcceptance] = useState(false);

  const checkTermsAcceptance = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("terms_accepted_at")
      .eq("id", userId)
      .single();
    if (error) return;
    setNeedsTermsAcceptance(!data?.terms_accepted_at);
  }, []);

  const acceptTerms = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase
      .from("profiles")
      .update({ terms_accepted_at: new Date().toISOString() })
      .eq("id", session.user.id);
    if (error) throw error;
    setNeedsTermsAcceptance(false);
  }, []);

  const refreshSubscription = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!error && data) {
        setSubscription({
          subscribed: data.subscribed ?? false,
          plan: data.plan ?? "free",
          subscription_end: data.subscription_end,
          trial_ends_at: data.trial_ends_at,
          _loaded: true,
        });
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
      setSupabaseUser(session?.user ?? null);
      if (event === "SIGNED_IN" && session?.user) {
        const u = session.user;
        const name = u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email?.split("@")[0] ?? "";
        supabase.from("profiles").upsert({
          id: u.id,
          full_name: name,
          email: u.email ?? "",
        }, { onConflict: "id" });
        posthog.identify(u.id, { email: u.email, name });
        posthog.capture("user_logged_in", { provider: u.app_metadata?.provider ?? "email" });
      }
      if (event === "SIGNED_OUT") {
        posthog.reset();
      }
    });

    return () => authSub.unsubscribe();
  }, []);

  // Check subscription when user changes
  useEffect(() => {
    if (supabaseUser) {
      refreshSubscription();
      checkTermsAcceptance(supabaseUser.id);
      const interval = setInterval(refreshSubscription, 600_000);
      return () => clearInterval(interval);
    } else {
      setSubscription({ subscribed: false, plan: "free", _loaded: false });
      setNeedsTermsAcceptance(false);
    }
  }, [supabaseUser, refreshSubscription, checkTermsAcceptance]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, errorCode: error.code ?? error.message };
    return { ok: true };
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, full_name: name } },
    });
    if (error) return { ok: false, error: error.message };

    if (data.user && data.session) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: name,
        email,
      }, { onConflict: "id" });
    }

    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return !error;
  }, []);

  const user = supabaseUser ? buildAuthUser(supabaseUser) : null;

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!supabaseUser,
      user,
      supabaseUser,
      loading,
      subscription,
      needsTermsAcceptance,
      login,
      signup,
      logout,
      resetPassword,
      refreshSubscription,
      acceptTerms,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
