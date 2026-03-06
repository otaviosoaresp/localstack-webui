import { S3Client } from "@aws-sdk/client-s3";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import { IAMClient } from "@aws-sdk/client-iam";

export interface AwsConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

const STORAGE_KEY = "localstack-webui-config";

function resolveDefaultEndpoint(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/aws`;
  }
  return "http://localhost:5173/aws";
}

export const DEFAULT_CONFIG: AwsConfig = {
  endpoint: resolveDefaultEndpoint(),
  region: "us-east-1",
  accessKeyId: "test",
  secretAccessKey: "test",
};

export function loadConfig(): AwsConfig {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored) as AwsConfig;
  }
  return DEFAULT_CONFIG;
}

export function saveConfig(config: AwsConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function hasStoredConfig(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

function baseClientConfig(config: AwsConfig) {
  return {
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  };
}

export function createS3Client(config: AwsConfig): S3Client {
  return new S3Client(baseClientConfig(config));
}

export function createSecretsManagerClient(config: AwsConfig): SecretsManagerClient {
  return new SecretsManagerClient(baseClientConfig(config));
}

export function createDynamoDBClient(config: AwsConfig): DynamoDBClient {
  return new DynamoDBClient(baseClientConfig(config));
}

export function createDynamoDBDocumentClient(config: AwsConfig): DynamoDBDocumentClient {
  const ddbClient = createDynamoDBClient(config);
  return DynamoDBDocumentClient.from(ddbClient);
}

export function createLambdaClient(config: AwsConfig): LambdaClient {
  return new LambdaClient(baseClientConfig(config));
}

export function createCloudWatchLogsClient(config: AwsConfig): CloudWatchLogsClient {
  return new CloudWatchLogsClient(baseClientConfig(config));
}

export function createIAMClient(config: AwsConfig): IAMClient {
  return new IAMClient(baseClientConfig(config));
}
