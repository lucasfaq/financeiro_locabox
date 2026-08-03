# Financeiro ITP-Locabox

MVP de plataforma de trabalho da ITP-Locabox. O Financeiro é o primeiro departamento, com atividades e aprovações próprias. A interface seguirá o modelo aprovado de departamentos, canais de comunicação e acompanhamento de tarefas, sem reproduzir código ou identidade de terceiros.

O acompanhamento detalhado do MVP está em [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md).

## Executar localmente

```powershell
npm install
npm run dev
```

Acesse `http://localhost:5175`. Sem `.env`, a interface abre em modo local persistente: tarefas, canais, departamentos, mensagens, documentos, templates e Caixa de Entrada permanecem neste navegador, mas não são compartilhados com outros usuários.

## Supabase

1. Crie um projeto Supabase exclusivo para o Financeiro.
2. Execute as migrations em ordem pelo SQL Editor ou Supabase CLI.
3. Copie `.env.example` para `.env` e preencha somente a URL e a chave pública do projeto.
4. Crie os usuários por convite e atualize seus perfis na tabela `public.perfis` usando o Dashboard/controle administrativo futuro.

Toda tabela exposta usa RLS. A chave `service_role` nunca deve ser colocada em `.env` com prefixo `VITE_`, no GitHub Pages ou no frontend.

> O Supabase CLI não está instalado neste ambiente. Antes de aplicar migrations em produção, instale-o, autentique-se, revise as RLS policies e valide o banco em um projeto de teste. Não aplique credenciais ou migrations sem um projeto Supabase explicitamente escolhido.

As entidades `departamentos`, `canais`, `canal_membros` e `mensagens_canal` formam o núcleo colaborativo. As tarefas e suas visualizações pertencem ao departamento; os canais servem à comunicação, incluindo canal geral, canais departamentais e mensagens diretas. Todo canal privado só pode ser lido e usado por seus membros.

## GitHub Pages

Crie um repositório público chamado `financeiro_locabox`, envie este projeto e configure em **Settings > Pages** a fonte **GitHub Actions**. Em **Settings > Secrets and variables > Actions**:

- variável `VITE_SUPABASE_URL`;
- secret `VITE_SUPABASE_ANON_KEY`.

O workflow publica o frontend estático automaticamente após cada envio à branch `main`.

## Migração HostGator

Na HostGator compartilhada, publique o conteúdo de `dist/` na pasta do subdomínio `financeiro.itplocabox.com.br`. Mantenha o Supabase como backend e adicione a URL de produção à lista de Redirect URLs/Auth URLs do Supabase. Não há necessidade de VPS nesta arquitetura.
