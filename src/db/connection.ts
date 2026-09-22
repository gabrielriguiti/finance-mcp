// Conexão SQLite única, compartilhada por todas as tools. SQLite local
// single-user não se beneficia de pool de conexões — ver design.md da
// change add-get-saldo-tool.

import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, "../../finance.db");

export const db = new Database(dbPath, { fileMustExist: true });
