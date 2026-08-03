import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

export function AuthGate({ children }: { children: ReactNode }) {
  const client = supabase;
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!client);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!client) return;
    void client.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: subscription } = client.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => subscription.subscription.unsubscribe();
  }, [client]);

  if (!client) return <>{children}</>;
  if (!ready) return <main className="app-shell"><p className="empty">Verificando sua sessão…</p></main>;
  if (!session) return <main className="app-shell"><section className="auth-card"><p className="eyebrow">ACESSO SEGURO</p><h1>Gestão financeira</h1><p>Entre com seu e-mail corporativo. Enviaremos um link de acesso de uso único.</p><form onSubmit={async (event) => { event.preventDefault(); const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } }); setMessage(error ? error.message : "Confira seu e-mail para acessar a plataforma."); }}><label>E-mail corporativo<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><button className="primary-button" type="submit">Enviar link de acesso</button></form>{message && <p className="empty">{message}</p>}</section></main>;
  return <>{children}<button className="session-button" onClick={() => void client.auth.signOut()} title={session.user.email ?? "Sair"}>Sair</button></>;
}
