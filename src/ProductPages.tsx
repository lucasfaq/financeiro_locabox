import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { loadUserPreferences, loadUserProfile, saveUserPreferences, saveUserProfileName, type UserPreferences, type UserProfile } from "./userPreferencesRepository";

type Task = { id: string | number; title: string; company: string; category: string; due: string; owner: string; value: number; status: string; priority: string };

export function ApprovalsPage({ tasks, onDecide }: { tasks: Task[]; onDecide: (id: Task["id"], approved: boolean) => void }) {
  const [selected, setSelected] = useState<Task | null>(tasks[0] ?? null);
  const [reason, setReason] = useState("");
  return <section className="product-page"><header><div><p className="eyebrow">FLUXO FINANCEIRO</p><h2>Aprovações</h2><p>Decisões pendentes que exigem registro e responsável.</p></div></header><div className="approvals-layout"><div className="approval-list">{tasks.map((task) => <button key={task.id} className={selected?.id === task.id ? "selected" : ""} onClick={() => { setSelected(task); setReason(""); }}><small>{task.company} · {task.category}</small><strong>{task.title}</strong><span>{task.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></button>)}{tasks.length === 0 && <p className="empty">Não há aprovações pendentes.</p>}</div>{selected && <article className="approval-detail"><p className="eyebrow">EM ANÁLISE</p><h3>{selected.title}</h3><p>{selected.company} · {selected.category} · vencimento {selected.due}</p><strong>{selected.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong><label>Justificativa da decisão<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Registre a justificativa ou orientação." /></label><div><button className="secondary-button" onClick={() => onDecide(selected.id, false)}>Devolver</button><button className="primary-button" onClick={() => onDecide(selected.id, true)}>Aprovar</button></div></article>}</div></section>;
}

export function CalendarPage({ tasks }: { tasks: Task[] }) {
  const [cursor, setCursor] = useState(new Date()); const days = Array.from({ length: new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate() }, (_, index) => index + 1);
  return <section className="product-page"><header><div><p className="eyebrow">PLANEJAMENTO</p><h2>Calendário</h2><p>Atividades organizadas por vencimento.</p></div><div><button className="secondary-button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>‹</button><button className="secondary-button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>›</button></div></header><div className="calendar-title"><strong>{cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</strong></div><div className="calendar-grid monthly">{days.map((day) => <div className="calendar-day" key={day}><strong>{day}</strong>{tasks.filter((task) => task.due.includes(`/${String(cursor.getMonth() + 1).padStart(2, "0")}/`) && task.due.startsWith(`${String(day).padStart(2, "0")}/`)).map((task) => <span className="calendar-task" key={task.id}>{task.title}</span>)}</div>)}</div></section>;
}

export function SettingsPage() {
  const [preferences, setPreferences] = useState<UserPreferences>({ timezone: "America/Fortaleza", weekStartsOn: "segunda", browserNotifications: true });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { void loadUserPreferences().then(setPreferences).catch((error: Error) => setMessage(error.message)); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    try { await saveUserPreferences(preferences); setMessage("Configurações salvas na sua conta."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar as configurações."); }
    finally { setSaving(false); }
  }
  return <section className="product-page settings-page"><p className="eyebrow">ADMINISTRAÇÃO</p><h2>Configurações</h2><p>Preferências operacionais vinculadas à sua conta.</p><form onSubmit={submit}><label>Fuso horário<select value={preferences.timezone} onChange={(event) => setPreferences({ ...preferences, timezone: event.target.value as UserPreferences["timezone"] })}><option value="America/Fortaleza">Fortaleza (GMT−3)</option></select></label><label>Início da semana<select value={preferences.weekStartsOn} onChange={(event) => setPreferences({ ...preferences, weekStartsOn: event.target.value as UserPreferences["weekStartsOn"] })}><option value="segunda">Segunda-feira</option><option value="domingo">Domingo</option></select></label><label className="toggle-setting"><input type="checkbox" checked={preferences.browserNotifications} onChange={(event) => setPreferences({ ...preferences, browserNotifications: event.target.checked })} />Mostrar notificações no navegador</label><button className="primary-button" disabled={saving}>{saving ? "Salvando…" : "Salvar configurações"}</button></form>{message && <p className="notice">{message}</p>}</section>;
}

export function ProfilePage({ onProfileUpdated }: { onProfileUpdated?: (profile: UserProfile) => void }) {
  const [profile, setProfile] = useState<UserProfile>({ name: "", email: "", role: "" });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { void loadUserProfile().then(setProfile).catch((error: Error) => setMessage(error.message)); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    try { await saveUserProfileName(profile.name); onProfileUpdated?.(profile); setMessage("Nome do perfil atualizado."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o perfil."); }
    finally { setSaving(false); }
  }
  const initials = profile.name.split(/\s+/).filter(Boolean).slice(0, 2).map((name) => name[0]).join("").toUpperCase() || "US";
  return <section className="product-page profile-page"><p className="eyebrow">CONTA</p><h2>Meu perfil</h2><div className="profile-card"><div className="avatar">{initials}</div><div><strong>{profile.name || "Usuário"}</strong><p>{profile.role || "Perfil não definido"}</p></div></div><form onSubmit={submit}><label>Nome<input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label><label>E-mail<input type="email" value={profile.email} readOnly aria-readonly="true" /></label><label>Cargo<input value={profile.role} readOnly aria-readonly="true" /></label><p className="field-help">E-mail e cargo são controlados pela administração.</p><button className="primary-button" disabled={saving}>{saving ? "Salvando…" : "Salvar perfil"}</button></form>{message && <p className="notice">{message}</p>}</section>;
}
