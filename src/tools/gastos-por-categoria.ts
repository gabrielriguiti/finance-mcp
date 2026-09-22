import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import { db } from "../db/connection.js";

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const inputSchema = z.object({
  data_inicio: z
    .string()
    .regex(DATA_REGEX, "Formato esperado: YYYY-MM-DD")
    .describe("Data inicial do período, formato YYYY-MM-DD (ex.: \"2026-09-01\"), inclusive."),
  data_fim: z
    .string()
    .regex(DATA_REGEX, "Formato esperado: YYYY-MM-DD")
    .describe("Data final do período, formato YYYY-MM-DD (ex.: \"2026-09-30\"), inclusive."),
  conta: z
    .string()
    .optional()
    .describe(
      "Nome exato da conta (ex.: \"Nubank\"). Se omitido, agrega gastos de todas as contas."
    ),
});

export const gastosPorCategoriaTool: Tool = {
  name: "gastos_por_categoria",
  description:
    "Retorna o total gasto em cada categoria dentro de um período " +
    "(data_inicio a data_fim, formato YYYY-MM-DD, ambos inclusive), " +
    "opcionalmente restrito a uma conta. Considera apenas gastos " +
    "efetivados (transações de valor negativo, não pendentes) — receitas " +
    "e pendências não entram no total. Gastos sem categoria aparecem " +
    "agrupados como \"Sem categoria\".",
  inputSchema: zodToJsonSchema(inputSchema) as Tool["inputSchema"],
};

interface CategoriaRow {
  categoria: string;
  total: number;
}

interface ContaRow {
  id: number;
}

const buscarConta = db.prepare<{ nome: string }, ContaRow>(
  "SELECT id FROM contas WHERE nome = @nome"
);

const gastosTodasAsContas = db.prepare<
  { data_inicio: string; data_fim: string },
  CategoriaRow
>(
  `SELECT COALESCE(cat.nome, 'Sem categoria') AS categoria,
          SUM(-t.valor) AS total
     FROM transacoes t
     LEFT JOIN categorias cat ON cat.id = t.categoria_id
    WHERE t.valor < 0
      AND t.pendente = 0
      AND t.data BETWEEN @data_inicio AND @data_fim
    GROUP BY categoria
    ORDER BY total DESC`
);

const gastosPorConta = db.prepare<
  { conta_id: number; data_inicio: string; data_fim: string },
  CategoriaRow
>(
  `SELECT COALESCE(cat.nome, 'Sem categoria') AS categoria,
          SUM(-t.valor) AS total
     FROM transacoes t
     LEFT JOIN categorias cat ON cat.id = t.categoria_id
    WHERE t.valor < 0
      AND t.pendente = 0
      AND t.conta_id = @conta_id
      AND t.data BETWEEN @data_inicio AND @data_fim
    GROUP BY categoria
    ORDER BY total DESC`
);

export function handleGastosPorCategoria(args: unknown): CallToolResult {
  const { data_inicio, data_fim, conta } = inputSchema.parse(args ?? {});

  if (conta) {
    const contaRow = buscarConta.get({ nome: conta });
    if (!contaRow) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Conta "${conta}" não encontrada. Contas cadastradas podem ser vistas chamando get_saldo sem o parâmetro "conta".`,
          },
        ],
      };
    }
    const rows = gastosPorConta.all({ conta_id: contaRow.id, data_inicio, data_fim });
    return {
      content: [{ type: "text", text: JSON.stringify({ categorias: rows }) }],
    };
  }

  const rows = gastosTodasAsContas.all({ data_inicio, data_fim });
  return {
    content: [{ type: "text", text: JSON.stringify({ categorias: rows }) }],
  };
}
