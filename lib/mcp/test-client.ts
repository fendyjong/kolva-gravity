import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import type { TaskStore } from "@/lib/tasks";
import { handleMcpRequest } from "./server";

/** An MCP SDK client wired straight to handleMcpRequest — no network listener. For tests. */
export async function connectTestClient(store: TaskStore): Promise<Client> {
  const client = new Client({ name: "gravity-test", version: "1.0.0" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL("http://localhost/mcp"), {
      fetch: async (url, init) => {
        const request = new Request(url, init);
        // Like app/mcp/route.ts: the stateless server answers only POST.
        return request.method === "POST"
          ? handleMcpRequest(request, store)
          : new Response(null, { status: 405, headers: { Allow: "POST" } });
      },
    }),
  );
  return client;
}
