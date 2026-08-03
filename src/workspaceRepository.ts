import { supabase } from "./supabaseClient";

export type RemoteList = { id: string; name: string };
export type RemoteFolder = { id: string; name: string; lists: RemoteList[] };
export type RemoteDepartment = { id: string; name: string; folders: RemoteFolder[] };

export async function loadWorkspaceHierarchy(): Promise<RemoteDepartment[] | null> {
  if (!supabase) return null;
  const { data: departments, error: departmentError } = await supabase.from("departamentos").select("id,nome").eq("ativo", true).order("nome");
  if (departmentError) throw departmentError;
  const { data: folders, error: folderError } = await supabase.from("pastas_trabalho").select("id,nome,departamento_id").eq("ativo", true).order("nome");
  if (folderError) throw folderError;
  const { data: lists, error: listError } = await supabase.from("listas_trabalho").select("id,nome,pasta_id").eq("ativo", true).order("nome");
  if (listError) throw listError;
  return (departments ?? []).map((department) => ({ id: department.id, name: department.nome, folders: (folders ?? []).filter((folder) => folder.departamento_id === department.id).map((folder) => ({ id: folder.id, name: folder.nome, lists: (lists ?? []).filter((list) => list.pasta_id === folder.id).map((list) => ({ id: list.id, name: list.nome })) })) }));
}
