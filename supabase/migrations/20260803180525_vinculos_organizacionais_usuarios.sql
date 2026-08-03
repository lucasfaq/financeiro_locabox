create or replace function public.eh_administrador_ativo() returns boolean
language sql stable security invoker set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and ativo and perfil = 'administrador');
$$;
grant execute on function public.eh_administrador_ativo() to authenticated;
revoke execute on function public.eh_administrador_ativo() from public;

create table public.usuario_empresas (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (usuario_id, empresa_id)
);
create table public.usuario_departamentos (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  departamento_id uuid not null references public.departamentos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (usuario_id, departamento_id)
);
create index usuario_empresas_empresa_id_idx on public.usuario_empresas(empresa_id);
create index usuario_departamentos_departamento_id_idx on public.usuario_departamentos(departamento_id);

grant select, insert, delete on public.usuario_empresas, public.usuario_departamentos to authenticated;
alter table public.usuario_empresas enable row level security;
alter table public.usuario_departamentos enable row level security;

create policy "usuarios leem proprias empresas" on public.usuario_empresas for select to authenticated
  using (usuario_id = (select auth.uid()) or (select public.eh_administrador_ativo()));
create policy "administradores gerenciam usuario_empresas" on public.usuario_empresas for all to authenticated
  using ((select public.eh_administrador_ativo())) with check ((select public.eh_administrador_ativo()));
create policy "usuarios leem proprios departamentos" on public.usuario_departamentos for select to authenticated
  using (usuario_id = (select auth.uid()) or (select public.eh_administrador_ativo()));
create policy "administradores gerenciam usuario_departamentos" on public.usuario_departamentos for all to authenticated
  using ((select public.eh_administrador_ativo())) with check ((select public.eh_administrador_ativo()));
