import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * EXAMPLE: how a team adds its own business tool.
 *
 * This is a complete, working tool kept out of the default registry on purpose.
 * Copy this file, give it a clear `name`, `description`, and zod `schema`,
 * implement the async function (call MongoDB via getDb(), the model via
 * getChatModel(), retrieval via retrievePassages(), etc.), and then register it
 * in src/tools/registry.ts. See the notes there.
 *
 * A few things that make a tool work well in the agent:
 *  - The `description` is how the model decides when to call the tool. Be
 *    concrete about what it answers and when to use it.
 *  - Each field's .describe() guides the arguments the model passes.
 *  - Return a string (or content the model can read). Structured JSON is fine.
 *  - Keep side effects read-oriented; this scaffold does not write to the
 *    analyzed collections.
 */
export const exampleBusinessTool = tool(
  async ({ amountMinorUnits }): Promise<string> => {
    // Trivial, dependency-free logic so the example compiles and runs as-is.
    // Replace with your real logic (a lookup, an aggregation, a retrieval, ...).
    const band =
      amountMinorUnits >= 10_000_00 ? "HIGH" : amountMinorUnits >= 1_000_00 ? "MEDIUM" : "LOW";
    return JSON.stringify({ amountMinorUnits, riskBand: band });
  },
  {
    name: "example_risk_band",
    description:
      "EXAMPLE TOOL (not registered by default). Classify a transfer amount into a LOW/MEDIUM/HIGH risk band. " +
      "Replace with your team's own tool.",
    schema: z.object({
      amountMinorUnits: z
        .number()
        .int()
        .nonnegative()
        .describe("The transfer amount in minor units (cents)."),
    }),
  },
);
