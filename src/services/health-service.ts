import type { AwsConfig } from "../config/aws-config";

type ServiceStatus = "available" | "running" | "disabled" | "error";

export interface HealthResponse {
  services: Record<string, ServiceStatus>;
  edition: string;
  version: string;
}

const SERVICE_NAME_MAP: Record<string, string> = {
  s3: "s3",
  secretsmanager: "secrets",
  dynamodb: "dynamodb",
  lambda: "lambda",
  logs: "cloudwatch",
  iam: "iam",
};

export interface ServiceHealth {
  key: string;
  localstackName: string;
  status: ServiceStatus;
}

export async function fetchHealth(config: AwsConfig): Promise<HealthResponse> {
  const baseUrl = config.endpoint.replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/_localstack/health`);
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }
  return response.json() as Promise<HealthResponse>;
}

export function mapServiceHealth(health: HealthResponse): Record<string, ServiceHealth> {
  const result: Record<string, ServiceHealth> = {};
  for (const [lsName, uiKey] of Object.entries(SERVICE_NAME_MAP)) {
    const status = health.services[lsName] ?? "disabled";
    result[uiKey] = {
      key: uiKey,
      localstackName: lsName,
      status: status as ServiceStatus,
    };
  }
  return result;
}

export function isServiceAvailable(status: ServiceStatus): boolean {
  return status === "available" || status === "running";
}
