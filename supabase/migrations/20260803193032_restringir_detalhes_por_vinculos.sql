drop policy "usuarios ativos leem aprovacoes" on public.aprovacoes_financeiras;
create policy "usuarios vinculados leem aprovacoes" on public.aprovacoes_financeiras for select to authenticated
  using (exists (select 1 from public.atividades_financeiras where id = aprovacoes_financeiras.atividade_id));

drop policy "usuarios ativos leem auditoria" on public.historico_auditoria;
create policy "usuarios vinculados leem auditoria" on public.historico_auditoria for select to authenticated
  using (atividade_id is null or exists (select 1 from public.atividades_financeiras where id = historico_auditoria.atividade_id));

drop policy "usuarios ativos leem subtarefas" on public.subtarefas_financeiras;
create policy "usuarios vinculados leem subtarefas" on public.subtarefas_financeiras for select to authenticated
  using (exists (select 1 from public.atividades_financeiras where id = subtarefas_financeiras.atividade_id));

drop policy "usuarios ativos leem comentarios" on public.comentarios_atividade;
create policy "usuarios vinculados leem comentarios" on public.comentarios_atividade for select to authenticated
  using (exists (select 1 from public.atividades_financeiras where id = comentarios_atividade.atividade_id));

drop policy "usuarios ativos leem anexos" on public.anexos_atividade;
create policy "usuarios vinculados leem anexos" on public.anexos_atividade for select to authenticated
  using (exists (select 1 from public.atividades_financeiras where id = anexos_atividade.atividade_id));

drop policy "usuarios ativos leem anexos de atividades" on storage.objects;
create policy "usuarios vinculados leem anexos de atividades" on storage.objects for select to authenticated
  using (bucket_id = 'anexos-atividades' and exists (select 1 from public.anexos_atividade where bucket_id = storage.objects.bucket_id and caminho = storage.objects.name));
