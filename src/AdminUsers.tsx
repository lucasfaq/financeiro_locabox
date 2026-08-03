import { useCallback, useEffect, useState } from "react";
import { KeyRound, RefreshCw, ShieldCheck, UserPlus, UserX } from "lucide-react";
import { supabase } from "./supabaseClient";
import "./AdminUsers.css";

const profiles = ["administrador", "financeiro", "aprovador", "diretoria", "consulta"] as const;
type Profile = typeof profiles[number];
type ManagedUser = { id: string; email: string; lastSignInAt: string | null; profile: { nome: string; perfil: Profile; ativo: boolean } | null };

async function request<T>(body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error("Conecte o Supabase para gerenciar usuários.");
  const { data, error } = await supabase.functions.invoke("admin-users", { body });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export function AdminUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", profile: "consulta" as Profile });
  const load = useCallback(async () => { setLoading(true); setMessage(""); try { const data = await request<{ users: ManagedUser[] }>({ action: "list" }); setUsers(data.users); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível carregar os usuários."); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const createUser = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); setMessage(""); try { await request({ action: "create", ...form }); setForm({ name: "", email: "", password: "", profile: "consulta" }); setMessage("Usuário criado. Ele já pode entrar com a senha cadastrada."); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível criar o usuário."); } };
  const changeActive = async (user: ManagedUser) => { if (!user.profile) return; try { await request({ action: "update", userId: user.id, name: user.profile.nome, profile: user.profile.perfil, active: !user.profile.ativo }); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível alterar o acesso."); } };
  const resetPassword = async (user: ManagedUser) => { const password = window.prompt(`Nova senha para ${user.email} (mínimo de 8 caracteres):`); if (!password) return; try { await request({ action: "set_password", userId: user.id, password }); setMessage("Senha atualizada com sucesso."); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível alterar a senha."); } };
  return <section className="admin-users"><header className="admin-users-heading"><div><p className="eyebrow">ADMINISTRAÇÃO</p><h2>Equipe e acessos</h2><p>Cadastre pessoas, defina seus papéis e suspenda acessos sem expor credenciais administrativas.</p></div><button className="secondary-button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} />Atualizar</button></header>{message && <p className="admin-users-message">{message}</p>}<div className="admin-users-grid"><form className="admin-user-form" onSubmit={createUser}><h3><UserPlus size={17} />Novo usuário</h3><label>Nome<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>E-mail<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Senha inicial<input required type="password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label><label>Papel<select value={form.profile} onChange={(event) => setForm({ ...form, profile: event.target.value as Profile })}>{profiles.map((profile) => <option key={profile}>{profile}</option>)}</select></label><button className="primary-button" type="submit"><UserPlus size={16} />Criar acesso</button></form><div className="admin-users-list"><div className="admin-list-title"><h3><ShieldCheck size={17} />Usuários cadastrados</h3><span>{users.length}</span></div>{loading ? <p className="empty">Carregando usuários…</p> : users.map((user) => <article key={user.id} className="admin-user-row"><div><strong>{user.profile?.nome || "Perfil pendente"}</strong><small>{user.email}</small><small>{user.profile ? user.profile.perfil : "sem papel"} · {user.profile?.ativo ? "ativo" : "bloqueado"}</small></div><div className="admin-user-actions"><button className="secondary-button" title="Redefinir senha" onClick={() => void resetPassword(user)}><KeyRound size={15} /></button><button className={user.profile?.ativo ? "secondary-button danger-access" : "secondary-button"} onClick={() => void changeActive(user)} disabled={!user.profile} title={user.profile?.ativo ? "Bloquear acesso" : "Ativar acesso"}>{user.profile?.ativo ? <UserX size={15} /> : <ShieldCheck size={15} />}{user.profile?.ativo ? "Bloquear" : "Ativar"}</button></div></article>)}{!loading && users.length === 0 && <p className="empty">Nenhum usuário encontrado.</p>}</div></div></section>;
}
