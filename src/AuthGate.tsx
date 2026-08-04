import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

export function AuthGate({ children }: { children: ReactNode }) {
  const client = supabase;
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!client);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [accessReady, setAccessReady] = useState(!client);

  useEffect(() => {
    if (!client) return;
    void client.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: subscription } = client.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); setAccessReady(!nextSession); });
    return () => subscription.subscription.unsubscribe();
  }, [client]);

  useEffect(() => {
    if (!client || !session) return;
    let active = true;
    setAccessReady(false);
    void client.from("perfis").select("perfil,ativo").eq("id", session.user.id).maybeSingle().then(async ({ data, error }) => {
      if (!active) return;
      if (error?.code === "42703") {
        const legacyProfile = await client.from("perfis").select("perfil").eq("id", session.user.id).maybeSingle();
        if (!legacyProfile.error && legacyProfile.data && active) { setAccessReady(true); return; }
      }
      if (error || !data?.ativo) {
        await client.auth.signOut();
        if (active) setMessage(error ? "Não foi possível validar seu perfil de acesso." : "Seu acesso está desativado ou não possui perfil cadastrado.");
      }
      if (active) setAccessReady(true);
    });
    return () => { active = false; };
  }, [client, session]);

  if (!client) return <>{children}</>;
  if (!ready || (session && !accessReady)) return <main className="app-shell"><p className="empty">Verificando seu acesso…</p></main>;
  if (!session) return <main className="app-shell"><section className="auth-card"><p className="eyebrow">ACESSO SEGURO</p><h1>Gestão financeira</h1><p>Entre com seu e-mail e senha. O acesso é definido pelo perfil atribuído à sua conta.</p><form onSubmit={async (event) => { event.preventDefault(); setMessage(""); const { error } = await client.auth.signInWithPassword({ email, password }); setMessage(error ? "E-mail ou senha inválidos." : ""); }}><label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label><label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required minLength={8} /></label><button className="primary-button" type="submit">Entrar</button></form>{message && <p className="empty">{message}</p>}</section></main>;
  return <>{children}<button className="session-button" onClick={() => void client.auth.signOut()} title={session.user.email ?? "Sair"}>Sair</button></>;
}
