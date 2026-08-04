import { useEffect, useMemo, useState } from "react";
import { Bell, Building2, CalendarDays, Check, ChevronDown, ChevronRight, CirclePlus, ClipboardList, Clock3, FileText, Folder, Hash, LayoutDashboard, List, MessageCircle, MoreHorizontal, Search, Send, Settings, ShieldCheck, Sparkles, Users } from "lucide-react";
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
import { OrganizationAssignments } from "./OrganizationAssignments";
import { TaskDetail } from "./TaskDetail";
import { ApprovalsPage, CalendarPage, ProfilePage, SettingsPage } from "./ProductPages";
import { addChannelMember, archiveFinancialTask, clearReadNotifications, createChannelMessage, createDirectMessage, createFinancialTask, createWorkspaceChannel, createWorkspaceDepartment, createWorkspaceDocument, createWorkspaceFolder, createWorkspaceList, createWorkspaceTemplate, decideFinancialApproval, loadActiveWorkspaceUsers, loadArchivedFinancialTasks, loadChannelMembers, loadChannelMessages, loadFinancialTasks, loadNotifications, loadWorkspaceChannels, loadWorkspaceDocuments, loadWorkspaceHierarchy, loadWorkspaceTemplates, markAllNotificationsRead, markNotificationRead, removeChannelMember, snoozeNotification, updateFinancialTask, updateFinancialTaskStatus, updateWorkspaceDocument, type RemoteChannelMember, type RemoteWorkspaceUser } from "./workspaceRepository";
import { supabase } from "./supabaseClient";
import { askFinanceiroAssistant } from "./assistantClient";

type Status = "Pendente" | "Em aprovação" | "Aprovado" | "Executado";
type Task = { id: string | number; title: string; company: "ITP" | "Locabox"; category: string; start?: string; due: string; owner: string; value: number; status: Status; priority: "Alta" | "Média" | "Baixa"; listId: string; taskType: "Tarefa" | "Aprovação" | "Financeiro" };
type CreateTarget = "canal" | "mensagem" | "departamento" | "pasta" | "lista";
type WorkspaceList = { id: string; name: string };
type DepartmentFolder = { id: string; name: string; lists: WorkspaceList[] };
type EntityMenu = { kind: "departamento" | "pasta"; department: string; folderId?: string };

