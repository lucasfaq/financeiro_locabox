create or replace function private.notificar_atividade_atribuida() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  if new.responsavel_id is not null
    and new.responsavel_id <> new.criado_por
    and (tg_op = 'INSERT' or new.responsavel_id is distinct from old.responsavel_id) then
    insert into public.notificacoes (destinatario_id, tipo, titulo, detalhe, url_destino, prioridade)
    values (new.responsavel_id, 'tarefa', 'Nova atividade atribuída', new.titulo, '/atividades/' || new.id, new.prioridade = 'alta');
  end if;
  return new;
end;
$$;
revoke all on function private.notificar_atividade_atribuida() from public, anon, authenticated;

create or replace function private.notificar_decisao_aprovacao() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare atividade record; acao text;
begin
  select id, titulo, criado_por, prioridade into atividade from public.atividades_financeiras where id = new.atividade_id;
  if atividade.criado_por is not null and atividade.criado_por <> new.aprovador_id then
    acao := case new.decisao when 'aprovado' then 'aprovada' when 'devolvido' then 'devolvida' else 'rejeitada' end;
    insert into public.notificacoes (destinatario_id, tipo, titulo, detalhe, url_destino, prioridade)
    values (atividade.criado_por, 'tarefa', 'Aprovação ' || acao, atividade.titulo, '/atividades/' || atividade.id, atividade.prioridade = 'alta');
  end if;
  return new;
end;
$$;
revoke all on function private.notificar_decisao_aprovacao() from public, anon, authenticated;

create trigger atividades_notificam_atribuicao after insert or update of responsavel_id on public.atividades_financeiras
for each row execute function private.notificar_atividade_atribuida();
create trigger aprovacoes_notificam_decisao after insert on public.aprovacoes_financeiras
for each row execute function private.notificar_decisao_aprovacao();
