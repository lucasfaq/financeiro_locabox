create table public.preferencias_usuario (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  fuso_horario text not null default 'America/Fortaleza',
  inicio_semana text not null default 'segunda' check (inicio_semana in ('domingo', 'segunda')),
  notificacoes_navegador boolean not null default true,
  updated_at timestamptz not null default now()
);

grant select, insert, update on table public.preferencias_usuario to authenticated;
alter table public.preferencias_usuario enable row level security;
create policy "usuarios leem preferencias proprias" on public.preferencias_usuario for select to authenticated using ((select auth.uid()) = usuario_id);
create policy "usuarios criam preferencias proprias" on public.preferencias_usuario for insert to authenticated with check ((select auth.uid()) = usuario_id);
create policy "usuarios atualizam preferencias proprias" on public.preferencias_usuario for update to authenticated using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);

create policy "usuarios atualizam proprio perfil" on public.perfis for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
