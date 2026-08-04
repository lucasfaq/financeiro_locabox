create table public.documentos_trabalho (
  id uuid primary key default gen_random_uuid(), departamento_id uuid references public.departamentos(id) on delete set null,
  titulo text not null check (char_length(titulo) between 1 and 240), conteudo text not null default '',
  criado_por uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.templates_trabalho (
  id uuid primary key default gen_random_uuid(), departamento_id uuid references public.departamentos(id) on delete set null,
  nome text not null check (char_length(nome) between 2 and 160), categoria text not null, descricao text not null default '', configuracao jsonb not null default '{}'::jsonb,
  criado_por uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.notificacoes (
  id uuid primary key default gen_random_uuid(), destinatario_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null, titulo text not null, detalhe text, url_destino text, prioridade boolean not null default false, lida_em timestamptz, created_at timestamptz not null default now()
);
create index documentos_trabalho_departamento_id_idx on public.documentos_trabalho (departamento_id);
create index documentos_trabalho_criado_por_idx on public.documentos_trabalho (criado_por);
create index templates_trabalho_departamento_id_idx on public.templates_trabalho (departamento_id);
create index templates_trabalho_criado_por_idx on public.templates_trabalho (criado_por);
create index notificacoes_destinatario_id_created_at_idx on public.notificacoes (destinatario_id, created_at desc);
grant select, insert, update, delete on table public.documentos_trabalho, public.templates_trabalho, public.notificacoes to authenticated;
alter table public.documentos_trabalho enable row level security;
alter table public.templates_trabalho enable row level security;
alter table public.notificacoes enable row level security;
create policy "equipe le documentos" on public.documentos_trabalho for select to authenticated using (true);
create policy "equipe cria documentos" on public.documentos_trabalho for insert to authenticated with check (criado_por = (select auth.uid()));
create policy "autor atualiza documentos" on public.documentos_trabalho for update to authenticated using (criado_por = (select auth.uid())) with check (criado_por = (select auth.uid()));
create policy "autor exclui documentos" on public.documentos_trabalho for delete to authenticated using (criado_por = (select auth.uid()));
create policy "equipe le templates" on public.templates_trabalho for select to authenticated using (true);
create policy "equipe cria templates" on public.templates_trabalho for insert to authenticated with check (criado_por = (select auth.uid()));
create policy "autor atualiza templates" on public.templates_trabalho for update to authenticated using (criado_por = (select auth.uid())) with check (criado_por = (select auth.uid()));
create policy "autor exclui templates" on public.templates_trabalho for delete to authenticated using (criado_por = (select auth.uid()));
create policy "usuario le proprias notificacoes" on public.notificacoes for select to authenticated using (destinatario_id = (select auth.uid()));
create policy "usuario atualiza proprias notificacoes" on public.notificacoes for update to authenticated using (destinatario_id = (select auth.uid())) with check (destinatario_id = (select auth.uid()));
;
