import {
  ListBucketsCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  type Bucket,
  type CommonPrefix,
  type _Object,
} from "@aws-sdk/client-s3";
import { type AwsConfig, createS3Client } from "../config/aws-config";

export interface ListObjectsResult {
  contents: _Object[];
  commonPrefixes: CommonPrefix[];
}

export async function listBuckets(config: AwsConfig): Promise<Bucket[]> {
  const client = createS3Client(config);
  const response = await client.send(new ListBucketsCommand({}));
  return response.Buckets ?? [];
}

export async function createBucket(
  config: AwsConfig,
  bucketName: string
): Promise<void> {
  const client = createS3Client(config);
  await client.send(new CreateBucketCommand({ Bucket: bucketName }));
}

export async function deleteBucket(
  config: AwsConfig,
  bucketName: string
): Promise<void> {
  const client = createS3Client(config);
  await client.send(new DeleteBucketCommand({ Bucket: bucketName }));
}

export async function listObjects(
  config: AwsConfig,
  bucketName: string,
  prefix?: string
): Promise<ListObjectsResult> {
  const client = createS3Client(config);
  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix ?? "",
      Delimiter: "/",
    })
  );
  return {
    contents: response.Contents ?? [],
    commonPrefixes: response.CommonPrefixes ?? [],
  };
}

export async function uploadObject(
  config: AwsConfig,
  bucketName: string,
  key: string,
  body: Blob | Uint8Array | string
): Promise<void> {
  const client = createS3Client(config);
  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
    })
  );
}

export async function downloadObject(
  config: AwsConfig,
  bucketName: string,
  key: string
): Promise<Blob> {
  const client = createS3Client(config);
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );
  const byteArray = await response.Body?.transformToByteArray();
  return new Blob([byteArray ?? new Uint8Array()]);
}

export async function deleteObject(
  config: AwsConfig,
  bucketName: string,
  key: string
): Promise<void> {
  const client = createS3Client(config);
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );
}
