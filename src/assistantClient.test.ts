import { describe, expect, it } from "vitest";
import { assistantAnswerFrom } from "./assistantClient";

describe("assistantAnswerFrom", () => {
  it("normaliza a resposta válida do assistente", () => {
    expect(assistantAnswerFrom({ answer: "  Há duas atividades pendentes.  " })).toBe("Há duas atividades pendentes.");
  });

  it("rejeita respostas ausentes ou vazias", () => {
    expect(() => assistantAnswerFrom({})).toThrow("resposta inválida");
    expect(() => assistantAnswerFrom({ answer: " " })).toThrow("resposta inválida");
  });
});
