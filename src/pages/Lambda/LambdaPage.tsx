import { useState, useEffect, useCallback } from "react";
import {
  Typography,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Upload,
  Tag,
  Descriptions,
  Space,
  Popconfirm,
  message,
  Drawer,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  DeleteOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import type { ColumnsType } from "antd/es/table";
import type { FunctionConfiguration } from "@aws-sdk/client-lambda";
import type { UploadFile } from "antd/es/upload";
import { useConfig } from "../../config/ConfigContext";
import { PageHeader } from "../../components/PageHeader";
import {
  listFunctions,
  invokeFunction,
  getFunctionConfiguration,
  createFunction,
  deleteFunction,
  updateFunctionCode,
  SUPPORTED_RUNTIMES,
  type InvokeResult,
} from "../../services/lambda-service";
import type { Runtime } from "../../services/lambda-service";

const RUNTIME_COLORS: Record<string, string> = {
  "python3.8": "blue",
  "python3.9": "blue",
  "python3.10": "blue",
  "python3.11": "blue",
  "python3.12": "blue",
  "python3.13": "blue",
  "nodejs14.x": "green",
  "nodejs16.x": "green",
  "nodejs18.x": "green",
  "nodejs20.x": "green",
  "nodejs22.x": "green",
  "java11": "orange",
  "java17": "orange",
  "java21": "orange",
  "go1.x": "cyan",
  "provided.al2": "purple",
  "provided.al2023": "purple",
  "dotnet6": "magenta",
  "dotnet8": "magenta",
  "ruby3.2": "red",
  "ruby3.3": "red",
};

function getRuntimeColor(runtime: string | undefined): string {
  if (!runtime) return "default";
  return RUNTIME_COLORS[runtime] ?? "default";
}

function formatPayload(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

async function readFileAsUint8Array(file: File): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

interface CreateFunctionFormValues {
  functionName: string;
  runtime: Runtime;
  handler: string;
  description?: string;
  timeout?: number;
  memorySize?: number;
}

export function LambdaPage() {
  const { config } = useConfig();
  const [functions, setFunctions] = useState<FunctionConfiguration[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedFunction, setSelectedFunction] =
    useState<FunctionConfiguration | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [invokeModalOpen, setInvokeModalOpen] = useState(false);
  const [invokeFunctionName, setInvokeFunctionName] = useState("");
  const [invokePayload, setInvokePayload] = useState("{}");
  const [invokeLoading, setInvokeLoading] = useState(false);
  const [invokeResult, setInvokeResult] = useState<InvokeResult | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createFileList, setCreateFileList] = useState<UploadFile[]>([]);
  const [updateCodeModalOpen, setUpdateCodeModalOpen] = useState(false);
  const [updateCodeFunctionName, setUpdateCodeFunctionName] = useState("");
  const [updateCodeFileList, setUpdateCodeFileList] = useState<UploadFile[]>([]);
  const [updateCodeLoading, setUpdateCodeLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [createForm] = Form.useForm<CreateFunctionFormValues>();

  const loadFunctions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listFunctions(config);
      setFunctions(result);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load functions";
      messageApi.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [config, messageApi]);

  useEffect(() => {
    loadFunctions();
  }, [loadFunctions]);

  async function handleOpenDetail(functionName: string) {
    setDrawerOpen(true);
    setDetailLoading(true);
    try {
      const detail = await getFunctionConfiguration(config, functionName);
      setSelectedFunction(detail);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load function details";
      messageApi.error(errorMessage);
      setDrawerOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  function handleCloseDetail() {
    setDrawerOpen(false);
    setSelectedFunction(null);
  }

  function handleOpenInvokeModal(functionName: string) {
    setInvokeFunctionName(functionName);
    setInvokePayload("{}");
    setInvokeResult(null);
    setInvokeModalOpen(true);
  }

  function handleCloseInvokeModal() {
    setInvokeModalOpen(false);
    setInvokeFunctionName("");
    setInvokePayload("{}");
    setInvokeResult(null);
  }

  async function handleInvoke() {
    setInvokeLoading(true);
    try {
      const result = await invokeFunction(
        config,
        invokeFunctionName,
        invokePayload
      );
      setInvokeResult(result);
      messageApi.success(
        `Function invoked successfully (Status: ${result.statusCode})`
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Invocation failed";
      messageApi.error(errorMessage);
    } finally {
      setInvokeLoading(false);
    }
  }

  async function handleCreate(values: CreateFunctionFormValues) {
    if (createFileList.length === 0) {
      messageApi.error("Please upload a .zip file with your function code");
      return;
    }
    setCreateLoading(true);
    try {
      const file = createFileList[0].originFileObj as File;
      const zipBytes = await readFileAsUint8Array(file);
      await createFunction(
        config,
        values.functionName,
        values.runtime,
        values.handler,
        zipBytes,
        values.description,
        values.timeout,
        values.memorySize
      );
      messageApi.success(`Function "${values.functionName}" created`);
      setCreateModalOpen(false);
      createForm.resetFields();
      setCreateFileList([]);
      await loadFunctions();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create function";
      messageApi.error(errorMessage);
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleDelete(functionName: string) {
    try {
      await deleteFunction(config, functionName);
      messageApi.success(`Function "${functionName}" deleted`);
      if (selectedFunction?.FunctionName === functionName) {
        handleCloseDetail();
      }
      await loadFunctions();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete function";
      messageApi.error(errorMessage);
    }
  }

  function handleOpenUpdateCode(functionName: string) {
    setUpdateCodeFunctionName(functionName);
    setUpdateCodeFileList([]);
    setUpdateCodeModalOpen(true);
  }

  async function handleUpdateCode() {
    if (updateCodeFileList.length === 0) {
      messageApi.error("Please upload a .zip file");
      return;
    }
    setUpdateCodeLoading(true);
    try {
      const file = updateCodeFileList[0].originFileObj as File;
      const zipBytes = await readFileAsUint8Array(file);
      await updateFunctionCode(config, updateCodeFunctionName, zipBytes);
      messageApi.success(`Code updated for "${updateCodeFunctionName}"`);
      setUpdateCodeModalOpen(false);
      setUpdateCodeFileList([]);
      await loadFunctions();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update code";
      messageApi.error(errorMessage);
    } finally {
      setUpdateCodeLoading(false);
    }
  }

  function renderEnvironmentVariables(
    env: FunctionConfiguration["Environment"]
  ) {
    const variables = env?.Variables;
    if (!variables || Object.keys(variables).length === 0) {
      return <span style={{ color: "#999" }}>None</span>;
    }
    return (
      <div>
        {Object.entries(variables).map(([key, value]) => (
          <div key={key} style={{ fontFamily: "monospace", fontSize: 12 }}>
            <strong>{key}</strong>={value}
          </div>
        ))}
      </div>
    );
  }

  const columns: ColumnsType<FunctionConfiguration> = [
    {
      title: "Function Name",
      dataIndex: "FunctionName",
      key: "FunctionName",
      render: (name: string) => (
        <Button type="link" onClick={() => handleOpenDetail(name)} style={{ padding: 0 }}>
          {name}
        </Button>
      ),
    },
    {
      title: "Runtime",
      dataIndex: "Runtime",
      key: "Runtime",
      render: (runtime: string | undefined) => (
        <Tag color={getRuntimeColor(runtime)}>{runtime ?? "N/A"}</Tag>
      ),
    },
    {
      title: "Last Modified",
      dataIndex: "LastModified",
      key: "LastModified",
      render: (date: string | undefined) =>
        date ? new Date(date).toLocaleString() : "N/A",
    },
    {
      title: "State",
      dataIndex: "State",
      key: "State",
      render: (state: string | undefined) => {
        const color = state === "Active" ? "green" : state === "Failed" ? "red" : "default";
        return <Tag color={color}>{state ?? "N/A"}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 280,
      render: (_: unknown, record: FunctionConfiguration) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => handleOpenInvokeModal(record.FunctionName ?? "")}
          >
            Invoke
          </Button>
          <Button
            size="small"
            icon={<UploadOutlined />}
            onClick={() => handleOpenUpdateCode(record.FunctionName ?? "")}
          >
            Update Code
          </Button>
          <Link
            to={`/cloudwatch?logGroup=/aws/lambda/${record.FunctionName}`}
          >
            <Button size="small" icon={<FileTextOutlined />}>
              Logs
            </Button>
          </Link>
          <Popconfirm
            title="Delete function"
            description={`Delete "${record.FunctionName}"?`}
            onConfirm={() => handleDelete(record.FunctionName ?? "")}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {contextHolder}
      <PageHeader
        title="Lambda Functions"
        actions={
          <>
            <Button icon={<ReloadOutlined />} onClick={loadFunctions} loading={loading}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalOpen(true)}
            >
              Create Function
            </Button>
          </>
        }
      />

      <Table<FunctionConfiguration>
        columns={columns}
        dataSource={functions}
        rowKey="FunctionName"
        loading={loading}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        size="middle"
      />

      <Modal
        title="Create Function"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          createForm.resetFields();
          setCreateFileList([]);
        }}
        footer={null}
        destroyOnClose
        width={560}
      >
        <Form<CreateFunctionFormValues>
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{ handler: "index.handler", timeout: 30, memorySize: 128 }}
        >
          <Form.Item
            name="functionName"
            label="Function Name"
            rules={[{ required: true, message: "Function name is required" }]}
          >
            <Input placeholder="my-function" />
          </Form.Item>
          <Form.Item
            name="runtime"
            label="Runtime"
            rules={[{ required: true, message: "Runtime is required" }]}
          >
            <Select options={SUPPORTED_RUNTIMES} placeholder="Select runtime" />
          </Form.Item>
          <Form.Item
            name="handler"
            label="Handler"
            rules={[{ required: true, message: "Handler is required" }]}
          >
            <Input placeholder="index.handler" />
          </Form.Item>
          <Form.Item label="Code (.zip)" required>
            <Upload
              beforeUpload={() => false}
              fileList={createFileList}
              onChange={({ fileList }) => setCreateFileList(fileList.slice(-1))}
              accept=".zip"
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>Select ZIP file</Button>
            </Upload>
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input placeholder="Optional description" />
          </Form.Item>
          <Space style={{ width: "100%" }} size={16}>
            <Form.Item name="timeout" label="Timeout (s)" style={{ marginBottom: 0 }}>
              <InputNumber min={1} max={900} style={{ width: 120 }} />
            </Form.Item>
            <Form.Item name="memorySize" label="Memory (MB)" style={{ marginBottom: 0 }}>
              <InputNumber min={128} max={10240} step={64} style={{ width: 120 }} />
            </Form.Item>
          </Space>
          <Form.Item style={{ marginBottom: 0, marginTop: 24, textAlign: "right" }}>
            <Space>
              <Button onClick={() => {
                setCreateModalOpen(false);
                createForm.resetFields();
                setCreateFileList([]);
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

      <Modal
        title={`Update Code: ${updateCodeFunctionName}`}
        open={updateCodeModalOpen}
        onCancel={() => {
          setUpdateCodeModalOpen(false);
          setUpdateCodeFileList([]);
        }}
        onOk={handleUpdateCode}
        confirmLoading={updateCodeLoading}
        okText="Update"
        destroyOnClose
      >
        <Upload
          beforeUpload={() => false}
          fileList={updateCodeFileList}
          onChange={({ fileList }) => setUpdateCodeFileList(fileList.slice(-1))}
          accept=".zip"
          maxCount={1}
        >
          <Button icon={<UploadOutlined />}>Select ZIP file</Button>
        </Upload>
      </Modal>

      <Drawer
        title={selectedFunction?.FunctionName ?? "Function Details"}
        open={drawerOpen}
        onClose={handleCloseDetail}
        width={600}
        loading={detailLoading}
      >
        {selectedFunction && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Function Name">
              {selectedFunction.FunctionName}
            </Descriptions.Item>
            <Descriptions.Item label="Runtime">
              <Tag color={getRuntimeColor(selectedFunction.Runtime)}>
                {selectedFunction.Runtime ?? "N/A"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Handler">
              {selectedFunction.Handler ?? "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Memory Size">
              {selectedFunction.MemorySize ?? "N/A"} MB
            </Descriptions.Item>
            <Descriptions.Item label="Timeout">
              {selectedFunction.Timeout ?? "N/A"} seconds
            </Descriptions.Item>
            <Descriptions.Item label="Role">
              {selectedFunction.Role ?? "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Description">
              {selectedFunction.Description || "No description"}
            </Descriptions.Item>
            <Descriptions.Item label="State">
              <Tag
                color={
                  selectedFunction.State === "Active"
                    ? "green"
                    : selectedFunction.State === "Failed"
                      ? "red"
                      : "default"
                }
              >
                {selectedFunction.State ?? "N/A"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Last Modified">
              {selectedFunction.LastModified
                ? new Date(selectedFunction.LastModified).toLocaleString()
                : "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Code Size">
              {selectedFunction.CodeSize
                ? `${(selectedFunction.CodeSize / 1024).toFixed(1)} KB`
                : "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="ARN">
              <span style={{ fontFamily: "monospace", fontSize: 12 }}>
                {selectedFunction.FunctionArn ?? "N/A"}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Environment Variables">
              {renderEnvironmentVariables(selectedFunction.Environment)}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <Modal
        title={`Invoke: ${invokeFunctionName}`}
        open={invokeModalOpen}
        onCancel={handleCloseInvokeModal}
        footer={null}
        width={700}
        styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
      >
        <div style={{ marginBottom: 16 }}>
          <Typography.Text strong>Payload (JSON):</Typography.Text>
          <Input.TextArea
            value={invokePayload}
            onChange={(e) => setInvokePayload(e.target.value)}
            rows={6}
            style={{ fontFamily: "monospace", marginTop: 8 }}
            placeholder='{"key": "value"}'
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleInvoke}
            loading={invokeLoading}
          >
            Invoke
          </Button>
        </div>
        {invokeResult && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>Status Code</Typography.Text>
              <div style={{ marginTop: 4 }}>
                <Tag color={invokeResult.statusCode === 200 ? "green" : "red"}>
                  {invokeResult.statusCode}
                </Tag>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>Response Payload</Typography.Text>
              <pre
                style={{
                  background: "#f5f5f5",
                  padding: 12,
                  borderRadius: 4,
                  maxHeight: 250,
                  overflow: "auto",
                  margin: "4px 0 0",
                  fontSize: 12,
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {formatPayload(invokeResult.payload)}
              </pre>
            </div>
            {invokeResult.logResult && (
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>Log Output</Typography.Text>
                <pre
                  style={{
                    background: "#1e1e1e",
                    color: "#d4d4d4",
                    padding: 12,
                    borderRadius: 4,
                    maxHeight: 250,
                    overflow: "auto",
                    margin: "4px 0 0",
                    fontSize: 11,
                    fontFamily: "monospace",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  {invokeResult.logResult}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
