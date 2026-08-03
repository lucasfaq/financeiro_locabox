create table public.departamentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  descricao text,
  cor text not null default '#1c7354',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.canais (
  id uuid primary key default gen_random_uuid(),
  departamento_id uuid references public.departamentos(id),
  nome text not null,
  descricao text,
  tipo text not null default 'departamento' check (tipo in ('departamento', 'geral', 'direto')),
  privado boolean not null default false,
  criado_por uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique nulls not distinct (departamento_id, nome),
  check ((tipo = 'departamento' and departamento_id is not null) or (tipo in ('geral', 'direto')))
);
create table public.canal_membros (
  canal_id uuid not null references public.canais(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (canal_id, usuario_id)
);
create table public.mensagens_canal (
  id uuid primary key default gen_random_uuid(),
  canal_id uuid not null references public.canais(id) on delete cascade,
  autor_id uuid not null references auth.users(id),
  conteudo text not null check (char_length(conteudo) between 1 and 4000),
  tarefa_id uuid references public.atividades_financeiras(id),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
alter table public.atividades_financeiras add column departamento_id uuid references public.departamentos(id);
grant select, insert, update, delete on table public.departamentos, public.canais,
  public.canal_membros, public.mensagens_canal to authenticated;
alter table public.departamentos enable row level security;
alter table public.canais enable row level security;
alter table public.canal_membros enable row level security;
alter table public.mensagens_canal enable row level security;
create policy "equipe le departamentos" on public.departamentos for select to authenticated using (true);
create policy "administracao gerencia departamentos" on public.departamentos for all to authenticated using ((select public.eh_financeiro_ou_acima())) with check ((select public.eh_financeiro_ou_acima()));
create policy "membros leem canais" on public.canais for select to authenticated using (not privado or exists (select 1 from public.canal_membros where canal_id = id and usuario_id = (select auth.uid())));
create policy "equipe cria canais" on public.canais for insert to authenticated with check ((select public.eh_financeiro_ou_acima()) and criado_por = (select auth.uid()));
create policy "membros leem membros" on public.canal_membros for select to authenticated using (exists (select 1 from public.canal_membros cm where cm.canal_id = canal_membros.canal_id and cm.usuario_id = (select auth.uid())));
create policy "membros leem mensagens" on public.mensagens_canal for select to authenticated using (exists (select 1 from public.canal_membros where canal_id = mensagens_canal.canal_id and usuario_id = (select auth.uid())));
create policy "membros enviam mensagens" on public.mensagens_canal for insert to authenticated with check (autor_id = (select auth.uid()) and exists (select 1 from public.canal_membros where canal_id = mensagens_canal.canal_id and usuario_id = (select auth.uid())));
create policy "membros editam propria mensagem" on public.mensagens_canal for update to authenticated using (autor_id = (select auth.uid())) with check (autor_id = (select auth.uid()));
