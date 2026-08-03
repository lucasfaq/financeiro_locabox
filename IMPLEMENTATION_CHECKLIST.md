---
title: Checklist de implementação — Plataforma colaborativa ITP/Locabox
updated: 2026-08-02
status: em_andamento
sources:
  - README.md
  - src/App.tsx
  - supabase/migrations/
  - ../../memory/conversations/2026-08-02_handoff_mvp-plataforma-colaborativa_continuacao.md
  - Mapeamento read-only do Hoppe em 2026-08-02
related:
  - README.md
  - ../../shared/agents/agente-navegacao.md
---

# Checklist de implementação

Legenda: `[x]` funcional no MVP local; `[-]` demonstrativo/local ou parcialmente funcional; `[ ]` ainda não implementado. O objetivo é reproduzir capacidades e fluxos, nunca código, identidade visual ou conteúdo de terceiros.

## 1. Base da aplicação

- [x] React, Vite e TypeScript configurados.
- [x] Persistência local por navegador com `localStorage`.
- [x] Interface responsiva inicial e identidade ITP/Locabox.
- [x] Lint e build aprovados.
- [-] Cliente Supabase, migrations e carregamento autenticado da hierarquia (departamentos, pastas e listas) aplicados; tarefas e demais módulos ainda usam o fallback local.
- [x] Projeto Supabase de teste escolhido e conectado (`qeeqtbjwkppahjaaqekp`).
- [ ] Auth, RLS, Realtime e Storage validados em ambiente de teste.
- [ ] Observabilidade, tratamento de erros, auditoria e backups.
- [ ] Testes automatizados de unidade, integração e interface.

## 2. Organização do trabalho

- [-] Departamentos, pastas e listas carregam do Supabase para sessões autenticadas, com fallback local de demonstração.
- [x] Árvore expansível Departamento → Pasta → Lista.
- [x] Criar, renomear e excluir departamento/pasta localmente.
- [x] Criar listas com ID persistente.
- [x] Tarefas vinculadas a uma lista e contagem por lista.
- [-] Menus de departamento/pasta: status, template e permissões apenas locais.
- [ ] Menus completos para listas (renomear, status, template, permissões, exclusão).
- [ ] Reordenação por arrastar e soltar.
- [ ] Arquivamento/restauração em vez de exclusão definitiva.
- [ ] Permissões reais por empresa, departamento, pasta e lista.

## 3. Tarefas e aprovações

- [x] Criar tarefa em branco com lista, título, tipo e campos financeiros.
- [x] Status, prioridade, responsável, vencimento, empresa, categoria e valor demonstrativos.
- [x] Aprovar ou devolver atividade localmente.
- [x] Filtro por status e busca local por título.
- [x] Visões locais: Lista, Quadro, Calendário e Gantt.
- [-] Aba “A partir de template” leva à biblioteca, sem preencher uma tarefa a partir do modelo.
- [-] Calendário e Gantt são visões demonstrativas, sem datas/intervalos reais.
- [-] Página/painel de detalhe da tarefa local com subtarefas e comentários; persistência será conectada ao registro autenticado.
- [-] Subtarefas, comentários e metadados de anexos persistentes modelados no Supabase; descrição rica, responsáveis múltiplos, etiquetas e dependências continuam pendentes.
- [ ] Datas reais de início, vencimento, recorrência e alertas.
- [-] Comentários e subtarefas persistentes modelados; falta conectar a interface, menções e progresso calculado.
- [-] Subtarefas persistentes e progresso calculado: schema pronto, cálculo e integração pendentes.
- [ ] Filtros avançados combináveis, ordenação, grupos e colunas configuráveis.
- [ ] Tarefas fechadas/arquivadas e recuperação.
- [ ] Aprovações com regras, alçadas, evidências e trilha de decisão.

## 4. Visualizações e painéis

- [x] Navegação entre Lista, Quadro, Calendário e Gantt.
- [-] Botão de nova visualização apenas informa a intenção.
- [ ] Criar, editar, salvar, compartilhar e excluir visualizações por lista/departamento.
- [ ] Configurar agrupamento, filtros, ordenação, colunas e campos por visualização.
- [ ] Quadro com arrastar entre status.
- [ ] Calendário baseado em datas reais.
- [ ] Gantt com períodos, dependências e progresso reais.
- [ ] Painéis por empresa/departamento com indicadores calculados.

