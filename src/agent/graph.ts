import { StateGraph, MessagesAnnotation, START, END, type LangGraphRunnableConfig } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { SystemMessage, type AIMessage } from "@langchain/core/messages";
import { getChatModel } from "../llm/model";
import { getCheckpointer } from "../memory/checkpointer";
import { getMemoryStore, listUserMemories, formatUserMemories } from "../memory/store";
import type { AgentTool } from "../tools/registry";

/**
 * The agent runtime: a tool-calling graph.
 *
 *   START -> model -> (tool calls?) --yes--> tools -> model -> ...
 *                                  --no---> END
 *
 * The model node can call any registered tool; the conditional edge loops back
 * while the model keeps calling tools and ends when it produces a final answer.
 * A MongoDBSaver checkpointer persists state per thread_id, so memory survives
 * across turns and across process runs.
 */
export async function buildAgent(tools: AgentTool[], systemPrompt: string) {
  // bindTools is optional on BaseChatModel; ChatBedrockConverse supports it.
  const chat = getChatModel();
  if (typeof chat.bindTools !== "function") {
    throw new Error("The configured chat model does not support tool calling (bindTools).");
  }
  const model = chat.bindTools(tools);
  const toolNode = new ToolNode(tools);
  const memoryStore = await getMemoryStore();

  async function callModel(state: typeof MessagesAnnotation.State, config: LangGraphRunnableConfig) {
    // Automatic long-term recall: if a user_id is in the run config, load what
    // we know about that user (across all their threads) and prepend it to the
    // system prompt. This is the read side of long-term memory.
    let memoryBlock = "";
    const userId = typeof config.configurable?.user_id === "string" ? config.configurable.user_id : undefined;
    if (userId && config.store) {
      const formatted = formatUserMemories(await listUserMemories(config.store, userId));
      if (formatted) memoryBlock = `\n\nKnown context about the current user (long-term memory):\n${formatted}`;
    }

    // The system prompt (+ any recalled memory) is prepended each turn. It is
    // not stored in state, so it does not accumulate in the persisted checkpoint.
    const response = await model.invoke([new SystemMessage(systemPrompt + memoryBlock), ...state.messages]);
    return { messages: [response] };
  }

  function routeAfterModel(state: typeof MessagesAnnotation.State) {
    const last = state.messages.at(-1) as AIMessage | undefined;
    return last?.tool_calls && last.tool_calls.length > 0 ? "tools" : END;
  }

  const workflow = new StateGraph(MessagesAnnotation)
    .addNode("model", callModel)
    .addNode("tools", toolNode)
    .addEdge(START, "model")
    .addConditionalEdges("model", routeAfterModel, ["tools", END])
    .addEdge("tools", "model");

  const checkpointer = await getCheckpointer();
  return workflow.compile({ checkpointer, store: memoryStore });
}

export type Agent = Awaited<ReturnType<typeof buildAgent>>;
