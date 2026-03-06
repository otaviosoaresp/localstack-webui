import { useState, useEffect, useCallback } from "react";
import {
  Typography,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Popconfirm,
  message,
  Space,
  Tag,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useConfig } from "../../config/ConfigContext";
import { PageHeader } from "../../components/PageHeader";
import { ScalarAttributeType } from "@aws-sdk/client-dynamodb";
import {
  listTables,
  describeTable,
  createTable,
  deleteTable,
} from "../../services/dynamodb-service";
import type { TableSummary } from "../../services/dynamodb-service";

interface CreateTableFormValues {
  tableName: string;
  partitionKeyName: string;
  partitionKeyType: ScalarAttributeType;
  sortKeyName?: string;
  sortKeyType?: ScalarAttributeType;
}

const KEY_TYPE_OPTIONS = [
  { label: "String (S)", value: "S" },
  { label: "Number (N)", value: "N" },
  { label: "Binary (B)", value: "B" },
];

function statusColor(status: string): string {
  if (status === "ACTIVE") return "green";
  if (status === "CREATING") return "blue";
  if (status === "DELETING") return "red";
  return "default";
}

export function DynamoDBPage() {
  const { config } = useConfig();
  const navigate = useNavigate();
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [form] = Form.useForm<CreateTableFormValues>();

  const fetchTables = useCallback(async () => {
    setLoading(true);
    try {
      const tableNames = await listTables(config);
      const descriptions = await Promise.all(
        tableNames.map((name) => describeTable(config, name))
      );
      setTables(descriptions);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to list tables";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const handleCreateTable = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setCreating(true);
      await createTable(
        config,
        values.tableName,
        values.partitionKeyName,
        values.partitionKeyType,
        values.sortKeyName || undefined,
        values.sortKeyType || undefined
      );
      message.success(`Table "${values.tableName}" created`);
      setModalOpen(false);
      form.resetFields();
      await fetchTables();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create table";
      message.error(errorMessage);
    } finally {
      setCreating(false);
    }
  }, [config, form, fetchTables]);

  const handleDeleteTable = useCallback(
    async (tableName: string) => {
      try {
        await deleteTable(config, tableName);
        message.success(`Table "${tableName}" deleted`);
        await fetchTables();
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to delete table";
        message.error(errorMessage);
      }
    },
    [config, fetchTables]
  );

  const columns = [
    {
      title: "Table Name",
      dataIndex: "tableName",
      key: "tableName",
      render: (name: string) => (
        <Button
          type="link"
          onClick={() => navigate(`/dynamodb/${encodeURIComponent(name)}`)}
          style={{ padding: 0 }}
        >
          {name}
        </Button>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: string) => (
        <Tag color={statusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: "Item Count",
      dataIndex: "itemCount",
      key: "itemCount",
      width: 120,
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_: unknown, record: TableSummary) => (
        <Popconfirm
          title={`Delete table "${record.tableName}"?`}
          description="This action cannot be undone."
          onConfirm={() => handleDeleteTable(record.tableName)}
          okText="Delete"
          okType="danger"
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="DynamoDB Tables"
        actions={
          <>
            <Button icon={<ReloadOutlined />} onClick={fetchTables} loading={loading}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalOpen(true)}
            >
              Create Table
            </Button>
          </>
        }
      />

      <Table
        dataSource={tables}
        columns={columns}
        rowKey="tableName"
        loading={loading}
        pagination={false}
        locale={{ emptyText: "No tables found" }}
      />

      <Modal
        title="Create Table"
        open={modalOpen}
        onOk={handleCreateTable}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={creating}
        okText="Create"
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="tableName"
            label="Table Name"
            rules={[{ required: true, message: "Table name is required" }]}
          >
            <Input placeholder="my-table" />
          </Form.Item>

          <Form.Item
            name="partitionKeyName"
            label="Partition Key Name"
            rules={[
              { required: true, message: "Partition key name is required" },
            ]}
          >
            <Input placeholder="id" />
          </Form.Item>

          <Form.Item
            name="partitionKeyType"
            label="Partition Key Type"
            rules={[
              { required: true, message: "Partition key type is required" },
            ]}
          >
            <Select options={KEY_TYPE_OPTIONS} placeholder="Select type" />
          </Form.Item>

          <Form.Item name="sortKeyName" label="Sort Key Name (optional)">
            <Input placeholder="timestamp" />
          </Form.Item>

          <Form.Item name="sortKeyType" label="Sort Key Type (optional)">
            <Select
              options={KEY_TYPE_OPTIONS}
              placeholder="Select type"
              allowClear
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
