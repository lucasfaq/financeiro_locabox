import { useEffect, useMemo, useState } from "react";
import { Bell, Building2, CalendarDays, Check, ChevronDown, ChevronRight, CirclePlus, ClipboardList, Clock3, FileText, Folder, Hash, LayoutDashboard, List, MessageCircle, MoreHorizontal, Search, Send, Settings, ShieldCheck, Users } from "lucide-react";
import "./App.css";
import "./Channel.css";
import { TemplatesLibrary, type TaskTemplate } from "./TemplatesLibrary";
import "./TemplatesLibrary.css";
import { Inbox, type InboxItem } from "./Inbox";
import "./Inbox.css";
import { DocumentsWorkspace, type WorkspaceDocument } from "./DocumentsWorkspace";
import "./DocumentsWorkspace.css";
import "./Hierarchy.css";
import "./WorkspaceShell.css";
import "./TaskModal.css";
import { usePersistentState } from "./usePersistentState";
import { AuthGate } from "./AuthGate";
import { AdminUsers } from "./AdminUsers";
import { CompaniesManagement } from "./CompaniesManagement";
import { TaskDetail } from "./TaskDetail";
import { createFinancialTask, createWorkspaceDepartment, decideFinancialApproval, loadFinancialTasks, loadWorkspaceHierarchy } from "./workspaceRepository";
import { supabase } from "./supabaseClient";

type Status = "Pendente" | "Em aprovação" | "Aprovado" | "Executado";
type Task = { id: string | number; title: string; company: "ITP" | "Locabox"; category: string; due: string; owner: string; value: number; status: Status; priority: "Alta" | "Média" | "Baixa"; listId: string; taskType: "Tarefa" | "Aprovação" | "Financeiro" };
type CreateTarget = "canal" | "mensagem" | "departamento" | "pasta" | "lista";
type WorkspaceList = { id: string; name: string };
type DepartmentFolder = { id: string; name: string; lists: WorkspaceList[] };
type EntityMenu = { kind: "departamento" | "pasta"; department: string; folderId?: string };

const initialTasks: Task[] = [
  { id: 1, title: "Aprovar pagamento de fornecedor", company: "ITP", category: "Fornecedores", due: "Hoje", owner: "Marina", value: 28450, status: "Em aprovação", priority: "Alta", listId: "financeiro-pagamentos", taskType: "Aprovação" },
  { id: 2, title: "Conferir retenções da medição 08", company: "ITP", category: "Obras", due: "Hoje", owner: "Carlos", value: 12800, status: "Pendente", priority: "Alta", listId: "financeiro-pagamentos", taskType: "Financeiro" },
  { id: 3, title: "Programar aluguel de setembro", company: "Locabox", category: "Locações", due: "05 ago", owner: "Marina", value: 18600, status: "Pendente", priority: "Média", listId: "financeiro-receber", taskType: "Financeiro" },
  { id: 4, title: "Validar reembolso de deslocamento", company: "Locabox", category: "Despesas", due: "06 ago", owner: "Ana", value: 1870, status: "Em aprovação", priority: "Média", listId: "financeiro-pagamentos", taskType: "Aprovação" },
  { id: 5, title: "Arquivar comprovantes de julho", company: "ITP", category: "Documentos", due: "08 ago", owner: "Carlos", value: 0, status: "Executado", priority: "Baixa", listId: "financeiro-pagamentos", taskType: "Tarefa" },
];

const localDepartmentFolders: Record<string, DepartmentFolder[]> = {
  Financeiro: [{ id: "local-financeiro-rotinas", name: "Rotinas", lists: [{ id: "financeiro-pagamentos", name: "Pagamentos e aprovações" }, { id: "financeiro-receber", name: "Contas a receber" }] }],
  Operações: [{ id: "local-operacoes-processos", name: "Processos", lists: [{ id: "operacoes-acompanhamento", name: "Acompanhamento operacional" }] }],
  Engenharia: [{ id: "local-engenharia-obras", name: "Obras", lists: [{ id: "engenharia-medicoes", name: "Medições" }] }],
};

const money = (value: number) => value ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "-";
const asWorkspaceList = (rawList: WorkspaceList | string, department: string, folderId: string): WorkspaceList => typeof rawList === "string" ? { id: `${department}-${folderId}-${rawList}`, name: rawList } : rawList;
const taskDate = (due: string) => {
  if (due === "Hoje") return new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(due)) return new Date(`${due}T12:00:00`);
  const brazilian = due.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brazilian) return new Date(Number(brazilian[3]), Number(brazilian[2]) - 1, Number(brazilian[1]), 12);
  const short = due.match(/^(\d{1,2})\s+ago$/i);
  return short ? new Date(new Date().getFullYear(), 7, Number(short[1]), 12) : null;
};

