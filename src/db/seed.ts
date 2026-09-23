// Seed de dados fictícios (Fase 1).
//
// Objetivo: popular contas, categorias e transações de exemplo suficientes
// para exercitar as 5 tools (get_saldo, gastos_por_categoria,
// contas_a_pagar, buscar_transacoes, resumo_fatura) sem depender de dados
// reais. Rodar com `npm run seed`. Dados sintéticos — nada real, repo público.

import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, "../../finance.db");

const db = new Database(dbPath);
const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
db.exec("DROP TABLE IF EXISTS transacoes; DROP TABLE IF EXISTS categorias; DROP TABLE IF EXISTS contas;");
db.exec(schema);

const insertConta = db.prepare(
  `INSERT INTO contas (nome, tipo, saldo_inicial, dia_fechamento, dia_vencimento)
   VALUES (?, ?, ?, ?, ?)`
);

const nubank = insertConta.run("Nubank", "corrente", 1500, null, null).lastInsertRowid as number;
const itau = insertConta.run("Itaú", "corrente", 800, null, null).lastInsertRowid as number;
// Fecha dia 25, vence dia 5 do mês seguinte — padrão comum de cartão.
const cartao = insertConta.run("Nubank Cartão", "cartao", 0, 25, 5).lastInsertRowid as number;

const insertCategoria = db.prepare("INSERT INTO categorias (nome) VALUES (?)");

const categorias = {
  mercado: insertCategoria.run("Mercado").lastInsertRowid as number,
  transporte: insertCategoria.run("Transporte").lastInsertRowid as number,
  moradia: insertCategoria.run("Moradia").lastInsertRowid as number,
  lazer: insertCategoria.run("Lazer").lastInsertRowid as number,
  saude: insertCategoria.run("Saúde").lastInsertRowid as number,
  salario: insertCategoria.run("Salário").lastInsertRowid as number,
};

const insertTransacao = db.prepare(
  `INSERT INTO transacoes (conta_id, categoria_id, descricao, valor, data, pendente)
   VALUES (@conta_id, @categoria_id, @descricao, @valor, @data, @pendente)`
);

const transacoes = [
  // Nubank (corrente) — não pendentes, já compõem o saldo atual.
  { conta_id: nubank, categoria_id: categorias.salario, descricao: "Salário", valor: 5200, data: "2026-09-05", pendente: 0 },
  { conta_id: nubank, categoria_id: categorias.moradia, descricao: "Aluguel", valor: -1200, data: "2026-09-06", pendente: 0 },
  { conta_id: nubank, categoria_id: categorias.mercado, descricao: "Supermercado Extra", valor: -340.5, data: "2026-09-08", pendente: 0 },
  { conta_id: nubank, categoria_id: categorias.transporte, descricao: "Uber", valor: -28.9, data: "2026-09-10", pendente: 0 },
  { conta_id: nubank, categoria_id: categorias.lazer, descricao: "Cinema", valor: -45, data: "2026-09-12", pendente: 0 },
  // Nubank — sem categoria: exercita o agrupamento "Sem categoria" de gastos_por_categoria.
  { conta_id: nubank, categoria_id: null, descricao: "Transferência avulsa", valor: -60, data: "2026-09-13", pendente: 0 },
  // Nubank — pendente: não deve entrar no saldo atual de get_saldo.
  { conta_id: nubank, categoria_id: categorias.moradia, descricao: "IPTU (parcela)", valor: -80, data: "2026-09-25", pendente: 1 },

  // Itaú (corrente) — não pendentes.
  { conta_id: itau, categoria_id: categorias.mercado, descricao: "Padaria", valor: -22.3, data: "2026-09-09", pendente: 0 },
  { conta_id: itau, categoria_id: categorias.saude, descricao: "Farmácia", valor: -67.4, data: "2026-09-15", pendente: 0 },
  // Itaú — pendente.
  { conta_id: itau, categoria_id: categorias.moradia, descricao: "Conta de luz", valor: -150, data: "2026-09-28", pendente: 1 },

  // Cartão de crédito — fatura em aberto (pendente), para resumo_fatura.
  { conta_id: cartao, categoria_id: categorias.mercado, descricao: "Supermercado Extra", valor: -180.2, data: "2026-09-03", pendente: 1 },
  { conta_id: cartao, categoria_id: categorias.lazer, descricao: "Streaming", valor: -39.9, data: "2026-09-14", pendente: 1 },
  { conta_id: cartao, categoria_id: categorias.transporte, descricao: "Posto de gasolina", valor: -120, data: "2026-09-20", pendente: 1 },
];

const insertMany = db.transaction((rows: typeof transacoes) => {
  for (const row of rows) insertTransacao.run(row);
});
insertMany(transacoes);

console.log(`Seed aplicado em ${dbPath}: 3 contas, ${Object.keys(categorias).length} categorias, ${transacoes.length} transações.`);
db.close();
