import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import { db } from "../db/connection.js";

const inputSchema = z.object({
  conta: z
    .string()
    .optional()
    .describe(
      "Nome exato da conta (ex.: \"Nubank\"). Se omitido, retorna o saldo de todas as contas cadastradas."
    ),
});

export const getSaldoTool: Tool = {
  name: "get_saldo",
  description:
    "Retorna o saldo atual de uma conta financeira, ou de todas as contas " +
    "quando nenhuma conta é informada. O saldo já desconta apenas " +
    "transações efetivadas — contas a pagar ainda pendentes não entram " +
    "no cálculo. Use contas_a_pagar para consultar pendências.",
  inputSchema: zodToJsonSchema(inputSchema) as Tool["inputSchema"],
};

interface SaldoRow {
  nome: string;
  saldo: number;
}

const saldoDeUmaConta = db.prepare<{ nome: string }, SaldoRow>(
  `SELECT c.nome AS nome,
          c.saldo_inicial + COALESCE(SUM(CASE WHEN t.pendente = 0 THEN t.valor END), 0) AS saldo
     FROM contas c
     LEFT JOIN transacoes t ON t.conta_id = c.id
    WHERE c.nome = @nome
    GROUP BY c.id`
);

const saldoDeTodasAsContas = db.prepare<[], SaldoRow>(
  `SELECT c.nome AS nome,
          c.saldo_inicial + COALESCE(SUM(CASE WHEN t.pendente = 0 THEN t.valor END), 0) AS saldo
     FROM contas c
     LEFT JOIN transacoes t ON t.conta_id = c.id
    GROUP BY c.id
    ORDER BY c.nome`
);

export function handleGetSaldo(args: unknown): CallToolResult {
  const { conta } = inputSchema.parse(args ?? {});

  if (conta) {
    const row = saldoDeUmaConta.get({ nome: conta });
    if (!row) {
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
    return {
      content: [{ type: "text", text: JSON.stringify(row) }],
    };
  }

  const rows = saldoDeTodasAsContas.all();
  return {
    content: [{ type: "text", text: JSON.stringify({ contas: rows }) }],
  };
}
