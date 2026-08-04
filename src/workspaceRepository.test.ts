import { describe, expect, it } from "vitest";
import { formatDueDate, toRemoteTask } from "./workspaceRepository";

describe("formatDueDate", () => {
  it("preserva datas do banco no fuso brasileiro sem deslocar o dia", () => {
    expect(formatDueDate("2026-08-04")).toBe("04/08/2026");
  });

  it("identifica a ausência de prazo", () => {
    expect(formatDueDate(null)).toBe("Sem prazo");
  });
});

describe("toRemoteTask", () => {
  it("transforma os códigos financeiros do banco no modelo exibido", () => {
    expect(toRemoteTask({ id: "a1", titulo: "Conferir retenções", valor_previsto: "12800.50", vencimento: "2026-08-04", prioridade: "alta", status: "em_aprovacao", responsavel_id: "user-1", lista_id: "lista-1", tipo: "financeiro", empresa_id: "empresa-1" }, "Locabox")).toMatchObject({ id: "a1", title: "Conferir retenções", company: "Locabox", due: "04/08/2026", value: 12800.5, priority: "Alta", status: "Em aprovação", owner: "Responsável da equipe", listId: "lista-1", taskType: "Financeiro" });
  });

  it("aplica valores seguros para códigos desconhecidos e empresa ausente", () => {
    expect(toRemoteTask({ id: "a2", titulo: "Sem classificação", valor_previsto: 0, vencimento: null, prioridade: "outra", status: "cancelado", responsavel_id: null, lista_id: null, tipo: "outro", empresa_id: "empresa-2" }, undefined)).toMatchObject({ company: "ITP", due: "Sem prazo", owner: "Não atribuído", priority: "Média", status: "Pendente", listId: "", taskType: "Tarefa" });
  });
});
