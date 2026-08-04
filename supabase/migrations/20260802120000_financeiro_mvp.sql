create type public.perfil_financeiro as enum ('administrador', 'financeiro', 'aprovador', 'diretoria', 'consulta');
create type public.status_atividade_financeira as enum ('rascunho', 'pendente', 'em_aprovacao', 'aprovado', 'executado', 'cancelado');

create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  perfil public.perfil_financeiro not null default 'consulta',
  created_at timestamptz not null default now()
);
create table public.centros_custo (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id), nome text not null, ativo boolean not null default true,
  unique (empresa_id, nome)
);
create table public.fornecedores (
  id uuid primary key default gen_random_uuid(), nome text not null, documento text, ativo boolean not null default true, created_at timestamptz not null default now()
);
create table public.atividades_financeiras (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id), fornecedor_id uuid references public.fornecedores(id), centro_custo_id uuid references public.centros_custo(id),
  titulo text not null check (char_length(titulo) between 3 and 160), descricao text, valor_previsto numeric(14,2) not null default 0 check (valor_previsto >= 0), vencimento date, prioridade text not null default 'media' check (prioridade in ('alta','media','baixa')),
  status public.status_atividade_financeira not null default 'pendente', responsavel_id uuid references auth.users(id), criado_por uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.aprovacoes_financeiras (
  id uuid primary key default gen_random_uuid(), atividade_id uuid not null references public.atividades_financeiras(id) on delete cascade, aprovador_id uuid not null references auth.users(id), decisao text check (decisao in ('aprovado','rejeitado','devolvido')), justificativa text, decidido_em timestamptz, created_at timestamptz not null default now()
);
create table public.historico_auditoria (
  id uuid primary key default gen_random_uuid(), atividade_id uuid references public.atividades_financeiras(id) on delete cascade, autor_id uuid references auth.users(id), evento text not null, detalhes jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

-- Data API access is opt-in on new Supabase projects. Keep anonymous access
-- disabled and let RLS decide which authenticated users can reach each row.
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.empresas, public.perfis,
  public.centros_custo, public.fornecedores, public.atividades_financeiras,
  public.aprovacoes_financeiras, public.historico_auditoria to authenticated;

alter table public.empresas enable row level security;
alter table public.perfis enable row level security;
alter table public.centros_custo enable row level security;
alter table public.fornecedores enable row level security;
alter table public.atividades_financeiras enable row level security;
alter table public.aprovacoes_financeiras enable row level security;
alter table public.historico_auditoria enable row level security;

create function public.eh_financeiro_ou_acima() returns boolean language sql stable security invoker set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and perfil in ('administrador','financeiro','aprovador','diretoria'));
$$;
grant execute on function public.eh_financeiro_ou_acima() to authenticated;
revoke execute on function public.eh_financeiro_ou_acima() from public;

create function public.cria_perfil_ao_cadastrar_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), new.email, 'Usuário'));
  return new;
end;
$$;
revoke execute on function public.cria_perfil_ao_cadastrar_usuario() from public;
create trigger usuarios_criam_perfil
  after insert on auth.users
  for each row execute function public.cria_perfil_ao_cadastrar_usuario();
create policy "usuarios autenticados leem cadastros" on public.empresas for select to authenticated using (true);
create policy "administradores gerenciam empresas" on public.empresas for all to authenticated using ((select public.eh_financeiro_ou_acima())) with check ((select public.eh_financeiro_ou_acima()));
create policy "usuarios leem proprio perfil" on public.perfis for select to authenticated using (id = (select auth.uid()));
create policy "usuarios leem centros de custo" on public.centros_custo for select to authenticated using (true);
create policy "usuarios leem fornecedores" on public.fornecedores for select to authenticated using (true);
create policy "financeiro cria fornecedores" on public.fornecedores for insert to authenticated with check ((select public.eh_financeiro_ou_acima()));
create policy "equipe le atividades" on public.atividades_financeiras for select to authenticated using (true);
create policy "financeiro cria atividades" on public.atividades_financeiras for insert to authenticated with check ((select public.eh_financeiro_ou_acima()) and criado_por = (select auth.uid()));
create policy "financeiro atualiza atividades" on public.atividades_financeiras for update to authenticated using ((select public.eh_financeiro_ou_acima())) with check ((select public.eh_financeiro_ou_acima()));
create policy "equipe le aprovacoes" on public.aprovacoes_financeiras for select to authenticated using (true);
create policy "aprovadores registram decisoes" on public.aprovacoes_financeiras for insert to authenticated with check ((select public.eh_financeiro_ou_acima()) and aprovador_id = (select auth.uid()));
create policy "equipe le auditoria" on public.historico_auditoria for select to authenticated using (true);
create policy "equipe registra auditoria" on public.historico_auditoria for insert to authenticated with check (autor_id = (select auth.uid()));

create or replace function public.atualiza_data_modificacao() returns trigger language plpgsql security invoker set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;
revoke execute on function public.atualiza_data_modificacao() from public;
create trigger atividades_atualiza_data before update on public.atividades_financeiras for each row execute function public.atualiza_data_modificacao();
