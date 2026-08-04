import { describe, expect, it } from "vitest";
import { subtaskProgress } from "./taskProgress";

describe("subtaskProgress", () => {
  it("calcula o progresso com arredondamento", () => {
    expect(subtaskProgress([{ done: true }, { done: false }, { done: true }])).toEqual({ completed: 2, total: 3, percent: 67 });
  });

  it("não divide por zero quando não há subtarefas", () => {
    expect(subtaskProgress([])).toEqual({ completed: 0, total: 0, percent: 0 });
  });
});
