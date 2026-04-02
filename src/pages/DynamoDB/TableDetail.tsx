import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Typography,
  Table,
  Button,
  Modal,
  Input,
  Space,
  Tag,
  Descriptions,
  message,
  Popconfirm,
} from "antd";
import {
  ArrowLeftOutlined,
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import { useConfig } from "../../config/ConfigContext";
import {
  describeTable,
  scanItems,
  putItem,
  deleteItem,
} from "../../services/dynamodb-service";
import type { TableSummary } from "../../services/dynamodb-service";

function formatKeySchema(table: TableSummary): string {
  return table.keySchema
    .map((key) => `${key.AttributeName} (${key.KeyType})`)
    .join(", ");
}

function extractKeyFromItem(
  item: Record<string, unknown>,
  table: TableSummary
): Record<string, unknown> {
  const key: Record<string, unknown> = {};
  for (const keyElement of table.keySchema) {
    const attributeName = keyElement.AttributeName!;
    key[attributeName] = item[attributeName];
  }
  return key;
}

function deriveColumnsFromItems(
  items: Record<string, unknown>[],
  table: TableSummary | null,
  onDelete: (item: Record<string, unknown>) => void
) {
  const keySet = new Set<string>();
  for (const item of items) {
    for (const key of Object.keys(item)) {
      keySet.add(key);
    }
  }

  const columns = Array.from(keySet).map((key) => ({
    title: key,
    dataIndex: key,
    key,
    ellipsis: true,
    render: (value: unknown) => {
      if (value === null || value === undefined) return "-";
      if (typeof value === "object") return JSON.stringify(value);
      return String(value);
    },
  }));

  if (table) {
    columns.push({
      title: "Actions",
      dataIndex: "__actions__",
      key: "__actions__",
      ellipsis: false,
      render: (_: unknown, record: Record<string, unknown>) => (
        <Popconfirm
          title="Delete this item?"
          onConfirm={() => onDelete(record)}
          okText="Delete"
          okType="danger"
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    } as unknown as (typeof columns)[number]);
  }

  return columns;
}

export function TableDetail() {
  const { tableName: encodedTableName } = useParams<{ tableName: string }>();
  const tableName = decodeURIComponent(encodedTableName ?? "");
  const navigate = useNavigate();
  const { config } = useConfig();

  const [tableInfo, setTableInfo] = useState<TableSummary | null>(null);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [lastEvaluatedKey, setLastEvaluatedKey] = useState<
    Record<string, unknown> | undefined
  >(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [jsonInput, setJsonInput] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  const fetchTableInfo = useCallback(async () => {
    try {
      const info = await describeTable(config, tableName);
      setTableInfo(info);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to describe table";
      message.error(errorMessage);
    }
  }, [config, tableName]);

  const fetchItems = useCallback(
    async (startKey?: Record<string, unknown>) => {
      setLoading(true);
      try {
        const result = await scanItems(config, tableName, startKey);
        if (startKey) {
          setItems((prev) => [...prev, ...result.items]);
        } else {
          setItems(result.items);
        }
        setLastEvaluatedKey(result.lastEvaluatedKey);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to scan items";
        message.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [config, tableName]
  );

  const refreshAll = useCallback(async () => {
    setLastEvaluatedKey(undefined);
    await Promise.all([fetchTableInfo(), fetchItems()]);
  }, [fetchTableInfo, fetchItems]);

  useEffect(() => {
    if (tableName) {
      refreshAll();
    }
  }, [tableName, refreshAll]);

  const handleCreateItem = useCallback(async () => {
    try {
      const parsed: unknown = JSON.parse(jsonInput);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        message.error("Input must be a JSON object");
        return;
      }
      setSaving(true);
      await putItem(config, tableName, parsed as Record<string, unknown>);
      message.success("Item created");
      setModalOpen(false);
      setJsonInput("");
      await refreshAll();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create item";
      message.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }, [config, tableName, jsonInput, refreshAll]);

  const handleDeleteItem = useCallback(
    async (item: Record<string, unknown>) => {
      if (!tableInfo) return;
      try {
        const key = extractKeyFromItem(item, tableInfo);
        await deleteItem(config, tableName, key);
        message.success("Item deleted");
        await refreshAll();
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to delete item";
        message.error(errorMessage);
      }
    },
    [config, tableName, tableInfo, refreshAll]
  );

  const columns = useMemo(
    () => deriveColumnsFromItems(items, tableInfo, handleDeleteItem),
    [items, tableInfo, handleDeleteItem]
  );

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/dynamodb")}
          >
            Back
          </Button>
          <Typography.Title level={2} style={{ margin: 0 }}>
            {tableName}
          </Typography.Title>
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={refreshAll}>
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
          >
            Create Item
          </Button>
        </Space>
      </div>

      {tableInfo && (
        <Descriptions
          bordered
          size="small"
          column={3}
          style={{ marginBottom: 16 }}
        >
          <Descriptions.Item label="Table Name">
            {tableInfo.tableName}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={tableInfo.status === "ACTIVE" ? "green" : "default"}>
              {tableInfo.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Item Count">
            {tableInfo.itemCount}
          </Descriptions.Item>
          <Descriptions.Item label="Key Schema" span={3}>
            {formatKeySchema(tableInfo)}
          </Descriptions.Item>
        </Descriptions>
      )}

      <Table
        dataSource={items}
        columns={columns}
        rowKey={(record, index) =>
          JSON.stringify(
            tableInfo ? extractKeyFromItem(record, tableInfo) : index
          )
        }
        loading={loading}
        pagination={false}
        scroll={{ x: "max-content" }}
        locale={{ emptyText: "No items found" }}
      />

      {lastEvaluatedKey && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Button
            onClick={() => fetchItems(lastEvaluatedKey)}
            loading={loading}
          >
            Load More
          </Button>
        </div>
      )}

      <Modal
        title="Create Item"
        open={modalOpen}
        onOk={handleCreateItem}
        onCancel={() => {
          setModalOpen(false);
          setJsonInput("");
        }}
        confirmLoading={saving}
        okText="Create"
        destroyOnClose
      >
        <Typography.Text
          type="secondary"
          style={{ display: "block", marginBottom: 8 }}
        >
          Paste a JSON object representing the item:
        </Typography.Text>
        <Input.TextArea
          rows={10}
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder={'{\n  "id": "123",\n  "name": "example"\n}'}
          style={{ fontFamily: "monospace" }}
        />
      </Modal>
    </div>
  );
}
