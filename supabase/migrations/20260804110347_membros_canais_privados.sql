create or replace function private.eh_gestor_canal(canal uuid) returns boolean
language sql stable security definer set search_path = public, private as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.canais
    where id = canal
      and (criado_por = (select auth.uid()) or (select public.eh_administrador_ativo()))
  );
$$;
revoke all on function private.eh_gestor_canal(uuid) from public;
grant execute on function private.eh_gestor_canal(uuid) to authenticated;

create or replace function private.usuario_canal_ativo(usuario uuid) returns boolean
language sql stable security definer set search_path = public, private as $$
  select exists (select 1 from public.perfis where id = usuario and ativo);
$$;
revoke all on function private.usuario_canal_ativo(uuid) from public;
grant execute on function private.usuario_canal_ativo(uuid) to authenticated;

drop policy "membros ativos leem membros do canal" on public.canal_membros;
create policy "membros e gestores ativos leem membros do canal" on public.canal_membros for select to authenticated
  using (
    (select public.usuario_financeiro_ativo())
    and (usuario_id = (select auth.uid()) or (select private.eh_membro_canal(canal_id)) or (select private.eh_gestor_canal(canal_id)))
  );

create policy "gestores adicionam membros ativos" on public.canal_membros for insert to authenticated
  with check (
    (select public.usuario_financeiro_ativo())
    and (select private.eh_gestor_canal(canal_id))
    and (select private.usuario_canal_ativo(usuario_id))
  );

create policy "gestores removem membros" on public.canal_membros for delete to authenticated
  using ((select public.usuario_financeiro_ativo()) and (select private.eh_gestor_canal(canal_id)));
