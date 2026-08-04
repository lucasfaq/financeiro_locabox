---
title: Checklist de implementação — Plataforma colaborativa ITP/Locabox
updated: 2026-08-04
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
- [-] Cliente Supabase, migrations, carregamento autenticado de hierarquia e persistência de atividades aplicados; comunicação, documentos, templates e Caixa de Entrada ainda usam fallback local.
- [x] Projeto Supabase de teste escolhido e conectado (`qeeqtbjwkppahjaaqekp`).
- [x] Login por e-mail e senha, RLS, Realtime e Storage implementados; papéis, desativação e administração de usuários estão publicados. Falta ampliar permissões e testes automatizados.
- [ ] Observabilidade, tratamento de erros, auditoria e backups.
- [ ] Testes automatizados de unidade, integração e interface.
- [ ] Ativar proteção contra senhas vazadas no Supabase Auth; auditoria de segurança em 2026-08-03 não encontrou alerta de RLS, mas indicou esta configuração de Auth como pendente.

## 2. Organização do trabalho

- [-] Departamentos, pastas e listas carregam do Supabase para sessões autenticadas; a criação compartilhada está sendo concluída nesta etapa e permanece fallback local sem conexão.
- [x] Árvore expansível Departamento → Pasta → Lista.
- [-] Criar departamento, pasta e lista compartilhados; renomear e excluir ainda são locais.
- [x] Criar listas com ID persistente no Supabase para sessões autenticadas.
- [x] Tarefas vinculadas a uma lista e contagem por lista.
- [-] Menus de departamento/pasta: status, template e permissões apenas locais.
- [ ] Menus completos para listas (renomear, status, template, permissões, exclusão).
- [ ] Reordenação por arrastar e soltar.
- [-] Arquivamento e restauração persistentes de tarefas; arquivamento de listas e demais entidades permanece pendente.
- [ ] Permissões reais por empresa, departamento, pasta e lista.

## 3. Tarefas e aprovações

- [-] Criar tarefa em branco com lista, título, tipo, responsável real e campos financeiros; persiste no Supabase quando autenticado e preserva o modo local.
- [-] Status, prioridade, responsável, vencimento, empresa, categoria e valor; status e os campos suportados persistem no Supabase quando autenticado.
- [x] Aprovar ou devolver atividade; decisão, justificativa, aprovador e status persistem no Supabase quando autenticado.
- [x] Filtro por status e busca local por título.
- [x] Visões locais: Lista, Quadro, Calendário e Gantt.
- [-] Aba “A partir de template” leva à biblioteca, sem preencher uma tarefa a partir do modelo.
- [-] Calendário mensal usa datas reais de vencimento; Gantt continua demonstrativo, sem intervalos e dependências reais.
- [-] Página/painel de detalhe com subtarefas, comentários e anexos privados persistidos para atividades autenticadas; recursos avançados continuam pendentes.
- [-] Subtarefas, comentários e metadados de anexos persistentes modelados no Supabase; descrição rica, responsáveis múltiplos, etiquetas e dependências continuam pendentes.
- [ ] Datas reais de início, vencimento, recorrência e alertas.
- [-] Comentários e subtarefas persistentes conectados à interface; menções e progresso calculado continuam pendentes.
- [-] Subtarefas persistentes e progresso calculado: schema pronto, cálculo e integração pendentes.
- [ ] Filtros avançados combináveis, ordenação, grupos e colunas configuráveis.
- [-] Tarefas arquivadas podem ser consultadas e restauradas no painel inicial; visão completa em todas as listas continua pendente.
- [ ] Aprovações com regras, alçadas, evidências e trilha de decisão.

## 4. Visualizações e painéis

- [x] Navegação entre Lista, Quadro, Calendário e Gantt.
- [-] Botão de nova visualização apenas informa a intenção.
- [ ] Criar, editar, salvar, compartilhar e excluir visualizações por lista/departamento.
- [ ] Configurar agrupamento, filtros, ordenação, colunas e campos por visualização.
- [ ] Quadro com arrastar entre status.
- [x] Calendário baseado em datas reais de vencimento.
- [ ] Gantt com períodos, dependências e progresso reais.
- [ ] Painéis por empresa/departamento com indicadores calculados.

## 5. Comunicação e colaboração

