import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import { db } from "../db/connection.js";

const MES_REGEX = /^\d{4}-\d{2}$/;

const inputSchema = z.object({
  cartao: z
    .string()
    .describe("Nome exato da conta do tipo cartão de crédito."),
  mes_referencia: z
    .string()
    .regex(MES_REGEX, "Formato esperado: YYYY-MM")
    .describe(
      'Mês em que a fatura fecha, formato YYYY-MM (ex.: "2026-09"). Não é necessariamente o mês das transações.'
    ),
});

export const resumoFaturaTool: Tool = {
  name: "resumo_fatura",
  description:
    "Retorna o fechamento de uma fatura de cartão de crédito para um mês " +
    "de referência: data de fechamento, data de vencimento (pode cair no " +
    "mês seguinte ao fechamento) e o total gasto no período. " +
    "mes_referencia é o mês em que a fatura fecha, não o mês das " +
    "transações. cartao deve ser o nome exato de uma conta do tipo " +
    "cartão de crédito com ciclo de fatura configurado.",
  inputSchema: zodToJsonSchema(inputSchema) as Tool["inputSchema"],
};

interface CicloFatura {
  fechamento: string;
  inicioPeriodo: string;
  vencimento: string;
}

function ultimoDiaDoMes(ano: number, mes1Indexado: number): number {
  return new Date(ano, mes1Indexado, 0).getDate();
}

function formatarData(ano: number, mes1Indexado: number, dia: number): string {
  const mesStr = String(mes1Indexado).padStart(2, "0");
  const diaStr = String(dia).padStart(2, "0");
  return `${ano}-${mesStr}-${diaStr}`;
}

function mesAnterior(ano: number, mes1Indexado: number): { ano: number; mes: number } {
  return mes1Indexado === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes1Indexado - 1 };
}

function mesSeguinte(ano: number, mes1Indexado: number): { ano: number; mes: number } {
  return mes1Indexado === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes1Indexado + 1 };
}

function diaSeguinte(data: string): string {
  const [ano, mes, dia] = data.split("-").map(Number);
  const proximo = new Date(ano, mes - 1, dia + 1);
  return formatarData(proximo.getFullYear(), proximo.getMonth() + 1, proximo.getDate());
}

/**
 * Fechamento e vencimento caem no dia configurado da conta, ajustado para o
 * último dia real do mês quando o mês é mais curto (ex.: dia 31 em
 * fevereiro). O período da fatura vai do dia seguinte ao fechamento do mês
 * anterior até o fechamento de mes_referencia, inclusive.
 */
export function calcularCicloFatura(
  mesReferencia: string,
  diaFechamento: number,
  diaVencimento: number
): CicloFatura {
  const [anoRef, mesRef] = mesReferencia.split("-").map(Number);

  const fechamentoDia = Math.min(diaFechamento, ultimoDiaDoMes(anoRef, mesRef));
  const fechamento = formatarData(anoRef, mesRef, fechamentoDia);

  const anterior = mesAnterior(anoRef, mesRef);
  const fechamentoAnteriorDia = Math.min(
    diaFechamento,
    ultimoDiaDoMes(anterior.ano, anterior.mes)
  );
  const fechamentoAnterior = formatarData(anterior.ano, anterior.mes, fechamentoAnteriorDia);
  const inicioPeriodo = diaSeguinte(fechamentoAnterior);

  const mesDoVencimento =
    diaVencimento >= diaFechamento ? { ano: anoRef, mes: mesRef } : mesSeguinte(anoRef, mesRef);
  const vencimentoDia = Math.min(
    diaVencimento,
    ultimoDiaDoMes(mesDoVencimento.ano, mesDoVencimento.mes)
  );
  const vencimento = formatarData(mesDoVencimento.ano, mesDoVencimento.mes, vencimentoDia);

  return { fechamento, inicioPeriodo, vencimento };
}

interface ContaRow {
  id: number;
  tipo: string;
  dia_fechamento: number | null;
  dia_vencimento: number | null;
}

interface TotalRow {
  total: number | null;
}

const buscarConta = db.prepare<{ nome: string }, ContaRow>(
  "SELECT id, tipo, dia_fechamento, dia_vencimento FROM contas WHERE nome = @nome"
);

const totalNoPeriodo = db.prepare<
  { conta_id: number; inicio: string; fim: string },
  TotalRow
>(
  `SELECT SUM(-valor) AS total
     FROM transacoes
    WHERE conta_id = @conta_id
      AND valor < 0
      AND data BETWEEN @inicio AND @fim`
);

export function handleResumoFatura(args: unknown): CallToolResult {
  const { cartao, mes_referencia } = inputSchema.parse(args ?? {});

  const contaRow = buscarConta.get({ nome: cartao });
  if (!contaRow) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Conta "${cartao}" não encontrada. Contas cadastradas podem ser vistas chamando get_saldo sem o parâmetro "conta".`,
        },
      ],
    };
  }
  if (contaRow.tipo !== "cartao") {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Conta "${cartao}" não é um cartão de crédito (tipo "${contaRow.tipo}"). resumo_fatura só se aplica a contas do tipo cartão.`,
        },
      ],
    };
  }
  if (contaRow.dia_fechamento === null || contaRow.dia_vencimento === null) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Conta "${cartao}" não tem dia de fechamento/vencimento configurado.`,
        },
      ],
    };
  }

  const { fechamento, inicioPeriodo, vencimento } = calcularCicloFatura(
    mes_referencia,
    contaRow.dia_fechamento,
    contaRow.dia_vencimento
  );

  const totalRow = totalNoPeriodo.get({
    conta_id: contaRow.id,
    inicio: inicioPeriodo,
    fim: fechamento,
  });
  // Arredonda para 2 casas: soma de valores em ponto flutuante (ex.: 180.2 +
  // 39.9 + 120) pode gerar ruído como 340.09999999999997.
  const total = Math.round((totalRow?.total ?? 0) * 100) / 100;

  return {
    content: [{ type: "text", text: JSON.stringify({ fechamento, vencimento, total }) }],
  };
}
