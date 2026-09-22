// finance-mcp — servidor MCP de finanças pessoais sobre SQLite.
//
// Estado: scaffold inicial (Fase 0/1, abertura do projeto). As 5 tools
// (get_saldo, gastos_por_categoria, contas_a_pagar, buscar_transacoes,
// resumo_fatura) ainda não foram implementadas — ver ARCHITECTURE.md e
// backlog.md para o que está fora de escopo.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "finance-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// TODO (Fase 1): registrar as 5 tools reais.
// Por ora, a lista fica vazia de propósito — o objetivo desta sessão é
// abrir o projeto, não implementar as tools.
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [],
}));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("finance-mcp rodando via stdio (scaffold — sem tools ainda)");
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
