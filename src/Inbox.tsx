import { CheckCheck, Clock3, MessageCircle, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

export type InboxItem = { id: number; kind: "Tarefa" | "Mensagem"; title: string; detail: string; time: string; priority: boolean; read: boolean };
type Props = { items: InboxItem[]; onMarkRead: (id: number) => void; onClearRead: () => void };

export function Inbox({ items, onMarkRead, onClearRead }: Props) {
  const [tab, setTab] = useState<"Todas" | "Principais" | "Outras" | "Mais tarde" | "Limpos">("Todas");
  const visible = items.filter((item) => tab === "Todas" || tab === "Principais" ? tab !== "Principais" || item.priority : tab === "Limpos" ? item.read : !item.read);
  return <section className="inbox-page"><div className="inbox-heading"><div><p className="eyebrow">SEU TRABALHO</p><h2>Caixa de entrada</h2><p>Mensagens, tarefas e decisões que precisam da sua atenção.</p></div><div><button className="secondary-button" onClick={onClearRead}><CheckCheck size={16}/>Limpar itens lidos</button></div></div><div className="inbox-toolbar"><div>{(["Todas", "Principais", "Outras", "Mais tarde", "Limpos"] as const).map((item) => <button key={item} className={tab === item ? "selected" : ""} onClick={() => setTab(item)}>{item}</button>)}</div><button className="icon-button" aria-label="Filtrar caixa de entrada"><SlidersHorizontal size={17}/></button></div>{visible.length === 0 ? <div className="inbox-empty"><CheckCheck size={28}/><h3>Você está atualizado!</h3><p>Novas notificações aparecerão aqui.</p></div> : <div className="inbox-list">{visible.map((item) => <button className={item.read ? "inbox-item read" : "inbox-item"} key={item.id} onClick={() => onMarkRead(item.id)}><span className={item.kind === "Mensagem" ? "inbox-icon message" : "inbox-icon task"}>{item.kind === "Mensagem" ? <MessageCircle size={17}/> : <Clock3 size={17}/>}</span><span><strong>{item.title}</strong><small>{item.detail}</small></span><time>{item.time}</time>{item.priority && <i>Principal</i>}</button>)}</div>}</section>;
}
