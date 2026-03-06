import { useState, useEffect, useCallback } from "react";
import {
  Typography,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Drawer,
  Popconfirm,
  Space,
  message,
  Spin,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useConfig } from "../../config/ConfigContext";
import { PageHeader } from "../../components/PageHeader";
import {
  listSecrets,
  createSecret,
  getSecretValue,
  updateSecret,
  deleteSecret,
} from "../../services/secrets-service";
import type { SecretEntry, SecretValue } from "../../services/secrets-service";

function tryFormatJson(value: string): { formatted: string; isJson: boolean } {
  try {
    const parsed = JSON.parse(value);
    return { formatted: JSON.stringify(parsed, null, 2), isJson: true };
  } catch {
    return { formatted: value, isJson: false };
  }
}

interface JsonToken {
  text: string;
  type: "key" | "string" | "number" | "boolean" | "null" | "punctuation";
}

function tokenizeJson(json: string): (string | JsonToken)[] {
  const tokens: (string | JsonToken)[] = [];
  const pattern = /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|[{}[\],])/g;
  let lastIndex = 0;
  let match = pattern.exec(json);

  while (match !== null) {
    if (match.index > lastIndex) {
      tokens.push(json.slice(lastIndex, match.index));
    }
    const text = match[0];
    let type: JsonToken["type"] = "punctuation";
    if (text.startsWith('"')) {
      type = match[2] ? "key" : "string";
    } else if (/^-?\d/.test(text)) {
      type = "number";
    } else if (text === "true" || text === "false") {
      type = "boolean";
    } else if (text === "null") {
      type = "null";
    }
    tokens.push({ text, type });
    lastIndex = pattern.lastIndex;
    match = pattern.exec(json);
  }
  if (lastIndex < json.length) {
    tokens.push(json.slice(lastIndex));
  }
  return tokens;
}

const TOKEN_COLORS: Record<JsonToken["type"], string> = {
  key: "#79c0ff",
  string: "#a5d6ff",
  number: "#f0883e",
  boolean: "#ff7b72",
  null: "#8b949e",
  punctuation: "#6e7681",
};

function JsonViewer({ value }: { value: string }) {
  const { formatted, isJson } = tryFormatJson(value);

  if (!isJson) {
    return (
      <pre style={{
        margin: 0,
        padding: 16,
        background: "#f6f8fa",
        border: "1px solid var(--border, #e1e4e8)",
        borderRadius: 6,
        fontSize: 13,
        fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
        overflow: "auto",
        maxHeight: 400,
      }}>
        {value}
      </pre>
    );
  }

  const tokens = tokenizeJson(formatted);

  return (
    <pre style={{
      margin: 0,
      padding: 16,
      background: "#0f1419",
      border: "1px solid #2d333b",
      borderRadius: 6,
      fontSize: 13,
      fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
      lineHeight: 1.6,
      whiteSpace: "pre-wrap",
      wordBreak: "break-all",
      overflow: "auto",
      maxHeight: 400,
      color: "#adbac7",
    }}>
      {tokens.map((token, i) =>
        typeof token === "string" ? (
          token
        ) : (
          <span key={i} style={{ color: TOKEN_COLORS[token.type] }}>{token.text}</span>
        )
      )}
    </pre>
  );
}

interface CreateSecretFormValues {
  name: string;
  description: string;
  secretValue: string;
}

