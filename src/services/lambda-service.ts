import {
  ListFunctionsCommand,
  InvokeCommand,
  GetFunctionConfigurationCommand,
  CreateFunctionCommand,
  DeleteFunctionCommand,
  UpdateFunctionCodeCommand,
  type FunctionConfiguration,
  LogType,
  Runtime,
} from "@aws-sdk/client-lambda";
import { type AwsConfig, createLambdaClient } from "../config/aws-config";

export interface InvokeResult {
  statusCode: number;
  payload: string;
  logResult: string;
}

export async function listFunctions(
  config: AwsConfig
): Promise<FunctionConfiguration[]> {
  const client = createLambdaClient(config);
  const response = await client.send(new ListFunctionsCommand({}));
  return response.Functions ?? [];
}

export async function invokeFunction(
  config: AwsConfig,
  functionName: string,
  payload?: string
): Promise<InvokeResult> {
  const client = createLambdaClient(config);
  const response = await client.send(
    new InvokeCommand({
      FunctionName: functionName,
      Payload: new TextEncoder().encode(payload ?? "{}"),
      LogType: LogType.Tail,
    })
  );

  const decodedPayload = response.Payload
    ? new TextDecoder().decode(response.Payload)
    : "";

  const decodedLogResult = response.LogResult
    ? atob(response.LogResult)
    : "";

  return {
    statusCode: response.StatusCode ?? 0,
    payload: decodedPayload,
    logResult: decodedLogResult,
  };
}

export async function getFunctionConfiguration(
  config: AwsConfig,
  functionName: string
): Promise<FunctionConfiguration> {
  const client = createLambdaClient(config);
  return await client.send(
    new GetFunctionConfigurationCommand({
      FunctionName: functionName,
    })
  );
}

export { Runtime };

export const SUPPORTED_RUNTIMES: { label: string; value: Runtime }[] = [
  { label: "Node.js 22.x", value: Runtime.nodejs22x },
  { label: "Node.js 20.x", value: Runtime.nodejs20x },
  { label: "Node.js 18.x", value: Runtime.nodejs18x },
  { label: "Python 3.13", value: Runtime.python313 },
  { label: "Python 3.12", value: Runtime.python312 },
  { label: "Python 3.11", value: Runtime.python311 },
  { label: "Java 21", value: Runtime.java21 },
  { label: "Java 17", value: Runtime.java17 },
  { label: "Go (provided.al2023)", value: Runtime.providedal2023 },
  { label: "Ruby 3.3", value: Runtime.ruby33 },
  { label: ".NET 8", value: Runtime.dotnet8 },
];

export async function createFunction(
  config: AwsConfig,
  functionName: string,
  runtime: Runtime,
  handler: string,
  zipFile: Uint8Array,
  description?: string,
  timeout?: number,
  memorySize?: number
): Promise<void> {
  const client = createLambdaClient(config);
  await client.send(
    new CreateFunctionCommand({
      FunctionName: functionName,
      Runtime: runtime,
      Handler: handler,
      Role: "arn:aws:iam::000000000000:role/lambda-role",
      Code: { ZipFile: zipFile },
      Description: description,
      Timeout: timeout ?? 30,
      MemorySize: memorySize ?? 128,
    })
  );
}

export async function deleteFunction(
  config: AwsConfig,
  functionName: string
): Promise<void> {
  const client = createLambdaClient(config);
  await client.send(new DeleteFunctionCommand({ FunctionName: functionName }));
}

export async function updateFunctionCode(
  config: AwsConfig,
  functionName: string,
  zipFile: Uint8Array
): Promise<void> {
  const client = createLambdaClient(config);
  await client.send(
    new UpdateFunctionCodeCommand({
      FunctionName: functionName,
      ZipFile: zipFile,
    })
  );
}
