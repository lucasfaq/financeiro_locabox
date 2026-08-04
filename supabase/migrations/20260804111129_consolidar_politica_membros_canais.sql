drop policy "criador entra no proprio canal" on public.canal_membros;
drop policy "gestores adicionam membros ativos" on public.canal_membros;

create policy "criadores e gestores adicionam membros ativos" on public.canal_membros for insert to authenticated
  with check (
    (select public.usuario_financeiro_ativo())
    and (select private.usuario_canal_ativo(usuario_id))
    and (
      (select private.eh_gestor_canal(canal_id))
      or (
        usuario_id = (select auth.uid())
        and exists (select 1 from public.canais where id = canal_id and criado_por = (select auth.uid()))
      )
    )
  );