export function SecretsPage() {
  const { config } = useConfig();
  const [secrets, setSecrets] = useState<SecretEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSecret, setSelectedSecret] = useState<SecretEntry | null>(null);
  const [secretValue, setSecretValue] = useState<SecretValue | null>(null);
  const [secretValueLoading, setSecretValueLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [createForm] = Form.useForm<CreateSecretFormValues>();

  const fetchSecrets = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listSecrets(config);
      setSecrets(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      messageApi.error(`Failed to list secrets: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [config, messageApi]);

  useEffect(() => {
    fetchSecrets();
  }, [fetchSecrets]);

  async function handleCreate(values: CreateSecretFormValues) {
    setCreateLoading(true);
    try {
      await createSecret(config, values.name, values.secretValue, values.description);
      messageApi.success(`Secret "${values.name}" created`);
      setCreateModalOpen(false);
      createForm.resetFields();
      await fetchSecrets();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      messageApi.error(`Failed to create secret: ${errorMessage}`);
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleDelete(secretName: string) {
    try {
      await deleteSecret(config, secretName);
      messageApi.success(`Secret "${secretName}" deleted`);
      if (selectedSecret?.name === secretName) {
        closeDrawer();
      }
      await fetchSecrets();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      messageApi.error(`Failed to delete secret: ${errorMessage}`);
    }
  }

  async function handleOpenDrawer(record: SecretEntry) {
    setSelectedSecret(record);
    setDrawerOpen(true);
    setEditing(false);
    setSecretValue(null);
    setSecretValueLoading(true);
    try {
      const value = await getSecretValue(config, record.name);
      setSecretValue(value);
      setEditValue(value.secretString);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      messageApi.error(`Failed to fetch secret value: ${errorMessage}`);
    } finally {
      setSecretValueLoading(false);
    }
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setSelectedSecret(null);
    setSecretValue(null);
    setEditing(false);
  }

  function startEditing() {
    setEditing(true);
    setEditValue(secretValue?.secretString ?? "");
  }

  function cancelEditing() {
    setEditing(false);
    setEditValue(secretValue?.secretString ?? "");
  }

  async function handleUpdate() {
    if (!selectedSecret) return;
    setUpdateLoading(true);
    try {
      await updateSecret(config, selectedSecret.name, editValue);
      messageApi.success(`Secret "${selectedSecret.name}" updated`);
      const updatedValue = await getSecretValue(config, selectedSecret.name);
      setSecretValue(updatedValue);
      setEditing(false);
      await fetchSecrets();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      messageApi.error(`Failed to update secret: ${errorMessage}`);
    } finally {
      setUpdateLoading(false);
    }
  }

  function formatDate(date: Date | undefined): string {
    if (!date) return "-";
    return new Date(date).toLocaleString();
  }

  const columns: ColumnsType<SecretEntry> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a: SecretEntry, b: SecretEntry) => a.name.localeCompare(b.name),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "Last Changed",
      dataIndex: "lastChangedDate",
      key: "lastChangedDate",
      render: (date: Date | undefined) => formatDate(date),
      sorter: (a: SecretEntry, b: SecretEntry) => {
        const aTime = a.lastChangedDate ? new Date(a.lastChangedDate).getTime() : 0;
        const bTime = b.lastChangedDate ? new Date(b.lastChangedDate).getTime() : 0;
        return aTime - bTime;
      },
      width: 220,
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: unknown, record: SecretEntry) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDrawer(record);
            }}
          />
          <Popconfirm
            title="Delete secret"
            description={`Are you sure you want to delete "${record.name}"?`}
            onConfirm={(e) => {
              e?.stopPropagation();
              handleDelete(record.name);
            }}
            onCancel={(e) => e?.stopPropagation()}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {contextHolder}
      <PageHeader
        title="Secrets Manager"
        actions={
          <>
            <Button icon={<ReloadOutlined />} onClick={fetchSecrets} loading={loading}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalOpen(true)}
            >
              Create Secret
            </Button>
          </>
        }
      />

      <Table<SecretEntry>
        columns={columns}
        dataSource={secrets}
        rowKey="name"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} secrets` }}
        onRow={(record) => ({
          onClick: () => handleOpenDrawer(record),
          style: { cursor: "pointer" },
        })}
      />

      <Modal
        title="Create Secret"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          createForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form<CreateSecretFormValues>
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            name="name"
            label="Secret Name"
            rules={[{ required: true, message: "Secret name is required" }]}
          >
            <Input placeholder="my-secret" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input placeholder="Optional description" />
          </Form.Item>
          <Form.Item
            name="secretValue"
            label="Secret Value"
            rules={[{ required: true, message: "Secret value is required" }]}
          >
            <Input.TextArea rows={4} placeholder='{"key": "value"}' />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button
                onClick={() => {
                  setCreateModalOpen(false);
                  createForm.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={createLoading}>
                Create
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={selectedSecret?.name ?? "Secret Details"}
        open={drawerOpen}
        onClose={closeDrawer}
        width={520}
        extra={
          !editing && secretValue ? (
            <Button icon={<EditOutlined />} onClick={startEditing}>
              Edit Value
            </Button>
          ) : null
        }
      >
        {secretValueLoading ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <Spin size="large" />
          </div>
        ) : secretValue ? (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Typography.Text type="secondary">Secret Name</Typography.Text>
              <div style={{ marginTop: 4 }}>
                <Typography.Text strong>{secretValue.name}</Typography.Text>
              </div>
            </div>
            {selectedSecret?.description && (
              <div style={{ marginBottom: 16 }}>
                <Typography.Text type="secondary">Description</Typography.Text>
                <div style={{ marginTop: 4 }}>
                  <Typography.Text>{selectedSecret.description}</Typography.Text>
                </div>
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <Typography.Text type="secondary">Version ID</Typography.Text>
              <div style={{ marginTop: 4 }}>
                <Typography.Text code>{secretValue.versionId}</Typography.Text>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Typography.Text type="secondary">Secret Value</Typography.Text>
              <div style={{ marginTop: 8 }}>
                {editing ? (
                  <div>
                    <Input.TextArea
                      rows={10}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      style={{
                        fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                        fontSize: 13,
                        lineHeight: 1.6,
                      }}
                    />
                    <Space style={{ marginTop: 12 }}>
                      <Button onClick={cancelEditing}>Cancel</Button>
                      <Button
                        onClick={() => {
                          const { formatted, isJson } = tryFormatJson(editValue);
                          if (isJson) setEditValue(formatted);
                          else messageApi.warning("Value is not valid JSON");
                        }}
                      >
                        Format JSON
                      </Button>
                      <Button
                        type="primary"
                        onClick={handleUpdate}
                        loading={updateLoading}
                      >
                        Save
                      </Button>
                    </Space>
                  </div>
                ) : (
                  <JsonViewer value={secretValue.secretString} />
                )}
              </div>
            </div>
          </div>
        ) : (
          <Typography.Text type="secondary">
            No secret value available
          </Typography.Text>
        )}
      </Drawer>
    </div>
  );
}
