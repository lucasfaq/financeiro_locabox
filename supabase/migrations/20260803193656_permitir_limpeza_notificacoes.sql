create policy "usuario exclui proprias notificacoes lidas" on public.notificacoes for delete to authenticated
  using (destinatario_id = (select auth.uid()) and lida_em is not null);
