import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

export const BEDROCK_REGION = process.env.AWS_REGION || "us-east-2";
export const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || "us.amazon.nova-micro-v1:0";

let client: BedrockRuntimeClient | null = null;

export function getBedrockClient() {
  if (!client) {
    client = new BedrockRuntimeClient({ region: BEDROCK_REGION });
  }
  return client;
}
