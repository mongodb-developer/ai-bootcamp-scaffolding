import { ChatBedrockConverse } from "@langchain/aws";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { getConfig } from "../config";

/**
 * The one and only module that imports a chat-model provider SDK.
 * Implemented from the LLM Integration Profile in context.md.
 *
 * The agent reaches Anthropic Claude on AWS Bedrock through
 * ChatBedrockConverse. AWS credentials are read from the standard SigV4 chain,
 * i.e. the AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY that src/credentials.ts
 * mints into process.env at startup. No key handling happens here.
 *
 * Keep the exported signature exactly as specified in context.md.
 */
export function getChatModel(opts?: { temperature?: number }): BaseChatModel {
  const cfg = getConfig();
  return new ChatBedrockConverse({
    model: cfg.BEDROCK_MODEL_ID,
    region: cfg.BEDROCK_REGION,
    temperature: opts?.temperature ?? cfg.LLM_TEMPERATURE,
    maxTokens: cfg.LLM_MAX_TOKENS,
  });
}
