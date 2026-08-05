import { CheckCheck, Clock3, MessageCircle, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

export type InboxItem = { id: string | number; kind: "Tarefa" | "Mensagem"; title: string; detail: string; time: string; priority: boolean; read: boolean; snoozedUntil?: string | null };
type Props = { items: InboxItem[]; onMarkRead: (id: InboxItem["id"]) => void; onMarkAllRead: () => void; onClearRead: () => void; onSnooze: (id: InboxItem["id"], until: string | null) => void };
type Tab = "Todas" | "Principais" | "Outras" | "Mais tarde" | "Limpos";
type KindFilter = "Todos" | InboxItem["kind"];

export function Inbox({ items, onMarkRead, onMarkAllRead, onClearRead, onSnooze }: Props) {
  const [tab, setTab] = useState<Tab>("Todas");
  const [filterOpen, setFilterOpen] = useState(false);
  const [kindFilter, setKindFilter] = useState<KindFilter>("Todos");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const snoozed = (item: InboxItem) => Boolean(item.snoozedUntil && new Date(item.snoozedUntil) > new Date());
  const visible = useMemo(() => items.filter((item) => {
    const inTab = tab === "Todas" ? !snoozed(item) : tab === "Principais" ? item.priority && !snoozed(item) : tab === "Outras" ? !item.priority && !item.read && !snoozed(item) : tab === "Mais tarde" ? snoozed(item) : item.read;
    return inTab && (kindFilter === "Todos" || item.kind === kindFilter) && (!unreadOnly || !item.read);
  }), [items, tab, kindFilter, unreadOnly]);
  const filterCount = Number(kindFilter !== "Todos") + Number(unreadOnly);

  return <section className="inbox-page">
    <div className="inbox-heading"><div><p className="eyebrow">SEU TRABALHO</p><h2>Caixa de entrada</h2><p>Mensagens, tarefas e decisões que precisam da sua atenção.</p></div><div><button className="secondary-button" onClick={onMarkAllRead}><CheckCheck size={16}/>Marcar tudo como lido</button><button className="secondary-button" onClick={onClearRead}><CheckCheck size={16}/>Limpar itens lidos</button></div></div>
    <div className="inbox-toolbar"><div>{(["Todas", "Principais", "Outras", "Mais tarde", "Limpos"] as const).map((item) => <button key={item} className={tab === item ? "selected" : ""} onClick={() => setTab(item)}>{item}</button>)}</div><button className={filterOpen || filterCount ? "icon-button active" : "icon-button"} aria-expanded={filterOpen} aria-label="Filtrar caixa de entrada" onClick={() => setFilterOpen((current) => !current)}><SlidersHorizontal size={17}/>{filterCount > 0 && <b>{filterCount}</b>}</button></div>
    {filterOpen && <div className="inbox-filter-panel"><label>Tipo<select value={kindFilter} onChange={(event) => setKindFilter(event.target.value as KindFilter)}><option>Todos</option><option>Tarefa</option><option>Mensagem</option></select></label><label className="inbox-check"><input type="checkbox" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} />Somente não lidos</label>{filterCount > 0 && <button className="text-button" onClick={() => { setKindFilter("Todos"); setUnreadOnly(false); }}>Limpar filtros</button>}</div>}
    {visible.length === 0 ? <div className="inbox-empty"><CheckCheck size={28}/><h3>Você está atualizado!</h3><p>Novas notificações aparecerão aqui.</p></div> : <div className="inbox-list">{visible.map((item) => <div className={item.read ? "inbox-item read" : "inbox-item"} key={item.id}><button className="inbox-item-content" onClick={() => onMarkRead(item.id)}><span className={item.kind === "Mensagem" ? "inbox-icon message" : "inbox-icon task"}>{item.kind === "Mensagem" ? <MessageCircle size={17}/> : <Clock3 size={17}/>}</span><span><strong>{item.title}</strong><small>{item.detail}</small></span><time>{item.time}</time>{item.priority && <i>Principal</i>}</button><button className="text-button" onClick={() => onSnooze(item.id, snoozed(item) ? null : new Date(Date.now() + 86400000).toISOString())}>{snoozed(item) ? "Retomar" : "Adiar 1 dia"}</button></div>)}</div>}
  </section>;
}
