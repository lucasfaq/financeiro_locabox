create schema if not exists private;

create or replace function private.eh_membro_canal(canal uuid) returns boolean
language sql stable security definer set search_path = public, private as $$
  select exists (
    select 1 from public.canal_membros
    where canal_id = canal and usuario_id = (select auth.uid())
  );
$$;
revoke all on function private.eh_membro_canal(uuid) from public;
grant execute on function private.eh_membro_canal(uuid) to authenticated;

drop policy "membros leem canais" on public.canais;
create policy "usuarios ativos leem canais permitidos" on public.canais for select to authenticated
  using ((select public.usuario_financeiro_ativo()) and (not privado or (select private.eh_membro_canal(id))));

drop policy "membros leem membros" on public.canal_membros;
create policy "membros ativos leem membros do canal" on public.canal_membros for select to authenticated
  using ((select public.usuario_financeiro_ativo()) and (usuario_id = (select auth.uid()) or (select private.eh_membro_canal(canal_id))));
create policy "criador entra no proprio canal" on public.canal_membros for insert to authenticated
  with check (usuario_id = (select auth.uid()) and exists (select 1 from public.canais where id = canal_id and criado_por = (select auth.uid())));

drop policy "membros leem mensagens" on public.mensagens_canal;
create policy "membros ativos leem mensagens" on public.mensagens_canal for select to authenticated
  using ((select public.usuario_financeiro_ativo()) and (select private.eh_membro_canal(canal_id)));
drop policy "membros enviam mensagens" on public.mensagens_canal;
create policy "membros ativos enviam mensagens" on public.mensagens_canal for insert to authenticated
  with check (autor_id = (select auth.uid()) and (select private.eh_membro_canal(canal_id)));

alter publication supabase_realtime add table public.canais;
alter publication supabase_realtime add table public.canal_membros;