const initialTasks: Task[] = [
  { id: 1, title: "Aprovar pagamento de fornecedor", company: "ITP", category: "Fornecedores", start: "01 ago", due: "Hoje", owner: "Marina", value: 28450, status: "Em aprovação", priority: "Alta", listId: "financeiro-pagamentos", taskType: "Aprovação" },
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
const ganttStyle = (task: { start?: string; due: string }, month: Date) => {
  const start = taskDate(task.start ?? task.due) ?? taskDate(task.due);
  const due = taskDate(task.due) ?? start;
  if (!start || !due) return { marginLeft: "0%", width: "8%" };
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0, 12);
  if (due < firstDay || start > lastDay) return { display: "none" };
  const visibleStart = start < firstDay ? firstDay : start;
  const visibleDue = due > lastDay ? lastDay : due;
  const totalDays = lastDay.getDate();
  const duration = Math.max(1, Math.round((visibleDue.getTime() - visibleStart.getTime()) / 86_400_000) + 1);
  return { marginLeft: `${((visibleStart.getDate() - 1) / totalDays) * 100}%`, width: `${Math.min(100 - ((visibleStart.getDate() - 1) / totalDays) * 100, (duration / totalDays) * 100)}%` };
};
const ganttScale = (month: Date) => {
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return [1, Math.min(11, lastDay), Math.min(21, lastDay), lastDay].map((day) => new Date(month.getFullYear(), month.getMonth(), day, 12).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", ""));
};

function Workspace() {
  const [tasks, setTasks] = usePersistentState("itp-financeiro-tasks", initialTasks);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [section, setSection] = useState("Visão geral");
  const [filter, setFilter] = usePersistentState<"Todos" | Status>("itp-financeiro-status-filter", "Todos");
  const [companyFilter, setCompanyFilter] = usePersistentState<"Todas" | Task["company"]>("itp-financeiro-company-filter", "Todas");
  const [priorityFilter, setPriorityFilter] = usePersistentState<"Todas" | Task["priority"]>("itp-financeiro-priority-filter", "Todas");
  const [taskOrder, setTaskOrder] = usePersistentState<"recentes" | "valor" | "vencimento">("itp-financeiro-task-order", "recentes");
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState("");
  const [assistantError, setAssistantError] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [channelMessage, setChannelMessage] = useState("");
  const [channelOpen, setChannelOpen] = useState(false);
  const [channelName, setChannelName] = useState("Geral");
  const [remoteChannels, setRemoteChannels] = useState<{ id: string; name: string; isPrivate: boolean; kind: "geral" | "departamento" | "direto" }[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [newChannelPrivate, setNewChannelPrivate] = useState(false);
  const [channelMembersOpen, setChannelMembersOpen] = useState(false);
  const [channelMembers, setChannelMembers] = useState<RemoteChannelMember[]>([]);
  const [workspaceUsers, setWorkspaceUsers] = useState<RemoteWorkspaceUser[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [templates, setTemplates] = usePersistentState<TaskTemplate[]>("itp-financeiro-templates", []);
  const [templateForTask, setTemplateForTask] = useState<TaskTemplate | null>(null);
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
  const [taskView, setTaskView] = usePersistentState<"Lista" | "Quadro" | "Calendário" | "Gantt">("itp-financeiro-task-view", "Lista");
  const [calendarCursor, setCalendarCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [usesRemoteTasks, setUsesRemoteTasks] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<Task["id"] | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistentState("itp-financeiro-sidebar-collapsed", false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setGlobalSearch(""); setGlobalSearchOpen(true); }
      if (event.key === "Escape") { setGlobalSearchOpen(false); setDetailTask(null); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
  useEffect(() => {
    if (!usesRemoteTasks) return;
    void loadWorkspaceChannels().then((items) => { if (items?.length) { const shared = items.filter((item) => item.kind !== "direto"); const direct = items.filter((item) => item.kind === "direto"); setRemoteChannels(items); setChannels(shared.map((item) => item.name)); setDirectMessages(direct.map((item) => item.name)); const first = shared[0] ?? direct[0]; if (first) { setChannelName(first.name); setActiveChannelId(first.id); } } }).catch(() => setNotice("Não foi possível carregar os canais compartilhados."));
  }, [setChannels, setDirectMessages, usesRemoteTasks]);
  useEffect(() => {
    if (!usesRemoteTasks || !activeChannelId) return;
    void loadChannelMessages(activeChannelId).then((items) => setMessages(items.map((item) => ({ author: item.author, initials: "EQ", time: "", text: item.content })))).catch(() => setNotice("Não foi possível carregar as mensagens do canal."));
  }, [activeChannelId, setMessages, usesRemoteTasks]);
  useEffect(() => {
    if (!usesRemoteTasks) return;
    void loadNotifications().then((items) => { if (items) setInboxItems(items); }).catch(() => setNotice("Não foi possível carregar sua Caixa de Entrada."));
  }, [setInboxItems, usesRemoteTasks]);
  useEffect(() => {
    if (!usesRemoteTasks) return;
    void loadWorkspaceDocuments().then((items) => { if (items) setDocuments(items); }).catch(() => setNotice("Não foi possível carregar os documentos compartilhados."));
  }, [setDocuments, usesRemoteTasks]);
  useEffect(() => {
    if (!usesRemoteTasks) return;
    void loadWorkspaceTemplates().then((items) => { if (items) setTemplates(items); }).catch(() => setNotice("Não foi possível carregar os templates compartilhados."));
  }, [setTemplates, usesRemoteTasks]);
  useEffect(() => {
    if (!usesRemoteTasks) return;
    void loadActiveWorkspaceUsers().then(setWorkspaceUsers).catch(() => setNotice("Não foi possível carregar os responsáveis disponíveis."));
  }, [usesRemoteTasks]);
  useEffect(() => {
    const client = supabase;
    if (!client || !usesRemoteTasks) return;
    const channel = client.channel("notificacoes-financeiro").on("postgres_changes", { event: "INSERT", schema: "public", table: "notificacoes" }, () => {
      void loadNotifications().then((items) => { if (items) setInboxItems(items); });
    }).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [setInboxItems, usesRemoteTasks]);
  useEffect(() => {
    const client = supabase;
    if (!client || !usesRemoteTasks || !activeChannelId) return;
    const channel = client.channel(`mensagens-${activeChannelId}`).on("postgres_changes", { event: "*", schema: "public", table: "mensagens_canal", filter: `canal_id=eq.${activeChannelId}` }, () => { void loadChannelMessages(activeChannelId).then((items) => setMessages(items.map((item) => ({ author: item.author, initials: "EQ", time: "", text: item.content })))); }).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [activeChannelId, setMessages, usesRemoteTasks]);
  const allLists = useMemo(() => Object.entries(departmentFolders).flatMap(([department, folders]) => folders.flatMap((folder) => folder.lists.map((rawList) => ({ ...asWorkspaceList(rawList, department, folder.id), department, folder: folder.name })))), [departmentFolders]);
  const selectedList = allLists.find((list) => list.id === selectedListId);
  const activeChannelIsPrivate = remoteChannels.find((channel) => channel.id === activeChannelId)?.isPrivate ?? false;
  const globalResults = useMemo(() => {
    const query = globalSearch.trim().toLowerCase(); if (!query) return [] as { kind: string; label: string; action: () => void }[];
    return [
      ...tasks.filter((task) => task.title.toLowerCase().includes(query)).map((task) => ({ kind: "Atividade", label: task.title, action: () => { setDetailTask(task); setGlobalSearchOpen(false); } })),
      ...documents.filter((document) => `${document.title} ${document.body}`.toLowerCase().includes(query)).map((document) => ({ kind: "Documento", label: document.title || "Sem título", action: () => { setSection("Documentos"); setGlobalSearchOpen(false); } })),
      ...templates.filter((template) => `${template.name} ${template.description}`.toLowerCase().includes(query)).map((template) => ({ kind: "Template", label: template.name, action: () => { setSection("Templates"); setGlobalSearchOpen(false); } })),
      ...channels.filter((channel) => channel.toLowerCase().includes(query)).map((channel) => ({ kind: "Canal", label: `# ${channel}`, action: () => { setChannelName(channel); setActiveChannelId(remoteChannels.find((item) => item.name === channel)?.id ?? null); setChannelOpen(true); setSection("Canais"); setGlobalSearchOpen(false); } })),
      ...workspaceUsers.filter((user) => user.name.toLowerCase().includes(query)).map((user) => ({ kind: "Pessoa", label: user.name, action: () => { setSection("Equipe"); setGlobalSearchOpen(false); } })),
    ].slice(0, 12);
  }, [channels, documents, globalSearch, remoteChannels, tasks, templates, workspaceUsers]);
  const visibleTasks = useMemo(() => tasks.filter((task) => (filter === "Todos" || task.status === filter) && (companyFilter === "Todas" || task.company === companyFilter) && (priorityFilter === "Todas" || task.priority === priorityFilter) && task.title.toLowerCase().includes(search.toLowerCase()) && (!selectedListId || (task.listId || "financeiro-pagamentos") === selectedListId)).sort((a, b) => taskOrder === "valor" ? b.value - a.value : taskOrder === "vencimento" ? (taskDate(a.due)?.getTime() ?? Number.MAX_SAFE_INTEGER) - (taskDate(b.due)?.getTime() ?? Number.MAX_SAFE_INTEGER) : 0), [tasks, filter, companyFilter, priorityFilter, taskOrder, search, selectedListId]);
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
  const archiveTask = async (task: Task) => {
    if (!window.confirm(`Arquivar “${task.title}”? Você poderá recuperá-la posteriormente.`)) return;
    if (usesRemoteTasks && typeof task.id === "string") { try { await archiveFinancialTask(task.id); } catch { setNotice("Não foi possível arquivar a atividade compartilhada."); return; } }
    setTasks((current) => current.filter((item) => item.id !== task.id)); setDetailTask(null); setNotice("Tarefa arquivada.");
  };
  const toggleArchived = async () => {
    if (showArchived) { setShowArchived(false); return; }
    if (usesRemoteTasks) { try { const items = await loadArchivedFinancialTasks(); setArchivedTasks(items ?? []); } catch { setNotice("Não foi possível carregar as tarefas arquivadas."); return; } }
    setShowArchived(true);
  };
  const restoreTask = async (task: Task) => {
    if (usesRemoteTasks && typeof task.id === "string") { try { await archiveFinancialTask(task.id, false); } catch { setNotice("Não foi possível restaurar a atividade."); return; } }
    setArchivedTasks((current) => current.filter((item) => item.id !== task.id)); setTasks((current) => [task, ...current]); setNotice("Tarefa restaurada.");
  };
  const saveTask = async (task: Task, patch: Pick<Task, "title" | "start" | "due" | "value" | "priority" | "status" | "taskType">) => {
    if (usesRemoteTasks && typeof task.id === "string") await updateFinancialTask(task.id, patch);
    const updated = { ...task, ...patch };
    setTasks((current) => current.map((item) => item.id === task.id ? updated : item));
    setDetailTask(updated);
    setNotice("Atividade atualizada.");
  };
  const moveTaskToStatus = async (status: Status) => {
    const task = tasks.find((item) => item.id === draggedTaskId);
    setDraggedTaskId(null);
    if (!task || task.status === status) return;
    if (usesRemoteTasks && typeof task.id === "string") { try { await updateFinancialTaskStatus(task.id, status); } catch { setNotice("Não foi possível mover a atividade compartilhada."); return; } }
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status } : item));
    setNotice(`Atividade movida para ${status}.`);
  };

  const createTask = async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const responsibleId = String(data.get("responsavelId") ?? "");
    const task: Task = { id: Date.now(), title: String(data.get("title")), company: String(data.get("company")) as Task["company"], category: String(data.get("category")), start: String(data.get("start") ?? ""), due: String(data.get("due")), owner: workspaceUsers.find((user) => user.id === responsibleId)?.name ?? String(data.get("owner") ?? "Não atribuído"), value: Number(data.get("value")), priority: "Média", status: "Pendente", listId: String(data.get("listId")), taskType: String(data.get("taskType")) as Task["taskType"] };
    if (usesRemoteTasks) {
      try {
        const remoteTask = await createFinancialTask(task, responsibleId || undefined);
        setTasks((current) => [{ ...remoteTask, owner: task.owner }, ...current]);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Não foi possível criar a atividade compartilhada.");
        return;
      }
    } else setTasks((current) => [task, ...current]);
    setSelectedListId(task.listId); setShowModal(false); setTemplateForTask(null); setNotice("Tarefa criada na lista selecionada."); window.setTimeout(() => setNotice(""), 3600);
  };

  const sendChannelMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!channelMessage.trim()) return;
    if (usesRemoteTasks && activeChannelId) { try { await createChannelMessage(activeChannelId, channelMessage.trim()); } catch { setNotice("Não foi possível enviar a mensagem compartilhada."); return; } }
    setMessages((current) => [...current, { author: "Marina Alves", initials: "MA", time: "agora", text: channelMessage.trim() }]);
    setChannelMessage("");
    setNotice("Mensagem enviada ao canal # pagamentos-e-aprovacoes.");
  };

  const openChannelMembers = async () => {
    if (!usesRemoteTasks || !activeChannelId) return;
    try {
      const [members, users] = await Promise.all([loadChannelMembers(activeChannelId), loadActiveWorkspaceUsers()]);
      setChannelMembers(members); setWorkspaceUsers(users); setMemberSearch(""); setChannelMembersOpen(true);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível carregar os membros do canal."); }
  };

  const changeChannelMember = async (userId: string, action: "add" | "remove") => {
    if (!activeChannelId) return;
    try {
      if (action === "add") await addChannelMember(activeChannelId, userId);
      else await removeChannelMember(activeChannelId, userId);
      setChannelMembers(await loadChannelMembers(activeChannelId));
      setNotice(action === "add" ? "Membro adicionado ao canal privado." : "Membro removido do canal privado.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível atualizar os membros do canal."); }
  };

  const createWorkspaceEntity = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newEntityName.trim();
    if (!name || !createTarget) return;
    if (createTarget === "mensagem" && usesRemoteTasks) {
      const target = workspaceUsers.find((user) => user.id === newEntityName);
      if (!target) { setNotice("Selecione uma pessoa ativa para iniciar a conversa."); return; }
      try { const channel = await createDirectMessage(target); setRemoteChannels((current) => [...current, channel]); setDirectMessages((current) => [...current, channel.name]); setChannelName(channel.name); setActiveChannelId(channel.id); setChannelOpen(true); setSection("Canais"); }
      catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível criar a mensagem direta."); return; }
      setNotice(`Conversa privada iniciada com ${target.name}.`); setNewEntityName(""); setCreateTarget(null); return;
    }
    if (createTarget === "canal" && usesRemoteTasks) {
      try { const channel = await createWorkspaceChannel(name, newChannelPrivate); setRemoteChannels((current) => [...current, channel]); setChannels((current) => [...current, channel.name]); setChannelName(channel.name); setActiveChannelId(channel.id); setChannelOpen(true); setSection("Canais"); }
      catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível criar o canal compartilhado."); return; }
      setNotice(newChannelPrivate ? "Canal privado criado. Adicione os participantes." : "Canal criado para a equipe."); setNewEntityName(""); setNewChannelPrivate(false); setCreateTarget(null); return;
    }
    if (["departamento", "pasta", "lista"].includes(createTarget) && usesRemoteTasks) {
      try {
        if (createTarget === "departamento") await createWorkspaceDepartment(name);
        if (createTarget === "pasta") await createWorkspaceFolder(activeDepartment, name);
        if (createTarget === "lista") {
          if (!selectedFolderId) throw new Error("Selecione uma pasta antes de criar a lista.");
          await createWorkspaceList(selectedFolderId, name);
        }
        const remoteDepartments = await loadWorkspaceHierarchy();
        if (remoteDepartments?.length) {
          setDepartments(remoteDepartments.map((department) => department.name));
          setDepartmentFolders(Object.fromEntries(remoteDepartments.map((department) => [department.name, department.folders])));
          if (createTarget === "departamento") { setActiveDepartment(name); setExpandedDepartment(name); setSelectedFolderId(null); setSelectedListId(null); }
          if (createTarget === "pasta") { const folder = remoteDepartments.find((department) => department.name === activeDepartment)?.folders.find((item) => item.name === name); setSelectedFolderId(folder?.id ?? null); }
          if (createTarget === "lista") { const folder = remoteDepartments.flatMap((department) => department.folders).find((item) => item.id === selectedFolderId); const list = folder?.lists.find((item) => item.name === name); setSelectedListId(list?.id ?? null); }
        }
      } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível criar a estrutura compartilhada."); return; }
      const label = createTarget === "departamento" ? "Departamento" : createTarget === "pasta" ? "Pasta" : "Lista";
      setNotice(`${label} criado(a) para toda a equipe.`); setNewEntityName(""); setCreateTarget(null); return;
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

  const askAssistant = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = assistantQuestion.trim();
    if (!question || assistantLoading) return;
    setAssistantLoading(true); setAssistantError(""); setAssistantAnswer("");
    try { setAssistantAnswer(await askFinanceiroAssistant(question)); }
    catch (error) { setAssistantError(error instanceof Error ? error.message : "Não foi possível consultar o assistente."); }
    finally { setAssistantLoading(false); }
  };

  return <main className="app-shell">
    <aside className={sidebarCollapsed ? "sidebar collapsed" : "sidebar"}>
      <div className="brand"><div className="brand-mark">L</div><div><strong>ITP <span>/</span> Locabox</strong><small>Gestão financeira</small></div><button className="sidebar-toggle" aria-label={sidebarCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"} onClick={() => setSidebarCollapsed((current) => !current)}>{sidebarCollapsed ? "›" : "‹"}</button></div>
      <nav>
        {[{ label: "Visão geral", icon: LayoutDashboard }, { label: "Caixa de Entrada", icon: Bell }, { label: "Atividades", icon: ClipboardList }, { label: "Aprovações", icon: ShieldCheck }, { label: "Calendário", icon: CalendarDays }, { label: "Documentos", icon: FileText }, { label: "Templates", icon: FileText }].map(({ label, icon: Icon }) => <button key={label} className={section === label ? "nav-link active" : "nav-link"} onClick={() => { setSection(label); setChannelOpen(false); }}><Icon size={18} />{label}{label === "Aprovações" && approvalTasks.length > 0 && <b>{approvalTasks.length}</b>}</button>)}
      </nav>
      <div className="channel-nav">
        <div className="sidebar-group-title"><p>CANAIS</p><button aria-label="Adicionar canal" onClick={() => setCreateTarget("canal")}>+</button></div>
        {channels.map((channel) => <button key={channel} className={channelOpen && channelName === channel ? "nav-link active" : "nav-link"} onClick={() => { setChannelName(channel); setActiveChannelId(remoteChannels.find((item) => item.name === channel)?.id ?? null); setChannelOpen(true); setSection("Canais"); }}><Hash size={18} />{channel}</button>)}
        <button className="sidebar-add" onClick={() => setCreateTarget("canal")}>+ Adicionar canal</button>
        <div className="sidebar-group-title"><p>MENSAGENS DIRETAS</p><button aria-label="Nova mensagem direta" onClick={() => setCreateTarget("mensagem")}>+</button></div>
        {directMessages.map((person) => <button key={person} className={channelOpen && channelName === person ? "nav-link active" : "nav-link"} onClick={() => { setChannelName(person); setActiveChannelId(remoteChannels.find((item) => item.name === person && item.kind === "direto")?.id ?? null); setChannelOpen(true); setSection("Canais"); }}><MessageCircle size={18} />{person}</button>)}
        <button className="sidebar-add" onClick={() => setCreateTarget("mensagem")}>+ Nova mensagem</button>
        <div className="sidebar-group-title"><p>DEPARTAMENTOS</p><span><button aria-label="Buscar departamentos" onClick={() => setNotice("Busca de departamentos será conectada aos dados compartilhados.")}><Search size={15}/></button><button aria-label="Criar departamento" onClick={() => setCreateTarget("departamento")}>+</button></span></div>
        <button className={!channelOpen && section === "Visão geral" && activeDepartment === "Todos os departamentos" ? "nav-link active" : "nav-link"} onClick={() => { setActiveDepartment("Todos os departamentos"); setChannelOpen(false); setSection("Visão geral"); }}><Building2 size={18}/>Todos os departamentos</button>
        {departments.map((department) => <div className="department-tree" key={department}><div className={activeDepartment === department && !channelOpen ? "tree-row active" : "tree-row"}><button className="tree-toggle" aria-label={`Expandir ${department}`} onClick={() => setExpandedDepartment(expandedDepartment === department ? null : department)}>{expandedDepartment === department ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}</button><button className="tree-name" onClick={() => { setActiveDepartment(department); setChannelOpen(false); setSection("Visão geral"); setSelectedFolderId(departmentFolders[department]?.[0]?.id ?? null); }}><Building2 size={17}/>{department}</button><button aria-label={`Mais opções de ${department}`} onClick={() => setEntityMenu({ kind: "departamento", department })}><MoreHorizontal size={16}/></button><button aria-label={`Criar pasta em ${department}`} onClick={() => { setActiveDepartment(department); setCreateTarget("pasta"); }}>+</button></div>{expandedDepartment === department && <div className="folder-tree">{(departmentFolders[department] ?? []).map((folder) => <div key={folder.id}><div className={selectedFolderId === folder.id ? "folder-row selected" : "folder-row"}><button className="tree-toggle" aria-label={`Expandir pasta ${folder.name}`} onClick={() => setExpandedFolders((current) => current.includes(folder.id) ? current.filter((id) => id !== folder.id) : [...current, folder.id])}>{expandedFolders.includes(folder.id) ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</button><button className="tree-name" onClick={() => setSelectedFolderId(folder.id)}><Folder size={16}/>{folder.name}</button><button aria-label={`Mais opções de ${folder.name}`} onClick={() => setEntityMenu({ kind: "pasta", department, folderId: folder.id })}><MoreHorizontal size={15}/></button><button aria-label={`Criar lista em ${folder.name}`} onClick={() => { setSelectedFolderId(folder.id); setCreateTarget("lista"); }}>+</button></div>{expandedFolders.includes(folder.id) && folder.lists.map((rawList) => { const list = asWorkspaceList(rawList, department, folder.id); return <button className={selectedListId === list.id ? "list-row selected" : "list-row"} key={list.id} onClick={() => { setSelectedListId(list.id); setSelectedFolderId(folder.id); setActiveDepartment(department); setChannelOpen(false); setSection("Atividades"); }}><List size={15}/>{list.name}<span>{tasks.filter((task) => (task.listId || "financeiro-pagamentos") === list.id).length}</span></button>; })}</div>)}<button className="sidebar-add" onClick={() => setCreateTarget("pasta")}>+ Criar pasta</button></div>}</div>)}
        <button className="sidebar-add" onClick={() => setCreateTarget("departamento")}>+ Criar espaço</button>
      </div>
      <div className="nav-group"><p>GERENCIAR</p>{[{ label: "Empresas", icon: Building2 }, { label: "Equipe", icon: Users }, { label: "Configurações", icon: Settings }].map(({ label, icon: Icon }) => <button key={label} className={section === label ? "nav-link active" : "nav-link"} onClick={() => { setSection(label); setChannelOpen(false); }}><Icon size={18} />{label}</button>)}</div>
      <button className="profile" onClick={() => { setSection("Perfil"); setChannelOpen(false); }}><div className="avatar">MA</div><div><strong>Marina Alves</strong><small>Financeiro</small></div><ChevronDown size={16} /></button>
    </aside>
    <section className="workspace">
      <header><div><p className="eyebrow">{selectedList ? `${selectedList.department.toUpperCase()} / ${selectedList.folder.toUpperCase()}` : `${activeDepartment.toUpperCase()} / AGOSTO 2026`}</p><h1>{selectedList ? selectedList.name : section}</h1></div><div className="header-actions"><button className="secondary-button" onClick={() => { setAssistantOpen(true); setAssistantError(""); }}><Sparkles size={16}/>Assistente</button><button className="secondary-button global-search-button" onClick={() => { setGlobalSearch(""); setGlobalSearchOpen(true); }}><Search size={16}/>Buscar <kbd>Ctrl K</kbd></button><button className="icon-button" aria-label="Notificações"><Bell size={19} /><i /></button><button className="primary-button" onClick={() => setShowModal(true)}><CirclePlus size={18} />Nova tarefa</button></div></header>
      <div className="task-filter-console"><label>Empresa<select value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value as typeof companyFilter)}><option>Todas</option><option>ITP</option><option>Locabox</option></select></label><label>Prioridade<select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as typeof priorityFilter)}><option>Todas</option><option>Alta</option><option>Média</option><option>Baixa</option></select></label><label>Ordenar<select value={taskOrder} onChange={(event) => setTaskOrder(event.target.value as typeof taskOrder)}><option value="recentes">Mais recentes</option><option value="vencimento">Vencimento</option><option value="valor">Maior valor</option></select></label></div>
      {notice && <div className="notice"><Check size={17} />{notice}</div>}
      {section === "Templates" && <TemplatesLibrary templates={templates} onSaveCurrent={() => { const template = { id: Date.now(), name: "Rotina de pagamentos", category: "Processo financeiro", description: "Lista, responsáveis e campos financeiros reutilizáveis." }; if (!usesRemoteTasks) { setTemplates((current) => [...current, template]); setNotice("Visão salva como template do departamento."); return; } void createWorkspaceTemplate(template).then((saved) => { setTemplates((current) => [saved, ...current]); setNotice("Template salvo para a equipe."); }).catch(() => setNotice("Não foi possível salvar o template compartilhado.")); }} onUse={(template) => { setTemplateForTask(template); setShowModal(true); setNotice(`Template “${template.name}” aplicado à nova tarefa.`); }} />}
      {section === "Caixa de Entrada" && <Inbox items={inboxItems} onMarkRead={(id) => { if (usesRemoteTasks && typeof id === "string") void markNotificationRead(id).catch(() => setNotice("Não foi possível marcar a notificação como lida.")); setInboxItems((current) => current.map((item) => item.id === id ? { ...item, read: true } : item)); }} onMarkAllRead={() => { if (usesRemoteTasks) void markAllNotificationsRead().catch(() => setNotice("Não foi possível marcar as notificações como lidas.")); setInboxItems((current) => current.map((item) => ({ ...item, read: true }))); }} onClearRead={() => { if (usesRemoteTasks) void clearReadNotifications().catch(() => setNotice("Não foi possível limpar notificações lidas.")); setInboxItems((current) => current.filter((item) => !item.read)); }} onSnooze={(id, until) => { if (usesRemoteTasks && typeof id === "string") void snoozeNotification(id, until).catch(() => setNotice("Não foi possível adiar a notificação.")); setInboxItems((current) => current.map((item) => item.id === id ? { ...item, snoozedUntil: until } : item)); }} />}
      {section === "Documentos" && <DocumentsWorkspace documents={documents} onCreate={() => { if (!usesRemoteTasks) { setDocuments((current) => [...current, { id: Date.now(), title: "Sem título", body: "", updated: "agora" }]); return; } void createWorkspaceDocument().then((document) => setDocuments((current) => [document, ...current])).catch(() => setNotice("Não foi possível criar o documento compartilhado.")); }} onUpdate={(id, patch) => { setDocuments((current) => current.map((document) => document.id === id ? { ...document, ...patch } : document)); if (usesRemoteTasks && typeof id === "string") void updateWorkspaceDocument(id, { title: patch.title, body: patch.body }).catch(() => setNotice("Não foi possível salvar o documento compartilhado.")); }} />}
      {section === "Equipe" && <><AdminUsers /><OrganizationAssignments /></>}
      {section === "Empresas" && <CompaniesManagement />}
      {section === "Aprovações" && <ApprovalsPage tasks={approvalTasks} onDecide={(id, approved) => void decideApproval(id, approved)} />}
      {section === "Calendário" && <CalendarPage tasks={tasks} />}
      {section === "Configurações" && <SettingsPage />}
      {section === "Perfil" && <ProfilePage />}
      <div hidden={section === "Templates" || section === "Caixa de Entrada" || section === "Documentos" || section === "Equipe" || section === "Empresas" || section === "Aprovações" || section === "Calendário" || section === "Configurações" || section === "Perfil"}>
      <div className="summary-grid">
        <article><span className="summary-icon blue"><ClipboardList size={19} /></span><p>Atividades abertas</p><strong>{tasks.filter((t) => t.status !== "Executado").length}</strong><small>3 com vencimento esta semana</small></article>
        <article><span className="summary-icon red"><ShieldCheck size={19} /></span><p>Aguardando aprovação</p><strong>{approvalTasks.length}</strong><small>{money(approvalTasks.reduce((sum, task) => sum + task.value, 0))} em análise</small></article>
        <article><span className="summary-icon yellow"><Clock3 size={19} /></span><p>Vencem hoje</p><strong>{tasks.filter((t) => t.due === "Hoje").length}</strong><small>Priorize as atividades críticas</small></article>
        <article><span className="summary-icon green"><Check size={19} /></span><p>Concluídas no mês</p><strong>{tasks.filter((t) => t.status === "Executado").length + 18}</strong><small>+12% frente a julho</small></article>
      </div>
      {!channelOpen && <div className="content-grid">
        <section className="task-panel"><div className="panel-header"><div><h2>{showArchived ? "Tarefas arquivadas" : "Atividades recentes"}</h2><p>{showArchived ? "Histórico que pode ser restaurado" : "Acompanhamento operacional do financeiro"}</p></div><button className="text-button" onClick={() => void toggleArchived()}>{showArchived ? "Voltar às abertas" : "Arquivadas"}</button></div><div className="toolbar"><div className="search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar atividade" /></div>{!showArchived && <div className="filters">{(["Todos", "Pendente", "Em aprovação", "Aprovado", "Executado"] as const).map((item) => <button key={item} className={filter === item ? "filter selected" : "filter"} onClick={() => setFilter(item)}>{item}</button>)}</div>}</div><div className="task-list">{(showArchived ? archivedTasks : visibleTasks).map((task) => <article className="task-row" key={task.id} onClick={() => !showArchived && setDetailTask(task)}><span className={`priority ${task.priority.toLowerCase()}`} /><div className="task-main"><strong>{task.title}</strong><span>{task.company} <em>•</em> {task.category}</span></div><div className="task-meta"><span>Vencimento</span><strong>{task.due}</strong></div><div className="task-meta"><span>Responsável</span><strong>{task.owner}</strong></div><div className="task-value">{money(task.value)}</div>{showArchived ? <button className="secondary-button" onClick={(event) => { event.stopPropagation(); void restoreTask(task); }}>Restaurar</button> : <span className={`status ${task.status.toLowerCase().replace(" ", "-")}`}>{task.status}</span>}</article>)}{(showArchived ? archivedTasks : visibleTasks).length === 0 && <p className="empty">Nenhuma atividade encontrada.</p>}</div></section>
        <aside className="approval-panel"><div className="panel-header"><div><h2>Para sua aprovação</h2><p>Decisões que exigem sua ação</p></div></div>{approvalTasks.map((task) => <article className="approval-card" key={task.id}><span>{task.company}</span><h3>{task.title}</h3><p>{task.category} <em>•</em> {task.due}</p><strong>{money(task.value)}</strong><div><button className="secondary-button" onClick={() => void decideApproval(task.id, false)}>Devolver</button><button className="approve-button" onClick={() => void decideApproval(task.id, true)}>Aprovar</button></div></article>)}{approvalTasks.length === 0 && <p className="empty">Não há aprovações pendentes.</p>}</aside>
      </div>}
      <section className={channelOpen ? "channel-workspace" : "collaboration-strip"}>
        <div className="channel-summary"><span className="channel-icon"><MessageCircle size={18} /></span><p className="eyebrow">{channelName === "Geral" ? "DEPARTAMENTO / FINANCEIRO" : "MENSAGEM DIRETA"}</p><h2>{channelName === "Geral" ? "# Geral" : channelName}</h2><p>{channelName === "Geral" ? "Canal geral para alinhamentos e comunicação da equipe financeira." : "Conversa direta entre membros da equipe."}</p><button className="text-button" onClick={() => { setChannelOpen(!channelOpen); setSection(channelOpen ? "Visão geral" : "Canais"); }}>{channelOpen ? "Voltar ao painel" : "Abrir canal"}</button>{channelOpen && usesRemoteTasks && activeChannelId && activeChannelIsPrivate && <button className="secondary-button channel-members-button" onClick={() => void openChannelMembers()}><Users size={16}/>Membros</button>}</div>
        <div className="channel-thread"><div className="channel-thread-header"><strong>{channelOpen ? "Conversas" : "Últimas mensagens"}</strong><span>{messages.length} mensagens</span></div>{messages.map((message, index) => <div className="message" key={`${message.author}-${index}`}><span className="avatar">{message.initials}</span><div><strong>{message.author} <small>{message.time}</small></strong><p>{message.text}</p></div></div>)}<form className="message-compose" onSubmit={sendChannelMessage}><input value={channelMessage} onChange={(event) => setChannelMessage(event.target.value)} placeholder={channelName === "Geral" ? "Responder no canal geral" : `Mensagem para ${channelName}`} /><button aria-label="Enviar mensagem"><Send size={16}/></button></form></div>
      </section>
      {!channelOpen && <section className="views-studio"><div className="views-heading"><div><p className="eyebrow">DEPARTAMENTO / FINANCEIRO</p><h2>Visões de tarefas</h2></div><div className="view-tabs">{(["Lista", "Quadro", "Calendário", "Gantt"] as const).map((view) => <button key={view} className={taskView === view ? "selected" : ""} onClick={() => setTaskView(view)}>{view}</button>)}<button className="new-view" onClick={() => setNotice("Nova visualização criada. A configuração será salva por departamento no Supabase.")}>+ Nova visão</button></div></div>
        {taskView === "Lista" && <div className="compact-list">{tasks.map((task) => <div key={task.id}><span className={`priority ${task.priority.toLowerCase()}`}/><strong>{task.title}</strong><small>{task.owner} · {task.due}</small><span className={`status ${task.status.toLowerCase().replace(" ", "-")}`}>{task.status}</span></div>)}</div>}
        {taskView === "Quadro" && <div className="kanban">{(["Pendente", "Em aprovação", "Aprovado", "Executado"] as Status[]).map((status) => <div className="kanban-column" key={status} onDragOver={(event) => event.preventDefault()} onDrop={() => void moveTaskToStatus(status)}><header><strong>{status}</strong><span>{tasks.filter((task) => task.status === status).length}</span></header>{tasks.filter((task) => task.status === status).map((task) => <article key={task.id} draggable onDragStart={() => setDraggedTaskId(task.id)} onDragEnd={() => setDraggedTaskId(null)}><span className={task.priority === "Alta" ? "tag red-tag" : "tag"}>{task.company}</span><strong>{task.title}</strong><p>{task.owner} · {task.due}</p></article>)}</div>)}</div>}
        {taskView === "Calendário" && <div className="calendar-view"><div className="calendar-title"><button className="secondary-button" onClick={() => setCalendarCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>‹</button><strong>{calendarCursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</strong><button className="secondary-button" onClick={() => setCalendarCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>›</button></div><div className="calendar-weekdays">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid monthly">{calendarCells.map((day, index) => <div key={`${calendarCursor.toISOString()}-${index}`} className={day ? "calendar-day" : "calendar-day outside"}>{day && <><strong>{day}</strong>{tasks.filter((task) => { const date = taskDate(task.due); return date?.getFullYear() === calendarCursor.getFullYear() && date.getMonth() === calendarCursor.getMonth() && date.getDate() === day; }).map((task) => <button key={task.id} className="calendar-task" onClick={() => setDetailTask(task)}>{task.title}</button>)}</>}</div>)}</div></div>}
        {taskView === "Gantt" && <div className="gantt-view"><div className="calendar-title gantt-controls"><button className="secondary-button" onClick={() => setCalendarCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>‹</button><strong>{calendarCursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</strong><button className="secondary-button" onClick={() => setCalendarCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>›</button></div><div className="gantt-scale">{ganttScale(calendarCursor).map((label) => <span key={label}>{label}</span>)}</div>{tasks.map((task) => <div className="gantt-row" key={task.id}><strong>{task.title}</strong><div><i style={ganttStyle(task, calendarCursor)}>{task.status}</i></div></div>)}</div>}
      </section>}
      </div>
    </section>
    {assistantOpen && <div className="modal-backdrop" role="presentation"><section className="modal compact-modal assistant-modal" role="dialog" aria-modal="true" aria-labelledby="assistant-title"><div className="modal-heading"><div><p className="eyebrow">ASSISTENTE FINANCEIRO</p><h2 id="assistant-title">Consulta e rascunhos</h2></div><button className="close" onClick={() => setAssistantOpen(false)} aria-label="Fechar assistente">×</button></div><p className="assistant-help">Analisa tarefas, documentos e templates que você já pode consultar. Não executa ações.</p><form onSubmit={(event) => void askAssistant(event)}><label>Pergunta<textarea autoFocus value={assistantQuestion} maxLength={1200} onChange={(event) => setAssistantQuestion(event.target.value)} placeholder="Ex.: Resuma as atividades de maior prioridade e sugira um rascunho de cobrança." /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setAssistantOpen(false)}>Fechar</button><button className="primary-button" disabled={assistantLoading || !assistantQuestion.trim()}>{assistantLoading ? "Consultando…" : "Consultar"}</button></div></form>{assistantError && <p className="assistant-error">{assistantError}</p>}{assistantAnswer && <div className="assistant-answer"><strong>Resposta</strong><p>{assistantAnswer}</p></div>}</section></div>}
    {globalSearchOpen && <div className="modal-backdrop" role="presentation"><section className="modal compact-modal global-search-modal" role="dialog" aria-modal="true"><div className="modal-heading"><div><p className="eyebrow">BUSCA GLOBAL</p><h2>Encontre atividades e conteúdo</h2></div><button className="close" onClick={() => setGlobalSearchOpen(false)}>×</button></div><label className="global-search-input"><Search size={17}/><input autoFocus value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} placeholder="Buscar atividades, documentos, templates, canais ou pessoas" /></label><div className="global-results">{globalSearch && globalResults.map((result, index) => <button key={`${result.kind}-${index}`} onClick={result.action}><small>{result.kind}</small><strong>{result.label}</strong></button>)}{globalSearch && globalResults.length === 0 && <p className="empty">Nenhum resultado encontrado.</p>}</div></section></div>}
    {showModal && <div className="modal-backdrop" role="presentation"><form className="modal" onSubmit={(event) => { event.preventDefault(); void createTask(event.currentTarget); }}><div className="modal-heading"><div><p className="eyebrow">NOVA TAREFA</p><h2>Criar a partir de uma lista</h2></div><button type="button" className="close" onClick={() => { setShowModal(false); setTemplateForTask(null); }}>×</button></div><div className="modal-tabs"><button type="button" className={!templateForTask ? "selected" : ""} onClick={() => setTemplateForTask(null)}>Em branco</button><button type="button" className={templateForTask ? "selected" : ""} onClick={() => { setSection("Templates"); setShowModal(false); }}>A partir de template</button></div><label>Lista<select name="listId" defaultValue={selectedListId ?? allLists[0]?.id} required>{allLists.map((list) => <option value={list.id} key={list.id}>{list.department} / {list.folder} / {list.name}</option>)}</select></label><label>Título<input name="title" required defaultValue={templateForTask?.name ?? ""} placeholder="Ex.: Conferir pagamento de fornecedor" /></label><div className="form-row"><label>Tipo<select name="taskType" defaultValue="Tarefa"><option>Tarefa</option><option>Aprovação</option><option>Financeiro</option></select></label><label>Responsável{usesRemoteTasks && workspaceUsers.length > 0 ? <select name="responsavelId" required defaultValue={workspaceUsers[0].id}>{workspaceUsers.map((user) => <option value={user.id} key={user.id}>{user.name}</option>)}</select> : <select name="owner" defaultValue="Marina"><option>Marina</option><option>Carlos</option><option>Ana</option></select>}</label></div><div className="form-row"><label>Início<input name="start" type={usesRemoteTasks ? "date" : undefined} placeholder="Ex.: 01 ago" /></label><label>Vencimento<input name="due" type={usesRemoteTasks ? "date" : undefined} required placeholder="Ex.: 08 ago" /></label></div><div className="form-row"><label>Valor previsto<input name="value" type="number" min="0" step="0.01" defaultValue="0" /></label></div><div className="form-row"><label>Empresa<select name="company" defaultValue="ITP"><option>ITP</option><option>Locabox</option></select></label><label>Categoria<select name="category" defaultValue="Fornecedores"><option>Fornecedores</option><option>Obras</option><option>Locações</option><option>Despesas</option><option>Documentos</option></select></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setShowModal(false); setTemplateForTask(null); }}>Cancelar</button><button className="primary-button" type="submit">Criar tarefa</button></div></form></div>}
    {createTarget && <div className="modal-backdrop" role="presentation"><form className="modal compact-modal" onSubmit={createWorkspaceEntity}><div className="modal-heading"><div><p className="eyebrow">{createTarget === "mensagem" ? "MENSAGEM DIRETA" : createTarget.toUpperCase()}</p><h2>{createTarget === "canal" ? "Criar canal" : createTarget === "mensagem" ? "Nova mensagem direta" : createTarget === "departamento" ? "Criar departamento" : createTarget === "pasta" ? `Criar pasta em ${activeDepartment}` : `Criar lista em ${activeDepartment}`}</h2></div><button type="button" className="close" onClick={() => { setCreateTarget(null); setNewEntityName(""); setNewChannelPrivate(false); }}>×</button></div><label>{createTarget === "mensagem" ? "Pessoa" : "Nome"}{createTarget === "mensagem" && usesRemoteTasks ? <select autoFocus required value={newEntityName} onChange={(event) => setNewEntityName(event.target.value)}><option value="">Selecione uma pessoa ativa</option>{workspaceUsers.map((user) => <option value={user.id} key={user.id}>{user.name}</option>)}</select> : <input autoFocus required value={newEntityName} onChange={(event) => setNewEntityName(event.target.value)} placeholder={createTarget === "canal" ? "Ex.: pagamentos" : createTarget === "mensagem" ? "Ex.: Ana Souza" : createTarget === "pasta" ? "Ex.: Conciliações" : createTarget === "lista" ? "Ex.: Conferência de notas" : "Ex.: Manutenção"}/>}</label>{createTarget === "canal" && usesRemoteTasks && <label className="channel-private-option"><input type="checkbox" checked={newChannelPrivate} onChange={(event) => setNewChannelPrivate(event.target.checked)} />Canal privado — somente participantes adicionados terão acesso.</label>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setCreateTarget(null); setNewChannelPrivate(false); }}>Cancelar</button><button className="primary-button" type="submit">Criar</button></div></form></div>}
    {channelMembersOpen && <div className="modal-backdrop" role="presentation"><section className="modal compact-modal channel-members-modal" role="dialog" aria-modal="true"><div className="modal-heading"><div><p className="eyebrow">CANAL PRIVADO</p><h2>Membros de {channelName}</h2></div><button type="button" className="close" onClick={() => setChannelMembersOpen(false)}>×</button></div><p className="channel-members-help">Apenas participantes veem as mensagens. O criador do canal e administradores podem alterar esta lista.</p><label>Adicionar pessoa<input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Buscar pessoa ativa" /></label><div className="channel-member-list">{workspaceUsers.filter((user) => user.name.toLowerCase().includes(memberSearch.toLowerCase()) && !channelMembers.some((member) => member.userId === user.id)).map((user) => <div key={user.id}><span>{user.name}</span><button className="secondary-button" onClick={() => void changeChannelMember(user.id, "add")}>Adicionar</button></div>)}{workspaceUsers.filter((user) => user.name.toLowerCase().includes(memberSearch.toLowerCase()) && !channelMembers.some((member) => member.userId === user.id)).length === 0 && <p className="empty">Nenhuma pessoa ativa disponível.</p>}</div><h3>Membros atuais</h3><div className="channel-member-list">{channelMembers.map((member) => { const user = workspaceUsers.find((item) => item.id === member.userId); return <div key={member.userId}><span>{user?.name ?? "Membro da equipe"}</span><button className="secondary-button" onClick={() => void changeChannelMember(member.userId, "remove")}>Remover</button></div>; })}</div></section></div>}
    {entityMenu && <div className="modal-backdrop" role="presentation"><section className="entity-menu" role="dialog"><button onClick={() => renameEntity(entityMenu)}>Renomear</button>{entityMenu.kind === "departamento" && <button onClick={() => { setDepartmentStatus((current) => ({ ...current, [entityMenu.department]: current[entityMenu.department] === "Em pausa" ? "Ativo" : "Em pausa" })); setNotice("Status do departamento atualizado."); setEntityMenu(null); }}>Editar status <small>{departmentStatus[entityMenu.department] ?? "Ativo"}</small></button>}<button onClick={() => { setTemplates((current) => [...current, { id: Date.now(), name: entityMenu.kind === "departamento" ? entityMenu.department : departmentFolders[entityMenu.department]?.find((folder) => folder.id === entityMenu.folderId)?.name ?? "Novo template", category: entityMenu.kind === "departamento" ? "Departamento" : "Pasta", description: "Template salvo a partir da árvore de trabalho." }]); setNotice("Item salvo como template."); setEntityMenu(null); }}>Salvar como template</button><button onClick={() => { setShareTarget(entityMenu); setEntityMenu(null); }}>Compartilhamento e permissões</button><button className="danger" onClick={() => deleteEntity(entityMenu)}>Excluir</button><button className="menu-cancel" onClick={() => setEntityMenu(null)}>Cancelar</button></section></div>}
    {shareTarget && <div className="modal-backdrop" role="presentation"><form className="modal compact-modal" onSubmit={(event) => { event.preventDefault(); setShareTarget(null); setNotice("Permissões atualizadas neste navegador."); }}><div className="modal-heading"><div><p className="eyebrow">COMPARTILHAMENTO</p><h2>Permissões</h2></div><button type="button" className="close" onClick={() => setShareTarget(null)}>×</button></div><label>Acesso<select defaultValue="departamento"><option value="departamento">Membros do departamento</option><option value="restrito">Somente pessoas convidadas</option></select></label><label>Convidar por nome ou e-mail<input placeholder="Ex.: ana@itplocabox.com.br" /></label><div className="modal-actions"><button className="primary-button" type="submit">Salvar permissões</button></div></form></div>}
    {detailTask && <TaskDetail task={detailTask} onClose={() => setDetailTask(null)} onArchive={() => void archiveTask(detailTask)} onSave={(patch) => saveTask(detailTask, patch)} />}
  </main>;
}

function App() {
  return <AuthGate><Workspace /></AuthGate>;
}

export default App;