function Workspace() {
  const [tasks, setTasks] = usePersistentState("itp-financeiro-tasks", initialTasks);
  const [section, setSection] = useState("Visão geral");
  const [filter, setFilter] = useState<"Todos" | Status>("Todos");
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [channelMessage, setChannelMessage] = useState("");
  const [channelOpen, setChannelOpen] = useState(false);
  const [channelName, setChannelName] = useState("Geral");
  const [templates, setTemplates] = usePersistentState<TaskTemplate[]>("itp-financeiro-templates", []);
  const [inboxItems, setInboxItems] = usePersistentState<InboxItem[]>("itp-financeiro-inbox", [
    { id: 1, kind: "Tarefa", title: "Aprovar pagamento de fornecedor", detail: "Financeiro · vence hoje", time: "há 8 min", priority: true, read: false },
    { id: 2, kind: "Mensagem", title: "Carlos mencionou você no canal Geral", detail: "Incluí a medição 08 para conferência.", time: "há 24 min", priority: true, read: false },
    { id: 3, kind: "Tarefa", title: "Conferir retenções da medição 08", detail: "Financeiro · atribuída a você", time: "ontem", priority: false, read: false },
  ]);
  const [documents, setDocuments] = usePersistentState<WorkspaceDocument[]>("itp-financeiro-documents", [
    { id: 1, title: "Rotina de pagamentos", body: "Registre aqui as decisões, documentos e pendências do processo de pagamentos.", updated: "hoje" },
  ]);
  const [channels, setChannels] = usePersistentState("itp-financeiro-channels", ["Geral"]);
  const [directMessages, setDirectMessages] = usePersistentState("itp-financeiro-direct-messages", ["Carlos Mendes"]);
  const [departments, setDepartments] = usePersistentState("itp-financeiro-departments", ["Financeiro", "Operações", "Engenharia"]);
  const [activeDepartment, setActiveDepartment] = usePersistentState("itp-financeiro-active-department", "Financeiro");
  const [departmentFolders, setDepartmentFolders] = usePersistentState<Record<string, DepartmentFolder[]>>("itp-financeiro-folders", localDepartmentFolders);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>("local-financeiro-rotinas");
  const [selectedListId, setSelectedListId] = useState<string | null>("financeiro-pagamentos");
  const [expandedDepartment, setExpandedDepartment] = usePersistentState<string | null>("itp-financeiro-expanded-department", "Financeiro");
  const [expandedFolders, setExpandedFolders] = usePersistentState<string[]>("itp-financeiro-expanded-folders", ["local-financeiro-rotinas"]);
  const [departmentStatus, setDepartmentStatus] = usePersistentState<Record<string, "Ativo" | "Em pausa">>("itp-financeiro-department-status", {});
  const [entityMenu, setEntityMenu] = useState<EntityMenu | null>(null);
  const [shareTarget, setShareTarget] = useState<EntityMenu | null>(null);
  const [createTarget, setCreateTarget] = useState<CreateTarget | null>(null);
  const [newEntityName, setNewEntityName] = useState("");
  const [messages, setMessages] = usePersistentState("itp-financeiro-messages", [
    { author: "Carlos Mendes", initials: "CA", time: "09:12", text: "Incluí a medição 08 para conferência. A tarefa já está vinculada a este canal." },
    { author: "Marina Alves", initials: "MA", time: "09:18", text: "Vou validar as retenções antes de enviar para aprovação." },
  ]);
  const [taskView, setTaskView] = useState<"Lista" | "Quadro" | "Calendário" | "Gantt">("Lista");
  const [calendarCursor, setCalendarCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [usesRemoteTasks, setUsesRemoteTasks] = useState(false);

  useEffect(() => {
    let active = true;

    void loadWorkspaceHierarchy()
      .then((remoteDepartments) => {
        if (!active || !remoteDepartments?.length) return;

        const remoteFolders = Object.fromEntries(remoteDepartments.map((department) => [department.name, department.folders]));
        setDepartments(remoteDepartments.map((department) => department.name));
        setDepartmentFolders(remoteFolders);
        setActiveDepartment(remoteDepartments[0].name);
        setSelectedFolderId(null);
        setSelectedListId(null);
        setExpandedDepartment(remoteDepartments[0].name);
        setExpandedFolders([]);
        return loadFinancialTasks().then((remoteTasks) => {
          if (!active || remoteTasks === null) return;
          setTasks(remoteTasks);
          setUsesRemoteTasks(true);
          setNotice("Estrutura e atividades compartilhadas carregadas.");
        });
      })
      .catch(() => {
        if (active) setNotice("Não foi possível carregar a estrutura compartilhada. Mantivemos o modo demonstrativo local.");
      });

    return () => { active = false; };
  }, [setActiveDepartment, setDepartmentFolders, setDepartments, setExpandedDepartment, setExpandedFolders, setTasks]);

  useEffect(() => {
    const client = supabase;
    if (!client || !usesRemoteTasks) return;
    const channel = client.channel("atividades-financeiras").on("postgres_changes", { event: "*", schema: "public", table: "atividades_financeiras" }, () => {
      void loadFinancialTasks().then((remoteTasks) => { if (remoteTasks) setTasks(remoteTasks); });
    }).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [setTasks, usesRemoteTasks]);
  const allLists = useMemo(() => Object.entries(departmentFolders).flatMap(([department, folders]) => folders.flatMap((folder) => folder.lists.map((rawList) => ({ ...asWorkspaceList(rawList, department, folder.id), department, folder: folder.name })))), [departmentFolders]);
  const selectedList = allLists.find((list) => list.id === selectedListId);
  const visibleTasks = useMemo(() => tasks.filter((task) => (filter === "Todos" || task.status === filter) && task.title.toLowerCase().includes(search.toLowerCase()) && (!selectedListId || (task.listId || "financeiro-pagamentos") === selectedListId)), [tasks, filter, search, selectedListId]);
  const approvalTasks = tasks.filter((task) => task.status === "Em aprovação");
  const calendarCells = useMemo(() => {
    const year = calendarCursor.getFullYear(); const month = calendarCursor.getMonth();
    const startsOn = new Date(year, month, 1).getDay(); const totalDays = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: Math.ceil((startsOn + totalDays) / 7) * 7 }, (_, index) => index - startsOn + 1).map((day) => day > 0 && day <= totalDays ? day : null);
  }, [calendarCursor]);

  const decideApproval = async (id: Task["id"], approved: boolean) => {
    const justification = approved ? null : window.prompt("Informe o motivo da devolução:");
    if (!approved && justification === null) return;
    if (usesRemoteTasks && typeof id === "string") {
      try { await decideFinancialApproval(id, approved ? "aprovado" : "devolvido", justification?.trim() || null); }
      catch { setNotice("Não foi possível registrar a decisão de aprovação."); return; }
    }
    setTasks((current) => current.map((task) => task.id === id ? { ...task, status: approved ? "Aprovado" : "Pendente" } : task));
    setNotice(approved ? "Aprovação registrada no histórico." : "Devolução registrada no histórico.");
    window.setTimeout(() => setNotice(""), 3600);
  };

  const createTask = async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const task: Task = { id: Date.now(), title: String(data.get("title")), company: String(data.get("company")) as Task["company"], category: String(data.get("category")), due: String(data.get("due")), owner: String(data.get("owner")), value: Number(data.get("value")), priority: "Média", status: "Pendente", listId: String(data.get("listId")), taskType: String(data.get("taskType")) as Task["taskType"] };
    if (usesRemoteTasks) {
      try {
        const remoteTask = await createFinancialTask(task);
        setTasks((current) => [remoteTask, ...current]);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Não foi possível criar a atividade compartilhada.");
        return;
      }
    } else setTasks((current) => [task, ...current]);
    setSelectedListId(task.listId); setShowModal(false); setNotice("Tarefa criada na lista selecionada."); window.setTimeout(() => setNotice(""), 3600);
  };

  const sendChannelMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!channelMessage.trim()) return;
    setMessages((current) => [...current, { author: "Marina Alves", initials: "MA", time: "agora", text: channelMessage.trim() }]);
    setChannelMessage("");
    setNotice("Mensagem enviada ao canal # pagamentos-e-aprovacoes.");
  };

  const createWorkspaceEntity = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newEntityName.trim();
    if (!name || !createTarget) return;
    if (createTarget === "departamento" && usesRemoteTasks) {
      try {
        await createWorkspaceDepartment(name);
        const remoteDepartments = await loadWorkspaceHierarchy();
        if (remoteDepartments?.length) {
          setDepartments(remoteDepartments.map((department) => department.name));
          setDepartmentFolders(Object.fromEntries(remoteDepartments.map((department) => [department.name, department.folders])));
          setActiveDepartment(name); setExpandedDepartment(name); setSelectedFolderId(null); setSelectedListId(null);
        }
      } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível criar o departamento compartilhado."); return; }
      setNotice("Departamento criado para toda a equipe."); setNewEntityName(""); setCreateTarget(null); return;
    }
    if (createTarget === "canal") { setChannels((current) => [...current, name]); setChannelName(name); setChannelOpen(true); setSection("Canais"); }
    if (createTarget === "mensagem") { setDirectMessages((current) => [...current, name]); setChannelName(name); setChannelOpen(true); setSection("Canais"); }
    if (createTarget === "departamento") { setDepartments((current) => [...current, name]); setDepartmentFolders((current) => ({ ...current, [name]: [] })); setActiveDepartment(name); setChannelOpen(false); setSection("Visão geral"); }
    if (createTarget === "pasta") { const folder: DepartmentFolder = { id: `local-folder-${Date.now()}`, name, lists: [] }; setDepartmentFolders((current) => ({ ...current, [activeDepartment]: [...(current[activeDepartment] ?? []), folder] })); setSelectedFolderId(folder.id); }
    if (createTarget === "lista") { const list = { id: `lista-${Date.now()}`, name }; setDepartmentFolders((current) => ({ ...current, [activeDepartment]: (current[activeDepartment] ?? []).map((folder, index) => folder.id === selectedFolderId || (!selectedFolderId && index === 0) ? { ...folder, lists: [...folder.lists, list] } : folder) })); setSelectedListId(list.id); }
    const targetLabel = createTarget === "mensagem" ? "Mensagem direta" : createTarget === "pasta" ? "Pasta" : createTarget === "lista" ? "Lista" : createTarget[0].toUpperCase() + createTarget.slice(1);
    setNotice(`${targetLabel} criado(a) com sucesso.`);
    setNewEntityName(""); setCreateTarget(null);
  };

  const renameEntity = (menu: EntityMenu) => {
    const currentName = menu.kind === "departamento" ? menu.department : departmentFolders[menu.department]?.find((folder) => folder.id === menu.folderId)?.name;
    const nextName = window.prompt("Novo nome", currentName);
    if (!nextName?.trim()) return;
    if (menu.kind === "departamento") {
      setDepartments((current) => current.map((department) => department === menu.department ? nextName.trim() : department));
      setDepartmentFolders((current) => { const { [menu.department]: folders, ...rest } = current; return { ...rest, [nextName.trim()]: folders ?? [] }; });
      setActiveDepartment((current) => current === menu.department ? nextName.trim() : current);
    } else {
      setDepartmentFolders((current) => ({ ...current, [menu.department]: (current[menu.department] ?? []).map((folder) => folder.id === menu.folderId ? { ...folder, name: nextName.trim() } : folder) }));
    }
    setEntityMenu(null); setNotice("Nome atualizado.");
  };

  const deleteEntity = (menu: EntityMenu) => {
    const label = menu.kind === "departamento" ? menu.department : departmentFolders[menu.department]?.find((folder) => folder.id === menu.folderId)?.name;
    if (!window.confirm(`Excluir “${label}”? Esta ação remove o item apenas deste navegador.`)) return;
    if (menu.kind === "departamento") { setDepartments((current) => current.filter((department) => department !== menu.department)); setDepartmentFolders((current) => { const { [menu.department]: _, ...rest } = current; return rest; }); setActiveDepartment("Todos os departamentos"); }
    else setDepartmentFolders((current) => ({ ...current, [menu.department]: (current[menu.department] ?? []).filter((folder) => folder.id !== menu.folderId) }));
    setEntityMenu(null); setNotice("Item excluído.");
  };

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">L</div><div><strong>ITP <span>/</span> Locabox</strong><small>Gestão financeira</small></div></div>
      <nav>
        {[{ label: "Visão geral", icon: LayoutDashboard }, { label: "Caixa de Entrada", icon: Bell }, { label: "Atividades", icon: ClipboardList }, { label: "Aprovações", icon: ShieldCheck }, { label: "Calendário", icon: CalendarDays }, { label: "Documentos", icon: FileText }, { label: "Templates", icon: FileText }].map(({ label, icon: Icon }) => <button key={label} className={section === label ? "nav-link active" : "nav-link"} onClick={() => { setSection(label); setChannelOpen(false); }}><Icon size={18} />{label}{label === "Aprovações" && approvalTasks.length > 0 && <b>{approvalTasks.length}</b>}</button>)}
      </nav>
      <div className="channel-nav">
        <div className="sidebar-group-title"><p>CANAIS</p><button aria-label="Adicionar canal" onClick={() => setCreateTarget("canal")}>+</button></div>
        {channels.map((channel) => <button key={channel} className={channelOpen && channelName === channel ? "nav-link active" : "nav-link"} onClick={() => { setChannelName(channel); setChannelOpen(true); setSection("Canais"); }}><Hash size={18} />{channel}</button>)}
        <button className="sidebar-add" onClick={() => setCreateTarget("canal")}>+ Adicionar canal</button>
        <div className="sidebar-group-title"><p>MENSAGENS DIRETAS</p><button aria-label="Nova mensagem direta" onClick={() => setCreateTarget("mensagem")}>+</button></div>
        {directMessages.map((person) => <button key={person} className={channelOpen && channelName === person ? "nav-link active" : "nav-link"} onClick={() => { setChannelName(person); setChannelOpen(true); setSection("Canais"); }}><MessageCircle size={18} />{person}</button>)}
        <button className="sidebar-add" onClick={() => setCreateTarget("mensagem")}>+ Nova mensagem</button>
        <div className="sidebar-group-title"><p>DEPARTAMENTOS</p><span><button aria-label="Buscar departamentos" onClick={() => setNotice("Busca de departamentos será conectada aos dados compartilhados.")}><Search size={15}/></button><button aria-label="Criar departamento" onClick={() => setCreateTarget("departamento")}>+</button></span></div>
        <button className={!channelOpen && section === "Visão geral" && activeDepartment === "Todos os departamentos" ? "nav-link active" : "nav-link"} onClick={() => { setActiveDepartment("Todos os departamentos"); setChannelOpen(false); setSection("Visão geral"); }}><Building2 size={18}/>Todos os departamentos</button>
        {departments.map((department) => <div className="department-tree" key={department}><div className={activeDepartment === department && !channelOpen ? "tree-row active" : "tree-row"}><button className="tree-toggle" aria-label={`Expandir ${department}`} onClick={() => setExpandedDepartment(expandedDepartment === department ? null : department)}>{expandedDepartment === department ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}</button><button className="tree-name" onClick={() => { setActiveDepartment(department); setChannelOpen(false); setSection("Visão geral"); setSelectedFolderId(departmentFolders[department]?.[0]?.id ?? null); }}><Building2 size={17}/>{department}</button><button aria-label={`Mais opções de ${department}`} onClick={() => setEntityMenu({ kind: "departamento", department })}><MoreHorizontal size={16}/></button><button aria-label={`Criar pasta em ${department}`} onClick={() => { setActiveDepartment(department); setCreateTarget("pasta"); }}>+</button></div>{expandedDepartment === department && <div className="folder-tree">{(departmentFolders[department] ?? []).map((folder) => <div key={folder.id}><div className={selectedFolderId === folder.id ? "folder-row selected" : "folder-row"}><button className="tree-toggle" aria-label={`Expandir pasta ${folder.name}`} onClick={() => setExpandedFolders((current) => current.includes(folder.id) ? current.filter((id) => id !== folder.id) : [...current, folder.id])}>{expandedFolders.includes(folder.id) ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</button><button className="tree-name" onClick={() => setSelectedFolderId(folder.id)}><Folder size={16}/>{folder.name}</button><button aria-label={`Mais opções de ${folder.name}`} onClick={() => setEntityMenu({ kind: "pasta", department, folderId: folder.id })}><MoreHorizontal size={15}/></button><button aria-label={`Criar lista em ${folder.name}`} onClick={() => { setSelectedFolderId(folder.id); setCreateTarget("lista"); }}>+</button></div>{expandedFolders.includes(folder.id) && folder.lists.map((rawList) => { const list = asWorkspaceList(rawList, department, folder.id); return <button className={selectedListId === list.id ? "list-row selected" : "list-row"} key={list.id} onClick={() => { setSelectedListId(list.id); setSelectedFolderId(folder.id); setActiveDepartment(department); setChannelOpen(false); setSection("Atividades"); }}><List size={15}/>{list.name}<span>{tasks.filter((task) => (task.listId || "financeiro-pagamentos") === list.id).length}</span></button>; })}</div>)}<button className="sidebar-add" onClick={() => setCreateTarget("pasta")}>+ Criar pasta</button></div>}</div>)}
        <button className="sidebar-add" onClick={() => setCreateTarget("departamento")}>+ Criar espaço</button>
      </div>
      <div className="nav-group"><p>GERENCIAR</p>{[{ label: "Empresas", icon: Building2 }, { label: "Equipe", icon: Users }, { label: "Configurações", icon: Settings }].map(({ label, icon: Icon }) => <button key={label} className={section === label ? "nav-link active" : "nav-link"} onClick={() => { if (label === "Equipe" || label === "Empresas") { setSection(label); setChannelOpen(false); } else setNotice(`${label} será habilitado na próxima etapa.`); }}><Icon size={18} />{label}</button>)}</div>
      <div className="profile"><div className="avatar">MA</div><div><strong>Marina Alves</strong><small>Financeiro</small></div><ChevronDown size={16} /></div>
    </aside>
    <section className="workspace">
      <header><div><p className="eyebrow">{selectedList ? `${selectedList.department.toUpperCase()} / ${selectedList.folder.toUpperCase()}` : `${activeDepartment.toUpperCase()} / AGOSTO 2026`}</p><h1>{selectedList ? selectedList.name : section}</h1></div><div className="header-actions"><button className="icon-button" aria-label="Notificações"><Bell size={19} /><i /></button><button className="primary-button" onClick={() => setShowModal(true)}><CirclePlus size={18} />Nova tarefa</button></div></header>
      {notice && <div className="notice"><Check size={17} />{notice}</div>}
      {section === "Templates" && <TemplatesLibrary templates={templates} onSaveCurrent={() => { setTemplates((current) => [...current, { id: Date.now(), name: "Rotina de pagamentos", category: "Processo financeiro", description: "Lista, responsáveis e campos financeiros reutilizáveis." }]); setNotice("Visão salva como template do departamento."); }} onUse={(template) => { setShowModal(true); setNotice(`Use o template “${template.name}” para criar a próxima tarefa.`); }} />}
      {section === "Caixa de Entrada" && <Inbox items={inboxItems} onMarkRead={(id) => setInboxItems((current) => current.map((item) => item.id === id ? { ...item, read: true } : item))} onClearRead={() => setInboxItems((current) => current.filter((item) => !item.read))} />}
      {section === "Documentos" && <DocumentsWorkspace documents={documents} onCreate={() => setDocuments((current) => [...current, { id: Date.now(), title: "Sem título", body: "", updated: "agora" }])} onUpdate={(id, patch) => setDocuments((current) => current.map((document) => document.id === id ? { ...document, ...patch } : document))} />}
      {section === "Equipe" && <AdminUsers />}
      {section === "Empresas" && <CompaniesManagement />}
      <div hidden={section === "Templates" || section === "Caixa de Entrada" || section === "Documentos" || section === "Equipe" || section === "Empresas"}>
      <div className="summary-grid">
        <article><span className="summary-icon blue"><ClipboardList size={19} /></span><p>Atividades abertas</p><strong>{tasks.filter((t) => t.status !== "Executado").length}</strong><small>3 com vencimento esta semana</small></article>
        <article><span className="summary-icon red"><ShieldCheck size={19} /></span><p>Aguardando aprovação</p><strong>{approvalTasks.length}</strong><small>{money(approvalTasks.reduce((sum, task) => sum + task.value, 0))} em análise</small></article>
        <article><span className="summary-icon yellow"><Clock3 size={19} /></span><p>Vencem hoje</p><strong>{tasks.filter((t) => t.due === "Hoje").length}</strong><small>Priorize as atividades críticas</small></article>
        <article><span className="summary-icon green"><Check size={19} /></span><p>Concluídas no mês</p><strong>{tasks.filter((t) => t.status === "Executado").length + 18}</strong><small>+12% frente a julho</small></article>
      </div>
      {!channelOpen && <div className="content-grid">
        <section className="task-panel"><div className="panel-header"><div><h2>Atividades recentes</h2><p>Acompanhamento operacional do financeiro</p></div><button className="text-button" onClick={() => { setSection("Atividades"); setFilter("Todos"); }}>Ver todas</button></div><div className="toolbar"><div className="search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar atividade" /></div><div className="filters">{(["Todos", "Pendente", "Em aprovação", "Aprovado", "Executado"] as const).map((item) => <button key={item} className={filter === item ? "filter selected" : "filter"} onClick={() => setFilter(item)}>{item}</button>)}</div></div><div className="task-list">{visibleTasks.map((task) => <article className="task-row" key={task.id} onClick={() => setDetailTask(task)}><span className={`priority ${task.priority.toLowerCase()}`} /><div className="task-main"><strong>{task.title}</strong><span>{task.company} <em>•</em> {task.category}</span></div><div className="task-meta"><span>Vencimento</span><strong className={task.due === "Hoje" ? "urgent" : ""}>{task.due}</strong></div><div className="task-meta"><span>Responsável</span><strong>{task.owner}</strong></div><div className="task-value">{money(task.value)}</div><span className={`status ${task.status.toLowerCase().replace(" ", "-")}`}>{task.status}</span></article>)}{visibleTasks.length === 0 && <p className="empty">Nenhuma atividade encontrada.</p>}</div></section>
        <aside className="approval-panel"><div className="panel-header"><div><h2>Para sua aprovação</h2><p>Decisões que exigem sua ação</p></div></div>{approvalTasks.map((task) => <article className="approval-card" key={task.id}><span>{task.company}</span><h3>{task.title}</h3><p>{task.category} <em>•</em> {task.due}</p><strong>{money(task.value)}</strong><div><button className="secondary-button" onClick={() => void decideApproval(task.id, false)}>Devolver</button><button className="approve-button" onClick={() => void decideApproval(task.id, true)}>Aprovar</button></div></article>)}{approvalTasks.length === 0 && <p className="empty">Não há aprovações pendentes.</p>}</aside>
      </div>}
      <section className={channelOpen ? "channel-workspace" : "collaboration-strip"}>
        <div className="channel-summary"><span className="channel-icon"><MessageCircle size={18} /></span><p className="eyebrow">{channelName === "Geral" ? "DEPARTAMENTO / FINANCEIRO" : "MENSAGEM DIRETA"}</p><h2>{channelName === "Geral" ? "# Geral" : channelName}</h2><p>{channelName === "Geral" ? "Canal geral para alinhamentos e comunicação da equipe financeira." : "Conversa direta entre membros da equipe."}</p><button className="text-button" onClick={() => { setChannelOpen(!channelOpen); setSection(channelOpen ? "Visão geral" : "Canais"); }}>{channelOpen ? "Voltar ao painel" : "Abrir canal"}</button></div>
        <div className="channel-thread"><div className="channel-thread-header"><strong>{channelOpen ? "Conversas" : "Últimas mensagens"}</strong><span>{messages.length} mensagens</span></div>{messages.map((message, index) => <div className="message" key={`${message.author}-${index}`}><span className="avatar">{message.initials}</span><div><strong>{message.author} <small>{message.time}</small></strong><p>{message.text}</p></div></div>)}<form className="message-compose" onSubmit={sendChannelMessage}><input value={channelMessage} onChange={(event) => setChannelMessage(event.target.value)} placeholder={channelName === "Geral" ? "Responder no canal geral" : `Mensagem para ${channelName}`} /><button aria-label="Enviar mensagem"><Send size={16}/></button></form></div>
      </section>
      {!channelOpen && <section className="views-studio"><div className="views-heading"><div><p className="eyebrow">DEPARTAMENTO / FINANCEIRO</p><h2>Visões de tarefas</h2></div><div className="view-tabs">{(["Lista", "Quadro", "Calendário", "Gantt"] as const).map((view) => <button key={view} className={taskView === view ? "selected" : ""} onClick={() => setTaskView(view)}>{view}</button>)}<button className="new-view" onClick={() => setNotice("Nova visualização criada. A configuração será salva por departamento no Supabase.")}>+ Nova visão</button></div></div>
        {taskView === "Lista" && <div className="compact-list">{tasks.map((task) => <div key={task.id}><span className={`priority ${task.priority.toLowerCase()}`}/><strong>{task.title}</strong><small>{task.owner} · {task.due}</small><span className={`status ${task.status.toLowerCase().replace(" ", "-")}`}>{task.status}</span></div>)}</div>}
        {taskView === "Quadro" && <div className="kanban">{(["Pendente", "Em aprovação", "Aprovado", "Executado"] as Status[]).map((status) => <div className="kanban-column" key={status}><header><strong>{status}</strong><span>{tasks.filter((task) => task.status === status).length}</span></header>{tasks.filter((task) => task.status === status).map((task) => <article key={task.id}><span className={task.priority === "Alta" ? "tag red-tag" : "tag"}>{task.company}</span><strong>{task.title}</strong><p>{task.owner} · {task.due}</p></article>)}</div>)}</div>}
        {taskView === "Calendário" && <div className="calendar-view"><div className="calendar-title"><button className="secondary-button" onClick={() => setCalendarCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>‹</button><strong>{calendarCursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</strong><button className="secondary-button" onClick={() => setCalendarCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>›</button></div><div className="calendar-weekdays">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid monthly">{calendarCells.map((day, index) => <div key={`${calendarCursor.toISOString()}-${index}`} className={day ? "calendar-day" : "calendar-day outside"}>{day && <><strong>{day}</strong>{tasks.filter((task) => { const date = taskDate(task.due); return date?.getFullYear() === calendarCursor.getFullYear() && date.getMonth() === calendarCursor.getMonth() && date.getDate() === day; }).map((task) => <button key={task.id} className="calendar-task" onClick={() => setDetailTask(task)}>{task.title}</button>)}</>}</div>)}</div></div>}
        {taskView === "Gantt" && <div className="gantt-view"><div className="gantt-scale"><span>03 ago</span><span>05 ago</span><span>07 ago</span><span>11 ago</span></div>{tasks.map((task, index) => <div className="gantt-row" key={task.id}><strong>{task.title}</strong><div><i style={{ marginLeft: `${index * 12}%`, width: `${34 + (index % 3) * 12}%` }}>{task.status}</i></div></div>)}</div>}
      </section>}
      </div>
    </section>
      {showModal && <div className="modal-backdrop" role="presentation"><form className="modal" onSubmit={(event) => { event.preventDefault(); void createTask(event.currentTarget); }}><div className="modal-heading"><div><p className="eyebrow">NOVA TAREFA</p><h2>Criar a partir de uma lista</h2></div><button type="button" className="close" onClick={() => setShowModal(false)}>×</button></div><div className="modal-tabs"><button type="button" className="selected">Em branco</button><button type="button" onClick={() => { setSection("Templates"); setShowModal(false); }}>A partir de template</button></div><label>Lista<select name="listId" defaultValue={selectedListId ?? allLists[0]?.id} required>{allLists.map((list) => <option value={list.id} key={list.id}>{list.department} / {list.folder} / {list.name}</option>)}</select></label><label>Título<input name="title" required placeholder="Ex.: Conferir pagamento de fornecedor" /></label><div className="form-row"><label>Tipo<select name="taskType" defaultValue="Tarefa"><option>Tarefa</option><option>Aprovação</option><option>Financeiro</option></select></label><label>Responsável<select name="owner" defaultValue="Marina"><option>Marina</option><option>Carlos</option><option>Ana</option></select></label></div><div className="form-row"><label>Vencimento<input name="due" type={usesRemoteTasks ? "date" : undefined} required placeholder="Ex.: 08 ago" /></label><label>Valor previsto<input name="value" type="number" min="0" step="0.01" defaultValue="0" /></label></div><div className="form-row"><label>Empresa<select name="company" defaultValue="ITP"><option>ITP</option><option>Locabox</option></select></label><label>Categoria<select name="category" defaultValue="Fornecedores"><option>Fornecedores</option><option>Obras</option><option>Locações</option><option>Despesas</option><option>Documentos</option></select></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowModal(false)}>Cancelar</button><button className="primary-button" type="submit">Criar tarefa</button></div></form></div>}
    {createTarget && <div className="modal-backdrop" role="presentation"><form className="modal compact-modal" onSubmit={createWorkspaceEntity}><div className="modal-heading"><div><p className="eyebrow">{createTarget === "mensagem" ? "MENSAGEM DIRETA" : createTarget.toUpperCase()}</p><h2>{createTarget === "canal" ? "Criar canal" : createTarget === "mensagem" ? "Nova mensagem direta" : createTarget === "departamento" ? "Criar departamento" : createTarget === "pasta" ? `Criar pasta em ${activeDepartment}` : `Criar lista em ${activeDepartment}`}</h2></div><button type="button" className="close" onClick={() => { setCreateTarget(null); setNewEntityName(""); }}>×</button></div><label>{createTarget === "mensagem" ? "Pessoa" : "Nome"}<input autoFocus required value={newEntityName} onChange={(event) => setNewEntityName(event.target.value)} placeholder={createTarget === "canal" ? "Ex.: pagamentos" : createTarget === "mensagem" ? "Ex.: Ana Souza" : createTarget === "pasta" ? "Ex.: Conciliações" : createTarget === "lista" ? "Ex.: Conferência de notas" : "Ex.: Manutenção"}/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setCreateTarget(null)}>Cancelar</button><button className="primary-button" type="submit">Criar</button></div></form></div>}
    {entityMenu && <div className="modal-backdrop" role="presentation"><section className="entity-menu" role="dialog"><button onClick={() => renameEntity(entityMenu)}>Renomear</button>{entityMenu.kind === "departamento" && <button onClick={() => { setDepartmentStatus((current) => ({ ...current, [entityMenu.department]: current[entityMenu.department] === "Em pausa" ? "Ativo" : "Em pausa" })); setNotice("Status do departamento atualizado."); setEntityMenu(null); }}>Editar status <small>{departmentStatus[entityMenu.department] ?? "Ativo"}</small></button>}<button onClick={() => { setTemplates((current) => [...current, { id: Date.now(), name: entityMenu.kind === "departamento" ? entityMenu.department : departmentFolders[entityMenu.department]?.find((folder) => folder.id === entityMenu.folderId)?.name ?? "Novo template", category: entityMenu.kind === "departamento" ? "Departamento" : "Pasta", description: "Template salvo a partir da árvore de trabalho." }]); setNotice("Item salvo como template."); setEntityMenu(null); }}>Salvar como template</button><button onClick={() => { setShareTarget(entityMenu); setEntityMenu(null); }}>Compartilhamento e permissões</button><button className="danger" onClick={() => deleteEntity(entityMenu)}>Excluir</button><button className="menu-cancel" onClick={() => setEntityMenu(null)}>Cancelar</button></section></div>}
    {shareTarget && <div className="modal-backdrop" role="presentation"><form className="modal compact-modal" onSubmit={(event) => { event.preventDefault(); setShareTarget(null); setNotice("Permissões atualizadas neste navegador."); }}><div className="modal-heading"><div><p className="eyebrow">COMPARTILHAMENTO</p><h2>Permissões</h2></div><button type="button" className="close" onClick={() => setShareTarget(null)}>×</button></div><label>Acesso<select defaultValue="departamento"><option value="departamento">Membros do departamento</option><option value="restrito">Somente pessoas convidadas</option></select></label><label>Convidar por nome ou e-mail<input placeholder="Ex.: ana@itplocabox.com.br" /></label><div className="modal-actions"><button className="primary-button" type="submit">Salvar permissões</button></div></form></div>}
    {detailTask && <TaskDetail task={detailTask} onClose={() => setDetailTask(null)} />}
  </main>;
}

function App() {
  return <AuthGate><Workspace /></AuthGate>;
}

export default App;
