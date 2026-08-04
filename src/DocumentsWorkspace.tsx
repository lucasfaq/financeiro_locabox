import { FilePlus2, FileText, Search, Share2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

export type WorkspaceDocument = { id: string | number; title: string; body: string; updated: string };
type Props = { documents: WorkspaceDocument[]; onCreate: () => void; onUpdate: (id: string | number, patch: Partial<WorkspaceDocument>) => void; onDelete: (id: string | number) => Promise<void>; savingIds?: (string | number)[] };

export function DocumentsWorkspace({ documents, onCreate, onUpdate, onDelete, savingIds = [] }: Props) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(documents[0]?.id);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const visible = useMemo(() => documents.filter((document) => document.title.toLowerCase().includes(query.toLowerCase())), [documents, query]);
  const selected = documents.find((document) => document.id === selectedId) ?? documents[0];
  const saving = selected ? savingIds.includes(selected.id) : false;
  const removeSelected = async () => {
    if (!selected || !window.confirm(`Excluir o documento “${selected.title || "Sem título"}”?`)) return;
    setDeleteError("");
    setDeleting(true);
    try {
      await onDelete(selected.id);
      const nextId = documents.find((document) => document.id !== selected.id)?.id;
      if (nextId !== undefined) setSelectedId(nextId);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Não foi possível excluir o documento.");
    } finally {
      setDeleting(false);
    }
  };
  return <section className="documents-workspace"><aside><div className="documents-side-head"><div><p className="eyebrow">DOCUMENTOS</p><h2>Financeiro</h2></div><button aria-label="Novo documento" onClick={onCreate}><FilePlus2 size={17}/></button></div><label className="documents-search"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar documentos..."/></label><div className="documents-list">{visible.map((document) => <button className={document.id === selected?.id ? "selected" : ""} key={document.id} onClick={() => setSelectedId(document.id)}><FileText size={15}/><span>{document.title || "Sem título"}<small>{document.updated}</small></span></button>)}</div></aside>{selected && <article className="document-editor"><header><span>{saving ? "Salvando…" : "Salvo"}</span><div><button className="secondary-button" onClick={() => undefined}><Share2 size={15}/>Compartilhar</button><button className="secondary-button" disabled={deleting} onClick={() => void removeSelected()}><Trash2 size={15}/>{deleting ? "Excluindo…" : "Excluir"}</button></div></header>{deleteError && <p className="document-error">{deleteError}</p>}<div className="document-content"><input className="document-title" value={selected.title} onChange={(event) => onUpdate(selected.id, { title: event.target.value, updated: "agora" })} placeholder="Sem título"/><p className="document-author">Marina Alves · atualizado {selected.updated}</p><textarea value={selected.body} onChange={(event) => onUpdate(selected.id, { body: event.target.value, updated: "agora" })} placeholder="Digite texto ou use '/' para comandos"/></div></article>}</section>;
}
