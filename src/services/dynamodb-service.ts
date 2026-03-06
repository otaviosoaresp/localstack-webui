import {
  ListTablesCommand,
  DescribeTableCommand,
  CreateTableCommand,
  DeleteTableCommand,
} from "@aws-sdk/client-dynamodb";
import type { KeySchemaElement, AttributeDefinition, TableDescription, ScalarAttributeType } from "@aws-sdk/client-dynamodb";
import {
  ScanCommand,
  PutCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import type { AwsConfig } from "../config/aws-config";
import { createDynamoDBClient, createDynamoDBDocumentClient } from "../config/aws-config";

export interface TableSummary {
  tableName: string;
  status: string;
  itemCount: number;
  keySchema: KeySchemaElement[];
}

export interface ScanResult {
  items: Record<string, unknown>[];
  lastEvaluatedKey: Record<string, unknown> | undefined;
}

export async function listTables(config: AwsConfig): Promise<string[]> {
  const client = createDynamoDBClient(config);
  const response = await client.send(new ListTablesCommand({}));
  return response.TableNames ?? [];
}

export async function describeTable(
  config: AwsConfig,
  tableName: string
): Promise<TableSummary> {
  const client = createDynamoDBClient(config);
  const response = await client.send(
    new DescribeTableCommand({ TableName: tableName })
  );
  const table: TableDescription = response.Table!;
  return {
    tableName: table.TableName ?? tableName,
    status: table.TableStatus ?? "UNKNOWN",
    itemCount: table.ItemCount ?? 0,
    keySchema: table.KeySchema ?? [],
  };
}

function buildKeySchema(
  partitionKey: string,
  sortKey?: string
): KeySchemaElement[] {
  const schema: KeySchemaElement[] = [
    { AttributeName: partitionKey, KeyType: "HASH" },
  ];
  if (sortKey) {
    schema.push({ AttributeName: sortKey, KeyType: "RANGE" });
  }
  return schema;
}

function buildAttributeDefinitions(
  partitionKey: string,
  partitionKeyType: ScalarAttributeType,
  sortKey?: string,
  sortKeyType?: ScalarAttributeType
): AttributeDefinition[] {
  const definitions: AttributeDefinition[] = [
    { AttributeName: partitionKey, AttributeType: partitionKeyType },
  ];
  if (sortKey && sortKeyType) {
    definitions.push({
      AttributeName: sortKey,
      AttributeType: sortKeyType,
    });
  }
  return definitions;
}

export async function createTable(
  config: AwsConfig,
  tableName: string,
  partitionKey: string,
  partitionKeyType: ScalarAttributeType,
  sortKey?: string,
  sortKeyType?: ScalarAttributeType
): Promise<void> {
  const client = createDynamoDBClient(config);
  await client.send(
    new CreateTableCommand({
      TableName: tableName,
      KeySchema: buildKeySchema(partitionKey, sortKey),
      AttributeDefinitions: buildAttributeDefinitions(
        partitionKey,
        partitionKeyType,
        sortKey,
        sortKeyType
      ),
      BillingMode: "PAY_PER_REQUEST",
    })
  );
}

export async function deleteTable(
  config: AwsConfig,
  tableName: string
): Promise<void> {
  const client = createDynamoDBClient(config);
  await client.send(new DeleteTableCommand({ TableName: tableName }));
}

export async function scanItems(
  config: AwsConfig,
  tableName: string,
  exclusiveStartKey?: Record<string, unknown>
): Promise<ScanResult> {
  const docClient = createDynamoDBDocumentClient(config);
  const response = await docClient.send(
    new ScanCommand({
      TableName: tableName,
      Limit: 50,
      ExclusiveStartKey: exclusiveStartKey,
    })
  );
  return {
    items: (response.Items ?? []) as Record<string, unknown>[],
    lastEvaluatedKey: response.LastEvaluatedKey as
      | Record<string, unknown>
      | undefined,
  };
}

export async function putItem(
  config: AwsConfig,
  tableName: string,
  item: Record<string, unknown>
): Promise<void> {
  const docClient = createDynamoDBDocumentClient(config);
  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    })
  );
}

export async function deleteItem(
  config: AwsConfig,
  tableName: string,
  key: Record<string, unknown>
): Promise<void> {
  const docClient = createDynamoDBDocumentClient(config);
  await docClient.send(
    new DeleteCommand({
      TableName: tableName,
      Key: key,
    })
  );
}
