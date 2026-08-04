alter table public.notificacoes add column adiada_ate timestamptz;
create index notificacoes_destinatario_adiada_ate_idx on public.notificacoes (destinatario_id, adiada_ate) where adiada_ate is not null;
