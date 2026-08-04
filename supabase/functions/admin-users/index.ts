import { createClient } from "npm:@supabase/supabase-js@2";

const profiles = ["administrador", "financeiro", "aprovador", "diretoria", "consulta"] as const;
type Profile = typeof profiles[number];
const allowedOrigins = new Set(["https://lucasfaq.github.io", "http://localhost:5175"]);

function response(body: unknown, status = 200, origin = "") {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" } });
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin") ?? "";
  const corsOrigin = allowedOrigins.has(origin) ? origin : "";
  if (request.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": corsOrigin, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" } });
  if (request.method !== "POST") return response({ error: "Método não permitido." }, 405, corsOrigin);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");
  if (!url || !anonKey || !serviceRoleKey || !authorization) return response({ error: "Configuração ou autenticação ausente." }, 401, corsOrigin);

  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const adminClient = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = authorization.replace(/^Bearer\s+/i, "");
  const { data: authData, error: authError } = await userClient.auth.getUser(token);
  if (authError || !authData.user) return response({ error: "Sessão inválida." }, 401, corsOrigin);
  const { data: caller } = await adminClient.from("perfis").select("perfil,ativo").eq("id", authData.user.id).maybeSingle();
  if (!caller?.ativo) return response({ error: "Acesso restrito a usuários ativos." }, 403, corsOrigin);

  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return response({ error: "Corpo inválido." }, 400, corsOrigin); }
  const action = String(input.action ?? "");

  if (action === "directory") {
    const { data, error } = await adminClient.from("perfis").select("id,nome").eq("ativo", true).order("nome");
    return error ? response({ error: error.message }, 400, corsOrigin) : response({ users: data ?? [] }, 200, corsOrigin);
  }

  if (caller.perfil !== "administrador") return response({ error: "Acesso restrito a administradores ativos." }, 403, corsOrigin);

  if (action === "list") {
    const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return response({ error: error.message }, 400, corsOrigin);
    const { data: profileRows, error: profileError } = await adminClient.from("perfis").select("id,nome,perfil,ativo");
    if (profileError) return response({ error: profileError.message }, 400, corsOrigin);
    const byId = new Map((profileRows ?? []).map((profile) => [profile.id, profile]));
    return response({ users: data.users.map((user) => ({ id: user.id, email: user.email ?? "", lastSignInAt: user.last_sign_in_at, profile: byId.get(user.id) ?? null })) }, 200, corsOrigin);
  }

  const email = String(input.email ?? "").trim().toLowerCase();
  const password = String(input.password ?? "");
  const name = String(input.name ?? "").trim();
  const profile = profiles.includes(input.profile as Profile) ? input.profile as Profile : "consulta";
  if (action === "create") {
    if (!email || !name || password.length < 8) return response({ error: "Informe nome, e-mail e senha com ao menos 8 caracteres." }, 400, corsOrigin);
    const { data, error } = await adminClient.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
    if (error || !data.user) return response({ error: error?.message ?? "Não foi possível criar usuário." }, 400, corsOrigin);
    const { error: profileError } = await adminClient.from("perfis").update({ nome: name, perfil: profile, ativo: true }).eq("id", data.user.id);
    if (profileError) { await adminClient.auth.admin.deleteUser(data.user.id); return response({ error: profileError.message }, 400, corsOrigin); }
    return response({ id: data.user.id }, 201, corsOrigin);
  }

  const userId = String(input.userId ?? "");
  if (!userId) return response({ error: "Usuário não informado." }, 400, corsOrigin);
  if (userId === authData.user.id && (input.active === false || profile !== "administrador")) return response({ error: "Você não pode remover ou reduzir seu próprio acesso administrativo." }, 400, corsOrigin);
  if (action === "update") {
    const active = input.active === true;
    const { error } = await adminClient.from("perfis").update({ nome: name, perfil: profile, ativo: active }).eq("id", userId);
    if (error) return response({ error: error.message }, 400, corsOrigin);
    const { error: banError } = await adminClient.auth.admin.updateUserById(userId, { ban_duration: active ? "none" : "876000h" });
    return banError ? response({ error: banError.message }, 400, corsOrigin) : response({ ok: true }, 200, corsOrigin);
  }
  if (action === "set_password") {
    if (password.length < 8) return response({ error: "A senha deve ter ao menos 8 caracteres." }, 400, corsOrigin);
    const { error } = await adminClient.auth.admin.updateUserById(userId, { password });
    return error ? response({ error: error.message }, 400, corsOrigin) : response({ ok: true }, 200, corsOrigin);
  }
  return response({ error: "Ação desconhecida." }, 400, corsOrigin);
});
