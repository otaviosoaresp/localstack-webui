import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Breadcrumb,
  Tag,
  Space,
  Popconfirm,
  message,
} from "antd";
import {
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { LogGroup, LogStream } from "@aws-sdk/client-cloudwatch-logs";
import { useConfig } from "../../config/ConfigContext";
import { PageHeader } from "../../components/PageHeader";
import {
  listLogGroups,
  listLogStreams,
  createLogGroup,
  deleteLogGroup,
  deleteLogStream,
} from "../../services/cloudwatch-service";

function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || bytes === null) return "-";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(1)} ${units[exponent]}`;
}

function formatDate(timestamp: number | undefined): string {
  if (!timestamp) return "-";
  return new Date(timestamp).toISOString().replace("T", " ").replace("Z", "");
}

export function CloudWatchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { config } = useConfig();

  const [logGroups, setLogGroups] = useState<LogGroup[]>([]);
  const [logStreams, setLogStreams] = useState<LogStream[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(
    searchParams.get("logGroup")
  );
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm] = Form.useForm<{ logGroupName: string }>();
  const [messageApi, contextHolder] = message.useMessage();

  const fetchLogGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const groups = await listLogGroups(config);
      setLogGroups(groups);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load log groups";
      messageApi.error(errorMessage);
    } finally {
      setLoadingGroups(false);
    }
  }, [config, messageApi]);

  const fetchLogStreams = useCallback(
    async (logGroupName: string) => {
      setLoadingStreams(true);
      try {
        const streams = await listLogStreams(config, logGroupName);
        setLogStreams(streams);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load log streams";
        messageApi.error(errorMessage);
      } finally {
        setLoadingStreams(false);
      }
    },
    [config, messageApi]
  );

  useEffect(() => {
    fetchLogGroups();
  }, [fetchLogGroups]);

  useEffect(() => {
    if (selectedGroup) {
      fetchLogStreams(selectedGroup);
    }
  }, [selectedGroup, fetchLogStreams]);

  function handleSelectGroup(logGroupName: string) {
    setSelectedGroup(logGroupName);
    setSearchParams({ logGroup: logGroupName });
  }

  function handleBackToGroups() {
    setSelectedGroup(null);
    setLogStreams([]);
    setSearchParams({});
  }

  function handleSelectStream(logStreamName: string) {
    if (!selectedGroup) return;
    navigate(
      `/cloudwatch/${encodeURIComponent(selectedGroup)}/${encodeURIComponent(logStreamName)}`
    );
  }

  function handleRefresh() {
    if (selectedGroup) {
      fetchLogStreams(selectedGroup);
    } else {
      fetchLogGroups();
    }
  }

  async function handleCreateLogGroup(values: { logGroupName: string }) {
    setCreateLoading(true);
    try {
      await createLogGroup(config, values.logGroupName);
      messageApi.success(`Log group "${values.logGroupName}" created`);
      setCreateModalOpen(false);
      createForm.resetFields();
      await fetchLogGroups();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create log group";
      messageApi.error(errorMessage);
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleDeleteLogGroup(logGroupName: string) {
    try {
      await deleteLogGroup(config, logGroupName);
      messageApi.success(`Log group "${logGroupName}" deleted`);
      if (selectedGroup === logGroupName) {
        handleBackToGroups();
      }
      await fetchLogGroups();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete log group";
      messageApi.error(errorMessage);
    }
  }

  async function handleDeleteLogStream(logStreamName: string) {
    if (!selectedGroup) return;
    try {
      await deleteLogStream(config, selectedGroup, logStreamName);
      messageApi.success(`Log stream "${logStreamName}" deleted`);
      await fetchLogStreams(selectedGroup);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete log stream";
      messageApi.error(errorMessage);
    }
  }

  const logGroupColumns: ColumnsType<LogGroup> = [
    {
      title: "Log Group Name",
      dataIndex: "logGroupName",
      key: "logGroupName",
      render: (name: string) => (
        <a onClick={() => handleSelectGroup(name)}>{name}</a>
      ),
    },
    {
      title: "Stored Bytes",
      dataIndex: "storedBytes",
      key: "storedBytes",
      width: 150,
      render: (bytes: number | undefined) => formatBytes(bytes),
    },
    {
      title: "Creation Time",
      dataIndex: "creationTime",
      key: "creationTime",
      width: 220,
      render: (timestamp: number | undefined) => (
        <Tag color="blue">{formatDate(timestamp)}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      render: (_: unknown, record: LogGroup) => (
        <Popconfirm
          title="Delete log group"
          description={`Delete "${record.logGroupName}" and all its streams?`}
          onConfirm={() => handleDeleteLogGroup(record.logGroupName!)}
          okText="Delete"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const logStreamColumns: ColumnsType<LogStream> = [
    {
      title: "Log Stream Name",
      dataIndex: "logStreamName",
      key: "logStreamName",
      render: (name: string) => (
        <a onClick={() => handleSelectStream(name)}>{name}</a>
      ),
    },
    {
      title: "Last Event",
      dataIndex: "lastEventTimestamp",
      key: "lastEventTimestamp",
      width: 220,
      render: (timestamp: number | undefined) => (
        <Tag color="green">{formatDate(timestamp)}</Tag>
      ),
    },
    {
      title: "Stored Bytes",
      dataIndex: "storedBytes",
      key: "storedBytes",
      width: 150,
      render: (bytes: number | undefined) => formatBytes(bytes),
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      render: (_: unknown, record: LogStream) => (
        <Popconfirm
          title="Delete log stream"
          description={`Delete "${record.logStreamName}"?`}
          onConfirm={() => handleDeleteLogStream(record.logStreamName!)}
          okText="Delete"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  function renderBreadcrumb() {
    const items = [
      {
        title: selectedGroup ? (
          <a onClick={handleBackToGroups}>Log Groups</a>
        ) : (
          "Log Groups"
        ),
      },
    ];
    if (selectedGroup) {
      items.push({ title: selectedGroup });
    }
    return <Breadcrumb style={{ marginBottom: 16 }} items={items} />;
  }

  return (
    <div>
      {contextHolder}
      {renderBreadcrumb()}

      <PageHeader
        title={selectedGroup ? "Log Streams" : "CloudWatch Log Groups"}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loadingGroups || loadingStreams}>
              Refresh
            </Button>
            {!selectedGroup && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalOpen(true)}
              >
                Create Log Group
              </Button>
            )}
          </Space>
        }
      />

      {selectedGroup ? (
        <Table<LogStream>
          columns={logStreamColumns}
          dataSource={logStreams}
          rowKey="logStreamName"
          loading={loadingStreams}
          pagination={{ pageSize: 20 }}
          size="small"
          bordered
        />
      ) : (
        <Table<LogGroup>
          columns={logGroupColumns}
          dataSource={logGroups}
          rowKey="logGroupName"
          loading={loadingGroups}
          pagination={{ pageSize: 20 }}
          size="small"
          bordered
        />
      )}

      <Modal
        title="Create Log Group"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          createForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form<{ logGroupName: string }>
          form={createForm}
          layout="vertical"
          onFinish={handleCreateLogGroup}
        >
          <Form.Item
            name="logGroupName"
            label="Log Group Name"
            rules={[{ required: true, message: "Log group name is required" }]}
          >
            <Input placeholder="/my-app/production" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => {
                setCreateModalOpen(false);
                createForm.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={createLoading}>
                Create
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