- [-] Canais e mensagens diretas locais, com canais e mensagens diretas persistentes para sessões autenticadas.
- [-] Envio local e persistente de mensagem em canais e conversas diretas.
- [-] Formulários para criar canal e mensagem direta; no modo autenticado a pessoa é selecionada do diretório ativo.
- [-] Canais e mensagens persistentes conectados à interface para sessões autenticadas; conversas diretas privadas persistentes concluídas, enquanto presença e indicadores de leitura permanecem pendentes.
- [-] Estrutura e RLS para canais persistentes por departamento, lista e projeto; canais públicos são colaborativos para usuários ativos e os privados exigem membresia. Criador do canal ou administrador pode adicionar/remover membros ativos pela interface; vínculo por departamento/lista pendente.
- [-] Membros protegidos por RLS para leitura e envio; criação e gestão visual de membros de canais privados concluídas. Papéis por canal, menções, reações, GIF/emoji e comandos pendentes.
- [ ] Chamada/reunião, se for requisito confirmado para o produto.
- [ ] Vincular conversa a tarefa/lista/documento.
- [-] Realtime de mensagens por canal conectado; presença e indicadores de leitura pendentes.
- [-] Notificações in-app para decisão de aprovação e atividade atribuída; e-mail, menções e preferências do usuário permanecem pendentes.

## 6. Caixa de entrada, busca e documentos

- [-] Caixa de Entrada lê, recebe em tempo real e marca notificações reais para sessões autenticadas. Decisão de aprovação e atribuição de atividade geram notificações automáticas; solicitação de aprovação e menções permanecem pendentes.
- [-] Biblioteca e editor de documentos persistem no Supabase para sessões autenticadas, preservando fallback local sem conexão.
- [-] Templates persistem no Supabase para sessões autenticadas, preservando fallback local sem conexão.
- [-] Filtros de templates são visuais; aplicar um template agora preenche o título da nova tarefa, enquanto a instanciação completa da estrutura permanece pendente.
- [ ] Caixa de Entrada consolidada com filtros: Todas, Principais, Outras, Mais tarde e Limpos.
- [-] Busca global encontra tarefas, documentos, templates, canais e pessoas; listas e mensagens continuam pendentes.
- [-] Documentos persistentes modelados; páginas, autosave, permissões e comentários pendentes.
- [-] Bucket privado, upload, metadados e abertura por URL assinada conectados; pré-visualização continua pendente.
- [-] Templates persistentes modelados; versionamento e uso para instanciar estruturas pendentes.

## 7. Gestão e administração

- [x] Entradas de navegação para Empresas, Equipe e Configurações.
- [x] Cadastro e ativação/desativação de empresas.
- [-] Gestão de equipe com criação, edição de papel, bloqueio e redefinição de senha; seleção visual de empresas e departamentos vinculados, protegida por RLS. Convites pendentes.
- [ ] Configurações de status, tipos de tarefa, campos personalizados e SLA.
- [-] Matriz de permissão aplicada por papel, empresa e departamento, incluindo detalhes e anexos de atividades; revisão de acessos e alçadas específicas pendentes.
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
| Busca global | Busca por Tasks, Docs, Mensagens, Comentários, Espaços e Pessoas; atalhos para navegar/abrir/fechar | Parcial: tarefas, documentos, templates, canais e pessoas estão pesquisáveis; mensagens, comentários, espaços e atalhos pendem. |
| Notificações | Centro de notificações acessível pela navegação global e Caixa de Entrada consolidada | Parcial: apenas Caixa de Entrada local. |
| Permissões | Menus de entidade e gerenciamento de canais/membros são visíveis; detalhes devem ser validados com dados/ação autorizada | Parcial: formulário local, sem persistência nem RLS. |

### Itens revelados pela auditoria e incluídos neste checklist

- [-] Busca global por tarefas, documentos, canais, templates e pessoas; filtros completos, mensagens, comentários e espaços pendem.
- [ ] Atalhos de teclado e comando rápido para busca/navegação.
- [-] Aba de tarefas arquivadas e restauração disponível no painel inicial; falta abrangê-la nas visualizações por lista.
- [ ] Filtro da Caixa de Entrada e categorias Principais, Outras e Mais tarde.
- [ ] Marcar tudo como lido e limpar tudo com dados reais.
- [ ] Colunas de tarefa: nome, responsáveis, início, vencimento e comentários; configuração por visualização.
- [ ] Compositor de canais com comandos, emoji, GIF e anexos.
- [-] Gestão visível de membros de canais privados concluída; integração de chamada segue pendente se confirmada como requisito.
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
