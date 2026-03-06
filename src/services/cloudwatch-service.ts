import {
  DescribeLogGroupsCommand,
  DescribeLogStreamsCommand,
  GetLogEventsCommand,
  CreateLogGroupCommand,
  DeleteLogGroupCommand,
  DeleteLogStreamCommand,
  type LogGroup,
  type LogStream,
  type OutputLogEvent,
} from "@aws-sdk/client-cloudwatch-logs";
import { type AwsConfig, createCloudWatchLogsClient } from "../config/aws-config";

export interface GetLogEventsResult {
  events: OutputLogEvent[];
  nextForwardToken: string | undefined;
}

export async function listLogGroups(config: AwsConfig): Promise<LogGroup[]> {
  const client = createCloudWatchLogsClient(config);
  const response = await client.send(new DescribeLogGroupsCommand({}));
  return response.logGroups ?? [];
}

export async function listLogStreams(
  config: AwsConfig,
  logGroupName: string
): Promise<LogStream[]> {
  const client = createCloudWatchLogsClient(config);
  const response = await client.send(
    new DescribeLogStreamsCommand({
      logGroupName,
      orderBy: "LastEventTime",
      descending: true,
    })
  );
  return response.logStreams ?? [];
}

export async function createLogGroup(
  config: AwsConfig,
  logGroupName: string
): Promise<void> {
  const client = createCloudWatchLogsClient(config);
  await client.send(new CreateLogGroupCommand({ logGroupName }));
}

export async function deleteLogGroup(
  config: AwsConfig,
  logGroupName: string
): Promise<void> {
  const client = createCloudWatchLogsClient(config);
  await client.send(new DeleteLogGroupCommand({ logGroupName }));
}

export async function deleteLogStream(
  config: AwsConfig,
  logGroupName: string,
  logStreamName: string
): Promise<void> {
  const client = createCloudWatchLogsClient(config);
  await client.send(
    new DeleteLogStreamCommand({ logGroupName, logStreamName })
  );
}

export async function getLogEvents(
  config: AwsConfig,
  logGroupName: string,
  logStreamName: string,
  nextToken?: string
): Promise<GetLogEventsResult> {
  const client = createCloudWatchLogsClient(config);
  const response = await client.send(
    new GetLogEventsCommand({
      logGroupName,
      logStreamName,
      startFromHead: true,
      ...(nextToken ? { nextToken } : {}),
    })
  );
  return {
    events: response.events ?? [],
    nextForwardToken: response.nextForwardToken,
  };
}
