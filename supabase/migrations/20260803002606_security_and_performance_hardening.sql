-- Supabase's legacy defaults grant new public tables to anon/authenticated.
-- This application exposes data only to authenticated users governed by RLS.
revoke all on all tables in schema public from anon;
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

revoke all on function public.cria_perfil_ao_cadastrar_usuario() from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

-- Keep the first maintenance lookup and RLS access paths indexed.
create index aprovacoes_financeiras_atividade_id_idx on public.aprovacoes_financeiras (atividade_id);
create index aprovacoes_financeiras_aprovador_id_idx on public.aprovacoes_financeiras (aprovador_id);
create index atividades_financeiras_empresa_id_idx on public.atividades_financeiras (empresa_id);
create index atividades_financeiras_fornecedor_id_idx on public.atividades_financeiras (fornecedor_id);
create index atividades_financeiras_centro_custo_id_idx on public.atividades_financeiras (centro_custo_id);
create index atividades_financeiras_responsavel_id_idx on public.atividades_financeiras (responsavel_id);
create index atividades_financeiras_criado_por_idx on public.atividades_financeiras (criado_por);
create index atividades_financeiras_departamento_id_idx on public.atividades_financeiras (departamento_id);
create index canais_criado_por_idx on public.canais (criado_por);
create index canal_membros_usuario_id_idx on public.canal_membros (usuario_id);
create index mensagens_canal_canal_id_idx on public.mensagens_canal (canal_id);
create index mensagens_canal_autor_id_idx on public.mensagens_canal (autor_id);
create index mensagens_canal_tarefa_id_idx on public.mensagens_canal (tarefa_id);
create index historico_auditoria_atividade_id_idx on public.historico_auditoria (atividade_id);
create index historico_auditoria_autor_id_idx on public.historico_auditoria (autor_id);
create index paineis_tarefas_criado_por_idx on public.paineis_tarefas (criado_por);

-- Avoid overlapping permissive SELECT policies while keeping the same rules.
drop policy "administradores gerenciam empresas" on public.empresas;
create policy "administradores criam empresas" on public.empresas for insert to authenticated with check ((select public.eh_financeiro_ou_acima()));
create policy "administradores atualizam empresas" on public.empresas for update to authenticated using ((select public.eh_financeiro_ou_acima())) with check ((select public.eh_financeiro_ou_acima()));
create policy "administradores excluem empresas" on public.empresas for delete to authenticated using ((select public.eh_financeiro_ou_acima()));

drop policy "administracao gerencia departamentos" on public.departamentos;
create policy "administracao cria departamentos" on public.departamentos for insert to authenticated with check ((select public.eh_financeiro_ou_acima()));
create policy "administracao atualiza departamentos" on public.departamentos for update to authenticated using ((select public.eh_financeiro_ou_acima())) with check ((select public.eh_financeiro_ou_acima()));
create policy "administracao exclui departamentos" on public.departamentos for delete to authenticated using ((select public.eh_financeiro_ou_acima()));
;
