import { ArrowLeft, FilePlus2, FileText, Search, Share2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

export type WorkspaceDocument = { id: string | number; title: string; body: string; updated: string };
type Props = { documents: WorkspaceDocument[]; onCreate: () => Promise<WorkspaceDocument | void> | WorkspaceDocument | void; onUpdate: (id: string | number, patch: Partial<WorkspaceDocument>) => void; onDelete: (id: string | number) => Promise<void>; savingIds?: (string | number)[] };

export function DocumentsWorkspace({ documents, onCreate, onUpdate, onDelete, savingIds = [] }: Props) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<WorkspaceDocument["id"] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const visible = useMemo(() => documents.filter((document) => `${document.title} ${document.body}`.toLowerCase().includes(query.toLowerCase())), [documents, query]);
  const selected = selectedId === null ? undefined : documents.find((document) => document.id === selectedId);
  const saving = selected ? savingIds.includes(selected.id) : false;
  const createDocument = async () => {
    setErrorMessage("");
    try {
      const document = await onCreate();
      if (document) setSelectedId(document.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível criar o documento.");
    }
  };
  const removeSelected = async () => {
    if (!selected || !window.confirm(`Excluir o documento “${selected.title || "Sem título"}”?`)) return;
    setErrorMessage("");
    setDeleting(true);
    try { await onDelete(selected.id); setSelectedId(null); }
    catch (error) { setErrorMessage(error instanceof Error ? error.message : "Não foi possível excluir o documento."); }
    finally { setDeleting(false); }
  };
  if (selected) return <section className="documents-workspace document-editor-page"><header className="document-editor-topbar"><button className="text-button" onClick={() => setSelectedId(null)}><ArrowLeft size={16}/>Documentos</button><div><span>{saving ? "Salvando…" : "Salvo"}</span><button className="secondary-button" onClick={() => undefined}><Share2 size={15}/>Compartilhar</button><button className="secondary-button" disabled={deleting} onClick={() => void removeSelected()}><Trash2 size={15}/>{deleting ? "Excluindo…" : "Excluir"}</button></div></header>{errorMessage && <p className="document-error">{errorMessage}</p>}<article className="document-editor"><div className="document-content"><input className="document-title" value={selected.title} onChange={(event) => onUpdate(selected.id, { title: event.target.value, updated: "agora" })} placeholder="Sem título"/><p className="document-author">Atualizado {selected.updated}</p><textarea value={selected.body} onChange={(event) => onUpdate(selected.id, { body: event.target.value, updated: "agora" })} placeholder="Digite texto ou use '/' para comandos"/></div></article></section>;
  return <section className="documents-workspace documents-library"><header className="documents-library-header"><div><p className="eyebrow">ESPAÇO DE TRABALHO</p><h2>Documentos</h2><p>Crie e colabore em documentos do financeiro.</p></div><button className="primary-button" onClick={() => void createDocument()}><FilePlus2 size={17}/>Novo documento</button></header><div className="documents-library-toolbar"><label className="documents-search"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar documentos..."/></label><span>{visible.length} documento{visible.length === 1 ? "" : "s"}</span></div>{errorMessage && <p className="document-error">{errorMessage}</p>}{visible.length === 0 ? <div className="documents-empty"><FileText size={30}/><h3>{documents.length === 0 ? "Nenhum documento criado" : "Nenhum documento encontrado"}</h3><p>{documents.length === 0 ? "Crie seu primeiro documento para centralizar informações da equipe." : "Tente buscar por outro título ou conteúdo."}</p></div> : <div className="document-card-grid">{visible.map((document) => <button className="document-card" key={document.id} onClick={() => setSelectedId(document.id)}><span className="document-card-icon"><FileText size={20}/></span><strong>{document.title || "Sem título"}</strong><p>{document.body.trim() ? document.body.trim().slice(0, 100) : "Documento em branco"}</p><small>Atualizado {document.updated}</small></button>)}</div>}</section>;
}
