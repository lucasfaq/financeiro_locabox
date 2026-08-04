drop policy "usuarios ativos leem cadastros" on public.empresas;
create policy "usuarios vinculados leem empresas" on public.empresas for select to authenticated
  using ((select public.eh_administrador_ativo()) or exists (select 1 from public.usuario_empresas where usuario_id = (select auth.uid()) and empresa_id = empresas.id));

drop policy "usuarios ativos leem departamentos" on public.departamentos;
create policy "usuarios vinculados leem departamentos" on public.departamentos for select to authenticated
  using ((select public.eh_administrador_ativo()) or exists (select 1 from public.usuario_departamentos where usuario_id = (select auth.uid()) and departamento_id = departamentos.id));

drop policy "usuarios ativos leem pastas" on public.pastas_trabalho;
create policy "usuarios vinculados leem pastas" on public.pastas_trabalho for select to authenticated
  using ((select public.eh_administrador_ativo()) or exists (select 1 from public.usuario_departamentos where usuario_id = (select auth.uid()) and departamento_id = pastas_trabalho.departamento_id));

drop policy "usuarios ativos leem listas" on public.listas_trabalho;
create policy "usuarios vinculados leem listas" on public.listas_trabalho for select to authenticated
  using ((select public.eh_administrador_ativo()) or exists (select 1 from public.pastas_trabalho p join public.usuario_departamentos ud on ud.departamento_id = p.departamento_id where p.id = listas_trabalho.pasta_id and ud.usuario_id = (select auth.uid())));

drop policy "usuarios ativos leem atividades" on public.atividades_financeiras;
create policy "usuarios vinculados leem atividades" on public.atividades_financeiras for select to authenticated
  using ((select public.eh_administrador_ativo()) or exists (select 1 from public.usuario_empresas where usuario_id = (select auth.uid()) and empresa_id = atividades_financeiras.empresa_id));

drop policy "financeiro cria atividades" on public.atividades_financeiras;
create policy "usuarios vinculados criam atividades" on public.atividades_financeiras for insert to authenticated
  with check ((select public.eh_financeiro_ou_acima()) and criado_por = (select auth.uid()) and ((select public.eh_administrador_ativo()) or exists (select 1 from public.usuario_empresas where usuario_id = (select auth.uid()) and empresa_id = atividades_financeiras.empresa_id)));

drop policy "financeiro atualiza atividades" on public.atividades_financeiras;
create policy "usuarios vinculados atualizam atividades" on public.atividades_financeiras for update to authenticated
  using ((select public.eh_financeiro_ou_acima()) and ((select public.eh_administrador_ativo()) or exists (select 1 from public.usuario_empresas where usuario_id = (select auth.uid()) and empresa_id = atividades_financeiras.empresa_id)))
  with check ((select public.eh_financeiro_ou_acima()) and ((select public.eh_administrador_ativo()) or exists (select 1 from public.usuario_empresas where usuario_id = (select auth.uid()) and empresa_id = atividades_financeiras.empresa_id)));
