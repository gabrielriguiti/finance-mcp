// finance-mcp — servidor MCP de finanças pessoais sobre SQLite.
//
// Estado: get_saldo implementada. As outras 4 tools (gastos_por_categoria,
// contas_a_pagar, buscar_transacoes, resumo_fatura) ainda não foram
// implementadas — ver ARCHITECTURE.md e backlog.md para o que está fora
// de escopo.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getSaldoTool, handleGetSaldo } from "./tools/get-saldo.js";

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

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [getSaldoTool],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "get_saldo":
      return handleGetSaldo(request.params.arguments);
    default:
      throw new Error(`Tool desconhecida: ${request.params.name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("finance-mcp rodando via stdio (tools: get_saldo)");
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