## 5. Comunicação e colaboração

- [x] Canais e mensagens diretas locais.
- [x] Envio local de mensagem e composição de canal.
- [x] Formulários locais para criar canal e mensagem direta.
- [-] Canal compartilha a mesma coleção demonstrativa de mensagens.
- [ ] Canais persistentes por departamento, lista e projeto.
- [ ] Membros, papéis, menções, reações, GIF/emoji e comandos.
- [ ] Chamada/reunião, se for requisito confirmado para o produto.
- [ ] Vincular conversa a tarefa/lista/documento.
- [ ] Realtime, presença e indicadores de leitura.
- [ ] Notificações in-app, e-mail e preferências do usuário.

## 6. Caixa de entrada, busca e documentos

- [x] Caixa de Entrada local com leitura e limpeza.
- [x] Biblioteca e editor simples de documentos locais.
- [x] Templates locais para tarefa/processo/documento.
- [-] Filtros de templates são visuais e a aplicação de template ainda não preenche a tarefa.
- [ ] Caixa de Entrada consolidada com filtros: Todas, Principais, Outras, Mais tarde e Limpos.
- [ ] Busca global de tarefas, listas, pessoas, mensagens e documentos.
- [-] Documentos persistentes modelados; páginas, autosave, permissões e comentários pendentes.
- [-] Bucket privado e metadados de anexos criados; falta upload, pré-visualização e vínculo pela interface.
- [-] Templates persistentes modelados; versionamento e uso para instanciar estruturas pendentes.

## 7. Gestão e administração

- [x] Entradas de navegação para Empresas, Equipe e Configurações.
- [ ] Cadastro e alternância de empresas (ITP e Locabox).
- [ ] Gestão de equipe, convites, papéis e desligamento.
- [ ] Configurações de status, tipos de tarefa, campos personalizados e SLA.
- [ ] Matriz de permissão e revisão de acessos.
- [ ] Logs de atividade, exportação e retenção de dados.

## 8. Assistente de ChatGPT

- [ ] Backend autenticado para o assistente.
- [ ] Endpoint de sessão que mantém `OPENAI_API_KEY` somente no servidor.
- [ ] Identidade estável do usuário e autorização por dados/empresa/departamento.
- [ ] Interface do assistente no produto.
- [ ] Ferramentas seguras: consultar tarefas, criar rascunhos, resumir e propor ações.
- [ ] Confirmação humana antes de criar, editar, enviar, compartilhar ou excluir itens.
- [ ] Logs de uso, limites de custo, avaliação de qualidade e política de retenção.

