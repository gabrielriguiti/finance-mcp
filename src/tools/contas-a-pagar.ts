import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import { db } from "../db/connection.js";

const inputSchema = z.object({
  janela_dias: z
    .number()
    .int()
    .positive()
    .describe(
      "Quantidade de dias a partir de hoje para buscar pendências (ex.: 7 retorna o que vence entre hoje e daqui a 7 dias, ambos inclusive)."
    ),
});

export const contasAPagarTool: Tool = {
  name: "contas_a_pagar",
  description:
    "Retorna as transações pendentes (contas a pagar) com vencimento " +
    "entre hoje e hoje + janela_dias dias, ambos inclusive, ordenadas por " +
    "data de vencimento crescente. Não inclui pendências já vencidas nem " +
    "transações já efetivadas — use get_saldo para saldo atual.",
  inputSchema: zodToJsonSchema(inputSchema) as Tool["inputSchema"],
};

interface PendenciaRow {
  conta: string;
  descricao: string;
  valor: number;
  data: string;
}

const pendenciasNaJanela = db.prepare<{ hoje: string; limite: string }, PendenciaRow>(
  `SELECT c.nome AS conta,
          t.descricao AS descricao,
          t.valor AS valor,
          t.data AS data
     FROM transacoes t
     JOIN contas c ON c.id = t.conta_id
    WHERE t.pendente = 1
      AND t.data BETWEEN @hoje AND @limite
    ORDER BY t.data ASC`
);

function formatarData(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function handleContasAPagar(args: unknown): CallToolResult {
  const { janela_dias } = inputSchema.parse(args ?? {});

  const hoje = new Date();
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() + janela_dias);

  const rows = pendenciasNaJanela.all({
    hoje: formatarData(hoje),
    limite: formatarData(limite),
  });

  return {
    content: [{ type: "text", text: JSON.stringify({ pendencias: rows }) }],
  };
}
