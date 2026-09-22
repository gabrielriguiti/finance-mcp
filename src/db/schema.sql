-- Schema inicial (Fase 1). Ajustar conforme as 5 tools forem implementadas.

CREATE TABLE IF NOT EXISTS contas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL, -- 'corrente', 'cartao', etc.
  saldo_inicial REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS transacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conta_id INTEGER NOT NULL REFERENCES contas(id),
  categoria_id INTEGER REFERENCES categorias(id),
  descricao TEXT NOT NULL,
  valor REAL NOT NULL, -- positivo = entrada, negativo = saída
  data TEXT NOT NULL, -- ISO 8601 (YYYY-MM-DD)
  pendente INTEGER NOT NULL DEFAULT 0 -- 1 = ainda não baixado (contas a pagar)
);
