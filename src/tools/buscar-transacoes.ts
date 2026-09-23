import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import { db } from "../db/connection.js";

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TAMANHO_PAGINA_MAXIMO = 100;

const inputSchema = z.object({
  texto: z
    .string()
    .optional()
    .describe(
      "Busca por substring na descrição da transação, sem diferenciar maiúsculas de minúsculas. Se omitido, não filtra por descrição."
    ),
  data_inicio: z
    .string()
    .regex(DATA_REGEX, "Formato esperado: YYYY-MM-DD")
    .optional()
    .describe(
      "Data inicial do período, formato YYYY-MM-DD, inclusive. Pode ser usada sem data_fim."
    ),
  data_fim: z
    .string()
    .regex(DATA_REGEX, "Formato esperado: YYYY-MM-DD")
    .optional()
    .describe(
      "Data final do período, formato YYYY-MM-DD, inclusive. Pode ser usada sem data_inicio."
    ),
  valor_min: z
    .number()
    .optional()
    .describe(
      "Valor mínimo da transação (negativo para gasto, positivo para receita), inclusive."
    ),
  valor_max: z
    .number()
    .optional()
    .describe(
      "Valor máximo da transação (negativo para gasto, positivo para receita), inclusive."
    ),
  pagina: z
    .number()
    .int()
    .positive()
    .default(1)
    .describe("Página do resultado, 1-indexada. Default 1."),
  tamanho_pagina: z
    .number()
    .int()
    .positive()
    .max(TAMANHO_PAGINA_MAXIMO)
    .default(20)
    .describe(
      `Quantidade de transações por página. Default 20, máximo ${TAMANHO_PAGINA_MAXIMO}.`
    ),
});

export const buscarTransacoesTool: Tool = {
  name: "buscar_transacoes",
  description:
    "Busca transações por texto na descrição, período (data_inicio/data_fim) " +
    "e faixa de valor (valor_min/valor_max) — todos os filtros são " +
    "opcionais e combináveis (E lógico). Sem nenhum filtro, retorna todas " +
    "as transações, mais recentes primeiro. Resultado paginado (pagina " +
    `1-indexada, tamanho_pagina default 20, máximo ${TAMANHO_PAGINA_MAXIMO}); ` +
    "a resposta inclui o total de resultados antes da paginação.",
  inputSchema: zodToJsonSchema(inputSchema) as Tool["inputSchema"],
};

interface TransacaoRow {
  conta: string;
  descricao: string;
  valor: number;
  data: string;
  categoria: string;
}

interface TotalRow {
  total: number;
}

/** Escapa '\', '%' e '_' para que o texto de busca seja tratado como literal no LIKE. */
function escaparLike(valor: string): string {
  return valor.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

interface Filtros {
  texto?: string;
  data_inicio?: string;
  data_fim?: string;
  valor_min?: number;
  valor_max?: number;
}

function montarClausulas(filtros: Filtros): {
  clausula: string;
  params: Record<string, string | number>;
} {
  const condicoes: string[] = [];
  const params: Record<string, string | number> = {};

  if (filtros.texto) {
    condicoes.push("LOWER(t.descricao) LIKE LOWER(@texto_pattern) ESCAPE '\\'");
    params.texto_pattern = `%${escaparLike(filtros.texto)}%`;
  }
  if (filtros.data_inicio) {
    condicoes.push("t.data >= @data_inicio");
    params.data_inicio = filtros.data_inicio;
  }
  if (filtros.data_fim) {
    condicoes.push("t.data <= @data_fim");
    params.data_fim = filtros.data_fim;
  }
  if (filtros.valor_min !== undefined) {
    condicoes.push("t.valor >= @valor_min");
    params.valor_min = filtros.valor_min;
  }
  if (filtros.valor_max !== undefined) {
    condicoes.push("t.valor <= @valor_max");
    params.valor_max = filtros.valor_max;
  }

  const clausula = condicoes.length > 0 ? `WHERE ${condicoes.join(" AND ")}` : "";
  return { clausula, params };
}

export function handleBuscarTransacoes(args: unknown): CallToolResult {
  const { texto, data_inicio, data_fim, valor_min, valor_max, pagina, tamanho_pagina } =
    inputSchema.parse(args ?? {});

  const { clausula, params } = montarClausulas({
    texto,
    data_inicio,
    data_fim,
    valor_min,
    valor_max,
  });

  const totalRow = db
    .prepare<Record<string, string | number>, TotalRow>(
      `SELECT COUNT(*) AS total FROM transacoes t ${clausula}`
    )
    .get(params);
  const total = totalRow?.total ?? 0;

  const offset = (pagina - 1) * tamanho_pagina;
  const rows = db
    .prepare<Record<string, string | number>, TransacaoRow>(
      `SELECT c.nome AS conta,
              t.descricao AS descricao,
              t.valor AS valor,
              t.data AS data,
              COALESCE(cat.nome, 'Sem categoria') AS categoria
         FROM transacoes t
         JOIN contas c ON c.id = t.conta_id
         LEFT JOIN categorias cat ON cat.id = t.categoria_id
         ${clausula}
        ORDER BY t.data DESC
        LIMIT @tamanho_pagina OFFSET @offset`
    )
    .all({ ...params, tamanho_pagina, offset });

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ transacoes: rows, total, pagina, tamanho_pagina }),
      },
    ],
  };
}
