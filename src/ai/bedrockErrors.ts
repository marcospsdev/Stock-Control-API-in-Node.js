export function friendlyBedrockError(error: unknown) {
  const name = (error as { name?: string })?.name ?? "";
  const message = (error as { message?: string })?.message ?? "";
  if (name === "CredentialsProviderError" || /credential/i.test(message)) {
    return "AI is not configured: AWS credentials were not found. Fill in .env.aws (see .env.aws.example).";
  }
  if (name === "ValidationException" && /operation not allowed/i.test(message)) {
    return "AI is unavailable: the Bedrock quotas for this AWS account are still 0 (Operation not allowed).";
  }
  if (name === "AccessDeniedException") {
    return "AI is unavailable: the AWS credentials do not have permission to invoke this Bedrock model.";
  }
  if (name === "ExpiredTokenException" || /expired/i.test(message)) {
    return "AI is not configured: the AWS credentials in .env.aws have expired. Generate a new Bedrock API key.";
  }
  if (name === "ThrottlingException") {
    return "AI is busy: too many requests to Bedrock. Try again in a few seconds.";
  }
  return `AI request failed: ${name || "Error"}${message ? ` - ${message}` : ""}`;
}
