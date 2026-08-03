alter table public.perfis
  add column if not exists ativo boolean not null default true;

create or replace function public.usuario_financeiro_ativo() returns boolean
language sql stable security invoker set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and ativo);
$$;

create or replace function public.eh_financeiro_ou_acima() returns boolean
language sql stable security invoker set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and ativo and perfil in ('administrador', 'financeiro', 'aprovador', 'diretoria'));
$$;

grant execute on function public.usuario_financeiro_ativo() to authenticated;
revoke execute on function public.usuario_financeiro_ativo() from public;

drop policy "usuarios autenticados leem cadastros" on public.empresas;
create policy "usuarios ativos leem cadastros" on public.empresas for select to authenticated using ((select public.usuario_financeiro_ativo()));

drop policy "usuarios leem centros de custo" on public.centros_custo;
create policy "usuarios ativos leem centros de custo" on public.centros_custo for select to authenticated using ((select public.usuario_financeiro_ativo()));

drop policy "usuarios leem fornecedores" on public.fornecedores;
create policy "usuarios ativos leem fornecedores" on public.fornecedores for select to authenticated using ((select public.usuario_financeiro_ativo()));

drop policy "equipe le atividades" on public.atividades_financeiras;
create policy "usuarios ativos leem atividades" on public.atividades_financeiras for select to authenticated using ((select public.usuario_financeiro_ativo()));

drop policy "equipe le aprovacoes" on public.aprovacoes_financeiras;
create policy "usuarios ativos leem aprovacoes" on public.aprovacoes_financeiras for select to authenticated using ((select public.usuario_financeiro_ativo()));

drop policy "equipe le auditoria" on public.historico_auditoria;
create policy "usuarios ativos leem auditoria" on public.historico_auditoria for select to authenticated using ((select public.usuario_financeiro_ativo()));

drop policy "equipe le departamentos" on public.departamentos;
create policy "usuarios ativos leem departamentos" on public.departamentos for select to authenticated using ((select public.usuario_financeiro_ativo()));

drop policy "equipe le pastas" on public.pastas_trabalho;
create policy "usuarios ativos leem pastas" on public.pastas_trabalho for select to authenticated using ((select public.usuario_financeiro_ativo()));

drop policy "equipe le listas" on public.listas_trabalho;
create policy "usuarios ativos leem listas" on public.listas_trabalho for select to authenticated using ((select public.usuario_financeiro_ativo()));

drop policy "equipe le subtarefas" on public.subtarefas_financeiras;
create policy "usuarios ativos leem subtarefas" on public.subtarefas_financeiras for select to authenticated using ((select public.usuario_financeiro_ativo()));

drop policy "equipe le comentarios" on public.comentarios_atividade;
create policy "usuarios ativos leem comentarios" on public.comentarios_atividade for select to authenticated using ((select public.usuario_financeiro_ativo()));

drop policy "equipe le anexos" on public.anexos_atividade;
create policy "usuarios ativos leem anexos" on public.anexos_atividade for select to authenticated using ((select public.usuario_financeiro_ativo()));

drop policy "equipe le anexos de atividades" on storage.objects;
create policy "usuarios ativos leem anexos de atividades" on storage.objects for select to authenticated using (bucket_id = 'anexos-atividades' and (select public.usuario_financeiro_ativo()));
