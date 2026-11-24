import { existsSync } from "fs";
import { resolve } from "path";

const awsEnvFile = resolve(__dirname, "..", "..", ".env.aws");

if (existsSync(awsEnvFile)) {
  process.loadEnvFile(awsEnvFile);
}
