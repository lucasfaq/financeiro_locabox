alter table public.atividades_financeiras
  add column categoria text not null default 'Financeiro'
  check (char_length(categoria) between 2 and 80);
