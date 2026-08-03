alter table public.atividades_financeiras
  add column inicio date,
  add column tipo text not null default 'tarefa' check (tipo in ('tarefa', 'aprovacao', 'financeiro')),
  add column arquivada_em timestamptz;

create table public.subtarefas_financeiras (
  id uuid primary key default gen_random_uuid(),
  atividade_id uuid not null references public.atividades_financeiras(id) on delete cascade,
  titulo text not null check (char_length(titulo) between 1 and 300),
  concluida boolean not null default false,
  ordem integer not null default 0,
  criado_por uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.comentarios_atividade (
  id uuid primary key default gen_random_uuid(),
  atividade_id uuid not null references public.atividades_financeiras(id) on delete cascade,
  autor_id uuid not null references auth.users(id),
  conteudo text not null check (char_length(conteudo) between 1 and 4000),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create table public.anexos_atividade (
  id uuid primary key default gen_random_uuid(),
  atividade_id uuid not null references public.atividades_financeiras(id) on delete cascade,
  autor_id uuid not null references auth.users(id),
  bucket_id text not null,
  caminho text not null,
  nome text not null,
  tipo_mime text,
  tamanho_bytes bigint check (tamanho_bytes >= 0),
  created_at timestamptz not null default now(),
  unique (bucket_id, caminho)
);

create index subtarefas_financeiras_atividade_id_idx on public.subtarefas_financeiras (atividade_id);
create index subtarefas_financeiras_criado_por_idx on public.subtarefas_financeiras (criado_por);
create index comentarios_atividade_atividade_id_idx on public.comentarios_atividade (atividade_id);
create index comentarios_atividade_autor_id_idx on public.comentarios_atividade (autor_id);
create index anexos_atividade_atividade_id_idx on public.anexos_atividade (atividade_id);
create index anexos_atividade_autor_id_idx on public.anexos_atividade (autor_id);

grant select, insert, update, delete on table public.subtarefas_financeiras, public.comentarios_atividade, public.anexos_atividade to authenticated;
alter table public.subtarefas_financeiras enable row level security;
alter table public.comentarios_atividade enable row level security;
alter table public.anexos_atividade enable row level security;

create policy "equipe le subtarefas" on public.subtarefas_financeiras for select to authenticated using (true);
create policy "financeiro cria subtarefas" on public.subtarefas_financeiras for insert to authenticated with check (criado_por = (select auth.uid()) and (select public.eh_financeiro_ou_acima()));
create policy "financeiro atualiza subtarefas" on public.subtarefas_financeiras for update to authenticated using ((select public.eh_financeiro_ou_acima())) with check ((select public.eh_financeiro_ou_acima()));
create policy "financeiro exclui subtarefas" on public.subtarefas_financeiras for delete to authenticated using ((select public.eh_financeiro_ou_acima()));

create policy "equipe le comentarios" on public.comentarios_atividade for select to authenticated using (true);
create policy "equipe cria comentarios" on public.comentarios_atividade for insert to authenticated with check (autor_id = (select auth.uid()));
create policy "autor atualiza comentario" on public.comentarios_atividade for update to authenticated using (autor_id = (select auth.uid())) with check (autor_id = (select auth.uid()));
create policy "autor exclui comentario" on public.comentarios_atividade for delete to authenticated using (autor_id = (select auth.uid()));

create policy "equipe le anexos" on public.anexos_atividade for select to authenticated using (true);
create policy "equipe registra anexos" on public.anexos_atividade for insert to authenticated with check (autor_id = (select auth.uid()));
create policy "autor exclui anexo" on public.anexos_atividade for delete to authenticated using (autor_id = (select auth.uid()));
