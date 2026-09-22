// Seed de dados fictícios (Fase 1 - TODO).
//
// Objetivo: popular contas, categorias e transações de exemplo suficientes
// para exercitar as 5 tools (get_saldo, gastos_por_categoria,
// contas_a_pagar, buscar_transacoes, resumo_fatura) sem depender de dados
// reais. Rodar com `npm run seed`.

import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, "../../finance.db");

const db = new Database(dbPath);
const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
db.exec(schema);

// TODO (Fase 1): inserir contas, categorias e transações fictícias.
// Manter os dados plausíveis mas sintéticos — nada real, é repositório público.

console.log(`Seed aplicado em ${dbPath} (schema criado; dados fictícios: TODO)`);
db.close();