> A integração não deve expor a chave de API no frontend. O padrão oficial prevê um endpoint de servidor autenticado que gera uma sessão/token temporário para a interface de chat. [Documentação do ChatKit](https://developers.openai.com/api/docs/guides/chatkit)

## 9. Auditoria Hoppe — funcionalidades verificadas em 2026-08-02

Esta varredura foi realizada em modo somente leitura, em uma sessão autenticada. Itens não exibidos por falta de dados na conta (por exemplo, detalhe de uma tarefa existente) são registrados como pendentes de validação, e não como ausentes no Hoppe.

| Área observada | Encontrado no Hoppe | Situação no MVP |
|---|---|---|
| Navegação global | Início, Caixa de Entrada, Documentos, Templates, Clips, busca global, automações, Ask, perfil e recolher sidebar | Parcial: Início, Caixa, Documentos e Templates existem; busca global, perfil e colapsar sidebar faltam; Clips e Automações estão fora do escopo atual. |
| Hierarquia | Todos os Departamentos → Espaço → pasta/processo/lista; ações contextuais; criar espaço | Parcial: árvore local e criação existem; menus de lista, reordenação, arquivamento e permissões reais faltam. |
| Lista de tarefas | Canal, Lista, Nova Visualização, Agrupar, Subtasks, Filtros, Fechadas, busca e criação; colunas Name, Assigned to, Start date, Due date e Comments | Parcial: visões e busca local existem; subtarefas, filtros avançados, fechadas, colunas configuráveis e datas reais faltam. |
| Canal | Conversa separada, título, chamada, membros, compositor, comandos `/`, emoji e GIF | Parcial: canal e envio local existem; chamadas, membros, comandos, reações, anexos e realtime faltam. |
| Caixa de Entrada | Todas, Principais, Outras, Mais tarde, Limpos, Filtro, marcar tudo como lido e limpar tudo | Parcial: leitura e limpeza locais existem; abas completas e filtros faltam. |
| Documentos | Biblioteca, busca, criar documento, páginas, autor e data de atualização | Parcial: biblioteca/editor local existem; páginas, colaboração, autosave, permissões e busca real faltam. |
| Templates | Todos, Listas, Pastas, Espaços, Documentos; importar; salvar pelo menu contextual | Parcial: biblioteca e salvamento local existem; filtros funcionais, importação e uso para instanciar estrutura faltam. |
| Busca global | Busca por Tasks, Docs, Mensagens, Comentários, Espaços e Pessoas; atalhos para navegar/abrir/fechar | Ausente. |
| Notificações | Centro de notificações acessível pela navegação global e Caixa de Entrada consolidada | Parcial: apenas Caixa de Entrada local. |
| Permissões | Menus de entidade e gerenciamento de canais/membros são visíveis; detalhes devem ser validados com dados/ação autorizada | Parcial: formulário local, sem persistência nem RLS. |

### Itens revelados pela auditoria e incluídos neste checklist

- [ ] Busca global com filtros por tarefas, documentos, mensagens, comentários, espaços e pessoas.
- [ ] Atalhos de teclado e comando rápido para busca/navegação.
- [ ] Aba de tarefas fechadas e restauração.
- [ ] Filtro da Caixa de Entrada e categorias Principais, Outras e Mais tarde.
- [ ] Marcar tudo como lido e limpar tudo com dados reais.
- [ ] Colunas de tarefa: nome, responsáveis, início, vencimento e comentários; configuração por visualização.
- [ ] Compositor de canais com comandos, emoji, GIF e anexos.
- [ ] Gestão visível de membros do canal e, se necessária, integração de chamada.
- [ ] Importação de templates e criação de instância a partir de lista/pasta/espaço/documento.
- [ ] Perfil do usuário, preferências e recolhimento da barra lateral.

### Exclusões deliberadas do MVP atual

- [~] Clips: mapeado, mas não será implementado nesta etapa.
- [~] Automações: mapeadas, mas não serão implementadas nesta etapa.
- [~] Ask nativo do Hoppe: será substituído futuramente pelo assistente próprio via API segura da OpenAI.

### Resultado da conferência

O checklist anterior já cobria os blocos estruturais principais. A auditoria acrescentou explicitamente busca global por domínio, atalhos, categorias completas da Caixa de Entrada, colunas de lista, interações do compositor, importação de template e preferências de interface. Portanto, **o checklist agora contém todas as capacidades observadas na varredura**, com a ressalva de que Clips e Automações constam como exclusões deliberadas, não como itens de implementação.

## Ordem de execução recomendada

1. [ ] Detalhe completo da tarefa e subtarefas, preservando a relação lista → tarefa.
2. [-] Persistir todo o modelo local no Supabase de teste, com Auth e RLS. Schema, RLS e grants foram aplicados; falta substituir o estado local pela integração autenticada da interface.
3. [ ] Implementar comentários, anexos, histórico e notificações.
4. [ ] Tornar filtros e visualizações configuráveis e persistentes.
5. [ ] Conectar canais, documentos, templates e Caixa de Entrada aos dados reais.
6. [ ] Implementar gestão de equipe, empresas e permissões.
7. [ ] Adicionar o assistente de ChatGPT pelo backend seguro.
8. [ ] Testes, segurança, acessibilidade, observabilidade e publicação.

## Regra de acompanhamento

Ao concluir um item, trocar `[ ]` por `[x]` (ou `[-]` se ainda for parcial), registrar o arquivo/PR que o implementou e executar `npm run lint` e `npm run build`.
