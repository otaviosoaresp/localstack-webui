import {
  ListSecretsCommand,
  CreateSecretCommand,
  GetSecretValueCommand,
  UpdateSecretCommand,
  DeleteSecretCommand,
} from "@aws-sdk/client-secrets-manager";
import type { SecretListEntry, GetSecretValueResponse } from "@aws-sdk/client-secrets-manager";
import type { AwsConfig } from "../config/aws-config";
import { createSecretsManagerClient } from "../config/aws-config";

export interface SecretEntry {
  name: string;
  arn: string;
  description: string;
  lastChangedDate: Date | undefined;
}

export interface SecretValue {
  name: string;
  secretString: string;
  versionId: string;
}

function toSecretEntry(entry: SecretListEntry): SecretEntry {
  return {
    name: entry.Name ?? "",
    arn: entry.ARN ?? "",
    description: entry.Description ?? "",
    lastChangedDate: entry.LastChangedDate,
  };
}

function toSecretValue(response: GetSecretValueResponse): SecretValue {
  return {
    name: response.Name ?? "",
    secretString: response.SecretString ?? "",
    versionId: response.VersionId ?? "",
  };
}

export async function listSecrets(config: AwsConfig): Promise<SecretEntry[]> {
  const client = createSecretsManagerClient(config);
  const response = await client.send(new ListSecretsCommand({}));
  return (response.SecretList ?? []).map(toSecretEntry);
}

export async function createSecret(
  config: AwsConfig,
  name: string,
  secretString: string,
  description?: string
): Promise<string> {
  const client = createSecretsManagerClient(config);
  const response = await client.send(
    new CreateSecretCommand({
      Name: name,
      SecretString: secretString,
      Description: description,
    })
  );
  return response.ARN ?? "";
}

export async function getSecretValue(
  config: AwsConfig,
  secretId: string
): Promise<SecretValue> {
  const client = createSecretsManagerClient(config);
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretId })
  );
  return toSecretValue(response);
}

export async function updateSecret(
  config: AwsConfig,
  secretId: string,
  secretString: string
): Promise<void> {
  const client = createSecretsManagerClient(config);
  await client.send(
    new UpdateSecretCommand({
      SecretId: secretId,
      SecretString: secretString,
    })
  );
}

export async function deleteSecret(
  config: AwsConfig,
  secretId: string
): Promise<void> {
  const client = createSecretsManagerClient(config);
  await client.send(
    new DeleteSecretCommand({
      SecretId: secretId,
      ForceDeleteWithoutRecovery: true,
    })
  );
}
