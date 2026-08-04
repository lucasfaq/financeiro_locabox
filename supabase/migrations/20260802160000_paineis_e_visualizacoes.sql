create type public.tipo_visualizacao as enum ('lista', 'quadro', 'calendario', 'gantt');
create table public.paineis_tarefas (
  id uuid primary key default gen_random_uuid(),
  departamento_id uuid not null references public.departamentos(id) on delete cascade,
  nome text not null,
  tipo public.tipo_visualizacao not null,
  configuracao jsonb not null default '{}'::jsonb,
  criado_por uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (departamento_id, nome)
);
grant select, insert, update, delete on table public.paineis_tarefas to authenticated;
alter table public.paineis_tarefas enable row level security;
create policy "equipe le paineis do departamento" on public.paineis_tarefas for select to authenticated using (true);
create policy "equipe cria paineis no departamento" on public.paineis_tarefas for insert to authenticated with check (criado_por = (select auth.uid()));
create policy "criador altera proprio painel" on public.paineis_tarefas for update to authenticated using (criado_por = (select auth.uid())) with check (criado_por = (select auth.uid()));
