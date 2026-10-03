import { handleMcpRequest } from "@/lib/mcp/server";
import { getTaskStore } from "@/lib/tasks";

export async function POST(request: Request): Promise<Response> {
  return handleMcpRequest(request, getTaskStore());
}

// Stateless: there is no session to stream from or to delete.
function methodNotAllowed(): Response {
  return new Response("Method Not Allowed: this MCP server is stateless; use POST.", {
    status: 405,
    headers: { Allow: "POST" },
  });
}

export async function GET(): Promise<Response> {
  return methodNotAllowed();
}

export async function DELETE(): Promise<Response> {
  return methodNotAllowed();
}
