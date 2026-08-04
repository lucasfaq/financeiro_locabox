import { CopyPlus, FileStack, LayoutTemplate, Plus } from "lucide-react";

export type TaskTemplate = { id: string | number; name: string; category: string; description: string };

type Props = {
  templates: TaskTemplate[];
  onSaveCurrent: () => void;
  onUse: (template: TaskTemplate) => void;
};

export function TemplatesLibrary({ templates, onSaveCurrent, onUse }: Props) {
  return <section className="templates-library">
    <div className="templates-heading"><div><p className="eyebrow">BIBLIOTECA DO ESPAÇO DE TRABALHO</p><h2>Templates</h2><p>Modelos reutilizáveis de tarefas e processos do departamento.</p></div><button className="primary-button" onClick={onSaveCurrent}><Plus size={17} />Salvar visão como template</button></div>
    <div className="template-filters"><button className="selected">Todos</button><button>Tarefas</button><button>Processos</button><button>Documentos</button></div>
    {templates.length === 0 ? <div className="template-empty"><LayoutTemplate size={28}/><h3>Nenhum template salvo</h3><p>Salve uma visão ou processo do departamento para reutilizá-lo depois.</p></div> : <div className="template-grid">{templates.map((template) => <article key={template.id}><span><FileStack size={18}/>{template.category}</span><h3>{template.name}</h3><p>{template.description}</p><button className="secondary-button" onClick={() => onUse(template)}><CopyPlus size={15}/>Usar template</button></article>)}</div>}
  </section>;
}
