drop policy "membros ativos leem mensagens" on public.mensagens_canal;
create policy "usuarios ativos leem mensagens permitidas" on public.mensagens_canal for select to authenticated
  using (
    (select public.usuario_financeiro_ativo()) and exists (
      select 1 from public.canais
      where id = canal_id and (not privado or (select private.eh_membro_canal(id)))
    )
  );
drop policy "membros ativos enviam mensagens" on public.mensagens_canal;
create policy "usuarios ativos enviam mensagens permitidas" on public.mensagens_canal for insert to authenticated
  with check (
    autor_id = (select auth.uid()) and (select public.usuario_financeiro_ativo()) and exists (
      select 1 from public.canais
      where id = canal_id and (not privado or (select private.eh_membro_canal(id)))
    )
  );;
