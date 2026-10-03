import { McpServer, WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/server";
import * as z from "zod";
import { TaskError, type TaskStore, type TaskView } from "@/lib/tasks";
import { triagePrompt } from "./triage";

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

const idField = z.number().int().describe("Task id.");
const quadrantField = z
  .number()
  .int()
  .describe("1 = Do today (everything here is due today), 2 = Schedule, 3 = Delegate, 4 = Later. Priority 1 > 2 > 3 > 4.");
const positionField = z
  .number()
  .int()
  .describe("Place among the open tasks of the quadrant; 0 is the top.");

/** A task-module call as a tool result: JSON on success, the rule's message on a broken rule. */
function respond(produce: () => unknown): ToolResult {
  try {
    return { content: [{ type: "text", text: JSON.stringify(produce(), null, 2) }] };
  } catch (error) {
    if (error instanceof TaskError) {
      return { isError: true, content: [{ type: "text", text: error.message }] };
    }
    throw error;
  }
}

/** The fields get_matrix returns for each open task. */
function matrixEntry(task: TaskView) {
  return {
    id: task.id,
    quadrant: task.quadrant,
    position: task.position,
    description: task.description,
    issue_url: task.issue_url,
    age_days: task.age_days,
    carry_over_days: task.carry_over_days,
    demotions: task.demotions,
    created_at: task.created_at,
  };
}

/** The gravity MCP server: every tool calls the task module. */
export function createMcpServer(store: TaskStore): McpServer {
  const server = new McpServer({ name: "gravity", version: "1.0.0" });

  server.registerTool(
    "get_matrix",
    {
      description:
        "Every open task, ordered by quadrant then position, with no visibility limit. carry_over_days counts the local days a quadrant-1 task has waited; demotions counts moves to a lower-priority quadrant.",
      inputSchema: z.object({ quadrant: quadrantField.optional() }),
    },
    ({ quadrant }) => respond(() => store.getMatrix(quadrant).map(matrixEntry)),
  );

  server.registerTool(
    "add_task",
    {
      description:
        "Add a task at the bottom of a quadrant, or at `position`. If a task for `issue_url` already exists (in any state) it is returned with existing: true and nothing changes, so re-adding an issue is safe.",
      inputSchema: z.object({
        description: z.string().describe("One line, 1–200 characters."),
        quadrant: quadrantField,
        issue_url: z.string().optional().describe("https://github.com/<owner>/<repo>/issues/<number>"),
        position: positionField.optional(),
      }),
    },
    (input) =>
      respond(() => {
        const { task, existing } = store.add(input);
        return { ...task, existing };
      }),
  );

  server.registerTool(
    "update_task",
    {
      description: "Change an open task's description.",
      inputSchema: z.object({ id: idField, description: z.string().describe("One line, 1–200 characters.") }),
    },
    ({ id, description }) => respond(() => store.update(id, description)),
  );

  server.registerTool(
    "move_task",
    {
      description:
        "Move an open task to another quadrant (to the bottom unless `position` is given), or reorder it within its own quadrant by passing that same quadrant and a `position`. A move to a higher-numbered quadrant counts as a demotion.",
      inputSchema: z.object({ id: idField, quadrant: quadrantField, position: positionField.optional() }),
    },
    ({ id, quadrant, position }) => respond(() => store.move(id, quadrant, position)),
  );

  server.registerTool(
    "reorder_quadrant",
    {
      description:
        "Set the order of a whole quadrant, top first. `ids` must be exactly the open tasks in that quadrant.",
      inputSchema: z.object({ quadrant: quadrantField, ids: z.array(idField) }),
    },
    ({ quadrant, ids }) => respond(() => store.reorderQuadrant(quadrant, ids)),
  );

  server.registerTool(
    "complete_task",
    { description: "Mark an open task done.", inputSchema: z.object({ id: idField }) },
    ({ id }) => respond(() => store.complete(id)),
  );

  server.registerTool(
    "reopen_task",
    {
      description: "Reopen a completed or dropped task. It goes to the bottom of its quadrant.",
      inputSchema: z.object({ id: idField }),
    },
    ({ id }) => respond(() => store.reopen(id)),
  );

  server.registerTool(
    "drop_task",
    {
      description: "Abandon an open task on purpose. It leaves the matrix; reopen_task brings it back.",
      inputSchema: z.object({ id: idField }),
    },
    ({ id }) => respond(() => store.drop(id)),
  );

  server.registerPrompt(
    "triage",
    {
      title: "Triage the matrix",
      description:
        "Rearrange the matrix: deal with carried-over tasks, promote what keeps getting put off, keep quadrant 1 small, and shortlist at most 10 GitHub issues from `repos`.",
      argsSchema: z.object({
        repos: z.string().optional().describe("Comma-separated owner/repo list, e.g. fendyjong/kolva-gravity,fendyjong/kolva-sim"),
      }),
    },
    ({ repos }) => ({
      messages: [{ role: "user", content: { type: "text", text: triagePrompt(repos) } }],
    }),
  );

  return server;
}

/** Serves one stateless MCP request over Streamable HTTP with JSON responses. */
export async function handleMcpRequest(request: Request, store: TaskStore): Promise<Response> {
  const server = createMcpServer(store);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}
