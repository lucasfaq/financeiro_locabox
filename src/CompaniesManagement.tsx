import { useCallback, useEffect, useState } from "react";
import { Building2, CirclePlus, RefreshCw, ToggleLeft } from "lucide-react";
import { supabase } from "./supabaseClient";
import "./CompaniesManagement.css";

type Company = { id: string; nome: string; ativo: boolean; created_at: string };

export function CompaniesManagement() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { if (!supabase) { setMessage("Conecte o Supabase para gerenciar empresas."); setLoading(false); return; } setLoading(true); const { data, error } = await supabase.from("empresas").select("id,nome,ativo,created_at").order("nome"); if (error) setMessage(error.message); else setCompanies(data ?? []); setLoading(false); }, []);
  useEffect(() => { void load(); }, [load]);
  const add = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!supabase || !name.trim()) return; const { error } = await supabase.from("empresas").insert({ nome: name.trim() }); if (error) { setMessage(error.message); return; } setName(""); setMessage("Empresa cadastrada."); await load(); };
  const toggle = async (company: Company) => { if (!supabase) return; const { error } = await supabase.from("empresas").update({ ativo: !company.ativo }).eq("id", company.id); if (error) { setMessage(error.message); return; } setMessage(company.ativo ? "Empresa desativada." : "Empresa reativada."); await load(); };
  return <section className="companies-management"><header className="companies-heading"><div><p className="eyebrow">CADASTROS</p><h2>Empresas</h2><p>Defina as empresas disponíveis para atividades, centros de custo e relatórios financeiros.</p></div><button className="secondary-button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} />Atualizar</button></header>{message && <p className="companies-message">{message}</p>}<div className="companies-grid"><form className="company-form" onSubmit={add}><h3><CirclePlus size={17} />Cadastrar empresa</h3><label>Nome da empresa<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Nova empresa" required /></label><button className="primary-button" type="submit"><Building2 size={16} />Adicionar</button></form><div className="company-list"><h3><Building2 size={17} />Empresas cadastradas</h3>{loading ? <p className="empty">Carregando empresas…</p> : companies.map((company) => <article key={company.id}><div><strong>{company.nome}</strong><small>{company.ativo ? "Ativa" : "Inativa"}</small></div><button className={company.ativo ? "secondary-button danger-access" : "secondary-button"} onClick={() => void toggle(company)}><ToggleLeft size={16} />{company.ativo ? "Desativar" : "Reativar"}</button></article>)}{!loading && companies.length === 0 && <p className="empty">Nenhuma empresa cadastrada.</p>}</div></div></section>;
}
