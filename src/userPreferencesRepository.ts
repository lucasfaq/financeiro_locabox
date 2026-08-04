import { supabase } from "./supabaseClient";

export type UserPreferences = {
  timezone: "America/Fortaleza";
  weekStartsOn: "segunda" | "domingo";
  browserNotifications: boolean;
};

export type UserProfile = {
  name: string;
  email: string;
  role: string;
};

const defaultPreferences: UserPreferences = {
  timezone: "America/Fortaleza",
  weekStartsOn: "segunda",
  browserNotifications: true,
};

async function getCurrentUser() {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Sessão expirada. Entre novamente.");
  return data.user;
}

export async function loadUserPreferences(): Promise<UserPreferences> {
  if (!supabase) return defaultPreferences;
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from("preferencias_usuario")
    .select("fuso_horario,inicio_semana,notificacoes_navegador")
    .eq("usuario_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return defaultPreferences;
  return {
    timezone: "America/Fortaleza",
    weekStartsOn: data.inicio_semana === "domingo" ? "domingo" : "segunda",
    browserNotifications: data.notificacoes_navegador,
  };
}

export async function saveUserPreferences(preferences: UserPreferences): Promise<void> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const user = await getCurrentUser();
  const { error } = await supabase.from("preferencias_usuario").upsert({
    usuario_id: user.id,
    fuso_horario: preferences.timezone,
    inicio_semana: preferences.weekStartsOn,
    notificacoes_navegador: preferences.browserNotifications,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function loadUserProfile(): Promise<UserProfile> {
  if (!supabase) return { name: "Usuário", email: "", role: "" };
  const user = await getCurrentUser();
  const { data, error } = await supabase.from("perfis").select("nome,perfil").eq("id", user.id).maybeSingle();
  if (error) throw error;
  return { name: data?.nome ?? user.email ?? "Usuário", email: user.email ?? "", role: data?.perfil ?? "" };
}

export async function saveUserProfileName(name: string): Promise<void> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const normalizedName = name.trim();
  if (normalizedName.length < 2) throw new Error("Informe um nome com pelo menos 2 caracteres.");
  const user = await getCurrentUser();
  const { error } = await supabase.from("perfis").update({ nome: normalizedName }).eq("id", user.id);
  if (error) throw error;
}
