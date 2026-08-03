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

O acesso é por e-mail e senha. Os papéis disponíveis são `administrador`, `financeiro`, `aprovador`, `diretoria` e `consulta`; uma conta com `ativo = false` não pode usar a aplicação. Crie contas com senha em **Authentication > Users** no Supabase e atribua o papel na tabela `public.perfis`.

Antes do primeiro acesso com senha, aplique no SQL Editor do Supabase a migration `supabase/migrations/20260803135834_controle_acesso_por_papel.sql`. Depois crie o primeiro usuário em **Authentication > Users > Add user**, informando e-mail, senha temporária e confirmação de e-mail; em **Table Editor > perfis**, atribua `administrador` a essa conta. Os próximos usuários podem receber os demais papéis e ser bloqueados alterando `ativo` para `false`.

Toda tabela exposta usa RLS. A chave `service_role` nunca deve ser colocada em `.env` com prefixo `VITE_`, no GitHub Pages ou no frontend.

> O Supabase CLI não está instalado neste ambiente. Antes de aplicar migrations em produção, instale-o, autentique-se, revise as RLS policies e valide o banco em um projeto de teste. Não aplique credenciais ou migrations sem um projeto Supabase explicitamente escolhido.

As entidades `departamentos`, `canais`, `canal_membros` e `mensagens_canal` formam o núcleo colaborativo. As tarefas e suas visualizações pertencem ao departamento; os canais servem à comunicação, incluindo canal geral, canais departamentais e mensagens diretas. Todo canal privado só pode ser lido e usado por seus membros.

## GitHub Pages

Crie um repositório público chamado `financeiro_locabox`, envie este projeto e configure em **Settings > Pages** a fonte **GitHub Actions**. Em **Settings > Secrets and variables > Actions**:

- variável `VITE_SUPABASE_URL`;
- secret `VITE_SUPABASE_ANON_KEY`.

O workflow publica o frontend estático automaticamente após cada envio à branch `main`.

### Conectar e validar a publicação

1. No Supabase, abra o projeto `qeeqtbjwkppahjaaqekp` em **Settings > API Keys**. Copie a **Project URL** e a chave **Publishable** (ou a chave legada `anon`). Nunca copie `service_role` ou `sb_secret_...`.
2. No GitHub, abra `lucasfaq/financeiro_locabox` em **Settings > Secrets and variables > Actions**. Crie a variável `VITE_SUPABASE_URL` com a Project URL e o secret `VITE_SUPABASE_ANON_KEY` com a chave pública.
3. No Supabase, abra **Authentication > URL Configuration** e inclua exatamente `https://lucasfaq.github.io/financeiro_locabox/` em **Redirect URLs**. Mantenha também `http://localhost:5175/` para desenvolvimento.
4. No GitHub, execute novamente **Actions > Publicar piloto > Run workflow** (ou envie um commit à `main`). Aguarde a execução bem-sucedida.
5. Abra `https://lucasfaq.github.io/financeiro_locabox/`. A tela deve solicitar o e-mail corporativo, em vez de abrir o modo demonstrativo.
6. Peça um magic link, abra-o no mesmo navegador e confirme que retorna para `/financeiro_locabox/` já autenticado.
7. Valide: a árvore de departamentos carrega; crie uma atividade; altere o status; crie uma subtarefa e um comentário; anexe um PDF menor que 10 MB; abra o anexo. Em uma segunda sessão autenticada, confirme a atualização da atividade em tempo real.

Se a etapa 5 ainda abrir o modo demonstrativo, as variáveis não entraram no build do GitHub Actions. Confirme os nomes, reexecute o workflow e não crie arquivo `.env` no repositório.

## Migração HostGator

Na HostGator compartilhada, publique o conteúdo de `dist/` na pasta do subdomínio `financeiro.itplocabox.com.br`. Mantenha o Supabase como backend e adicione a URL de produção à lista de Redirect URLs/Auth URLs do Supabase. Não há necessidade de VPS nesta arquitetura.
