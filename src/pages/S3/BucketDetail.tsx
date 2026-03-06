import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Table,
  Button,
  Space,
  Popconfirm,
  Upload,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { UploadRequestOption } from "rc-upload/lib/interface";
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  UploadOutlined,
  DownloadOutlined,
  DeleteOutlined,
  FolderOutlined,
  FileOutlined,
} from "@ant-design/icons";
import { useConfig } from "../../config/ConfigContext";
import { PageHeader } from "../../components/PageHeader";
import {
  listObjects,
  uploadObject,
  downloadObject,
  deleteObject,
  type ListObjectsResult,
} from "../../services/s3-service";

interface DisplayRow {
  key: string;
  name: string;
  type: "folder" | "file";
  size?: number;
  lastModified?: Date;
}

export function BucketDetail() {
  const { bucketName } = useParams<{ bucketName: string }>();
  const navigate = useNavigate();
  const { config } = useConfig();
  const [prefix, setPrefix] = useState<string>("");
  const [rows, setRows] = useState<DisplayRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchObjects = useCallback(async () => {
    if (!bucketName) return;
    setLoading(true);
    try {
      const result: ListObjectsResult = await listObjects(
        config,
        bucketName,
        prefix
      );
      const folderRows: DisplayRow[] = result.commonPrefixes.map((cp) => ({
        key: cp.Prefix ?? "",
        name: extractFolderName(cp.Prefix ?? "", prefix),
        type: "folder" as const,
      }));
      const fileRows: DisplayRow[] = result.contents
        .filter((obj) => obj.Key !== prefix)
        .map((obj) => ({
          key: obj.Key ?? "",
          name: extractFileName(obj.Key ?? "", prefix),
          type: "file" as const,
          size: obj.Size,
          lastModified: obj.LastModified,
        }));
      setRows([...folderRows, ...fileRows]);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to list objects";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [config, bucketName, prefix]);

  useEffect(() => {
    fetchObjects();
  }, [fetchObjects]);

  function extractFolderName(fullPrefix: string, currentPrefix: string): string {
    const relative = fullPrefix.slice(currentPrefix.length);
    return relative.endsWith("/") ? relative.slice(0, -1) : relative;
  }

  function extractFileName(fullKey: string, currentPrefix: string): string {
    return fullKey.slice(currentPrefix.length);
  }

  function navigateToFolder(folderPrefix: string) {
    setPrefix(folderPrefix);
  }

  function navigateUp() {
    if (!prefix) return;
    const withoutTrailing = prefix.endsWith("/")
      ? prefix.slice(0, -1)
      : prefix;
    const lastSlash = withoutTrailing.lastIndexOf("/");
    setPrefix(lastSlash === -1 ? "" : withoutTrailing.slice(0, lastSlash + 1));
  }

  function buildBreadcrumbItems(): { title: string | React.ReactNode; key: string }[] {
    const items: { title: string | React.ReactNode; key: string }[] = [
      {
        title: (
          <a onClick={() => setPrefix("")}>{bucketName}</a>
        ),
        key: "root",
      },
    ];
    if (!prefix) return items;

    const parts = prefix.split("/").filter(Boolean);
    parts.forEach((part, index) => {
      const partPrefix = parts.slice(0, index + 1).join("/") + "/";
      const isLast = index === parts.length - 1;
      items.push({
        title: isLast ? (
          part
        ) : (
          <a onClick={() => setPrefix(partPrefix)}>{part}</a>
        ),
        key: partPrefix,
      });
    });
    return items;
  }

  async function handleUpload(options: UploadRequestOption) {
    const file = options.file as File;
    const key = prefix + file.name;
    try {
      await uploadObject(config, bucketName!, key, file);
      message.success(`Uploaded ${file.name}`);
      options.onSuccess?.(null);
      fetchObjects();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      message.error(errorMessage);
      options.onError?.(new Error(errorMessage));
    }
  }

  async function handleDownload(key: string) {
    try {
      const blob = await downloadObject(config, bucketName!, key);
      const url = URL.createObjectURL(blob);
      const fileName = key.split("/").pop() ?? key;
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Download failed";
      message.error(errorMessage);
    }
  }

  async function handleDelete(key: string) {
    try {
      await deleteObject(config, bucketName!, key);
      message.success(`Deleted ${key}`);
      fetchObjects();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Delete failed";
      message.error(errorMessage);
    }
  }

  function formatBytes(bytes: number | undefined): string {
    if (bytes === undefined || bytes === null) return "-";
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const exponent = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1
    );
    const value = bytes / Math.pow(1024, exponent);
    return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
  }

  const columns: ColumnsType<DisplayRow> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: DisplayRow) => {
        if (record.type === "folder") {
          return (
            <a onClick={() => navigateToFolder(record.key)}>
              <Space>
                <FolderOutlined style={{ color: "#faad14" }} />
                {name}/
              </Space>
            </a>
          );
        }
        return (
          <Space>
            <FileOutlined />
            {name}
          </Space>
        );
      },
    },
    {
      title: "Size",
      dataIndex: "size",
      key: "size",
      width: 120,
      render: (_: number | undefined, record: DisplayRow) =>
        record.type === "folder" ? "-" : formatBytes(record.size),
    },
    {
      title: "Last Modified",
      dataIndex: "lastModified",
      key: "lastModified",
      width: 200,
      render: (date: Date | undefined) =>
        date ? new Date(date).toLocaleString() : "-",
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      render: (_: unknown, record: DisplayRow) => {
        if (record.type === "folder") return null;
        return (
          <Space>
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record.key)}
            />
            <Popconfirm
              title="Delete this object?"
              onConfirm={() => handleDelete(record.key)}
              okText="Delete"
              cancelText="Cancel"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title={bucketName ?? ""}
        breadcrumb={buildBreadcrumbItems().map((item) => ({
          title: item.title as string,
          onClick: typeof item.title === "object" ? () => {} : undefined,
        }))}
        actions={
          <>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => {
                if (prefix) {
                  navigateUp();
                } else {
                  navigate("/s3");
                }
              }}
            >
              Back
            </Button>
            <Upload customRequest={handleUpload} showUploadList={false}>
              <Button icon={<UploadOutlined />} type="primary">
                Upload
              </Button>
            </Upload>
            <Button icon={<ReloadOutlined />} onClick={fetchObjects} loading={loading}>
              Refresh
            </Button>
          </>
        }
      />

      <Table<DisplayRow>
        dataSource={rows}
        columns={columns}
        rowKey="key"
        pagination={false}
        size="middle"
        loading={loading}
        locale={{ emptyText: "No objects in this location." }}
      />
    </div>
  );
}
