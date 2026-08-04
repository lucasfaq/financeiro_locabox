create table public.pastas_trabalho (
  id uuid primary key default gen_random_uuid(),
  departamento_id uuid not null references public.departamentos(id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 120),
  ativo boolean not null default true,
  criado_por uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (departamento_id, nome)
);

create table public.listas_trabalho (
  id uuid primary key default gen_random_uuid(),
  pasta_id uuid not null references public.pastas_trabalho(id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 120),
  ativo boolean not null default true,
  criado_por uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (pasta_id, nome)
);

alter table public.atividades_financeiras
  add column lista_id uuid references public.listas_trabalho(id) on delete set null;

create index pastas_trabalho_departamento_id_idx on public.pastas_trabalho (departamento_id);
create index listas_trabalho_pasta_id_idx on public.listas_trabalho (pasta_id);
create index atividades_financeiras_lista_id_idx on public.atividades_financeiras (lista_id);

grant select, insert, update, delete on table public.pastas_trabalho, public.listas_trabalho to authenticated;
alter table public.pastas_trabalho enable row level security;
alter table public.listas_trabalho enable row level security;

create policy "equipe le pastas" on public.pastas_trabalho for select to authenticated using (true);
create policy "financeiro cria pastas" on public.pastas_trabalho for insert to authenticated with check (criado_por = (select auth.uid()) and (select public.eh_financeiro_ou_acima()));
create policy "financeiro atualiza pastas" on public.pastas_trabalho for update to authenticated using ((select public.eh_financeiro_ou_acima())) with check ((select public.eh_financeiro_ou_acima()));
create policy "financeiro exclui pastas" on public.pastas_trabalho for delete to authenticated using ((select public.eh_financeiro_ou_acima()));

create policy "equipe le listas" on public.listas_trabalho for select to authenticated using (true);
create policy "financeiro cria listas" on public.listas_trabalho for insert to authenticated with check (criado_por = (select auth.uid()) and (select public.eh_financeiro_ou_acima()));
create policy "financeiro atualiza listas" on public.listas_trabalho for update to authenticated using ((select public.eh_financeiro_ou_acima())) with check ((select public.eh_financeiro_ou_acima()));
create policy "financeiro exclui listas" on public.listas_trabalho for delete to authenticated using ((select public.eh_financeiro_ou_acima()));
