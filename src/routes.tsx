import type { RouteObject } from "react-router-dom";
import { HomePage } from "./pages/Home/HomePage";
import { S3Page } from "./pages/S3/S3Page";
import { SecretsPage } from "./pages/Secrets/SecretsPage";
import { DynamoDBPage } from "./pages/DynamoDB/DynamoDBPage";
import { TableDetail } from "./pages/DynamoDB/TableDetail";
import { LambdaPage } from "./pages/Lambda/LambdaPage";
import { CloudWatchPage } from "./pages/CloudWatch/CloudWatchPage";
import { LogStreamDetail } from "./pages/CloudWatch/LogStreamDetail";
import { IAMPage } from "./pages/IAM/IAMPage";

export const routes: RouteObject[] = [
  { path: "/", element: <HomePage /> },
  { path: "/s3/*", element: <S3Page /> },
  { path: "/secrets", element: <SecretsPage /> },
  { path: "/dynamodb", element: <DynamoDBPage /> },
  { path: "/dynamodb/:tableName", element: <TableDetail /> },
  { path: "/lambda", element: <LambdaPage /> },
  { path: "/cloudwatch", element: <CloudWatchPage /> },
  { path: "/cloudwatch/:logGroupName/:logStreamName", element: <LogStreamDetail /> },
  { path: "/iam", element: <IAMPage /> },
];
