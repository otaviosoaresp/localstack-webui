import { useState, useCallback, useEffect } from "react";
import {
  Typography,
  Tabs,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Drawer,
  Tag,
  Descriptions,
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
import { useConfig } from "../../config/ConfigContext";
import { PageHeader } from "../../components/PageHeader";
import {
  listRoles,
  getRole,
  createRole,
  deleteRole,
  listRolePolicies,
  listPolicies,
  createPolicy,
  deletePolicy,
  getPolicyVersion,
  type Role,
  type Policy,
  type AttachedPolicy,
} from "../../services/iam-service";

const DEFAULT_TRUST_POLICY = JSON.stringify(
  {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { Service: "lambda.amazonaws.com" },
        Action: "sts:AssumeRole",
      },
    ],
  },
  null,
  2
);

const DEFAULT_POLICY_DOCUMENT = JSON.stringify(
  {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["s3:GetObject", "s3:PutObject"],
        Resource: "arn:aws:s3:::*/*",
      },
    ],
  },
  null,
  2
);

function formatDate(date: Date | undefined): string {
  if (!date) return "-";
  return date.toLocaleString();
}

function formatPolicyDocument(encoded: string | undefined): string {
  if (!encoded) return "{}";
  try {
    const decoded = decodeURIComponent(encoded);
    return JSON.stringify(JSON.parse(decoded), null, 2);
  } catch {
    return encoded;
  }
}

function PolicyDocumentBlock({ document: doc }: { document: string }) {
  return (
    <pre
      style={{
        background: "#f5f5f5",
        padding: 16,
        borderRadius: 6,
        fontSize: 13,
        overflow: "auto",
        maxHeight: 400,
        border: "1px solid #d9d9d9",
      }}
    >
      {doc}
    </pre>
  );
}

interface CreateRoleFormValues {
  roleName: string;
  description?: string;
  trustPolicy: string;
}

interface CreatePolicyFormValues {
  policyName: string;
  description?: string;
  policyDocument: string;
}

function RolesTab() {
  const { config } = useConfig();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [attachedPolicies, setAttachedPolicies] = useState<AttachedPolicy[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm] = Form.useForm<CreateRoleFormValues>();
  const [messageApi, contextHolder] = message.useMessage();

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listRoles(config);
      setRoles(result);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to list roles";
      messageApi.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [config, messageApi]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const openRoleDetail = useCallback(
    async (roleName: string) => {
      setDrawerOpen(true);
      setDetailLoading(true);
      try {
        const [roleDetail, policies] = await Promise.all([
          getRole(config, roleName),
          listRolePolicies(config, roleName),
        ]);
        setSelectedRole(roleDetail);
        setAttachedPolicies(policies);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to load role details";
        messageApi.error(errorMessage);
      } finally {
        setDetailLoading(false);
      }
    },
    [config, messageApi]
  );

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelectedRole(null);
    setAttachedPolicies([]);
  }, []);

  async function handleCreate(values: CreateRoleFormValues) {
    setCreateLoading(true);
    try {
      JSON.parse(values.trustPolicy);
      await createRole(config, values.roleName, values.trustPolicy, values.description);
      messageApi.success(`Role "${values.roleName}" created`);
      setCreateModalOpen(false);
      createForm.resetFields();
      await fetchRoles();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create role";
      messageApi.error(errorMessage);
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleDelete(roleName: string) {
    try {
      await deleteRole(config, roleName);
      messageApi.success(`Role "${roleName}" deleted`);
      if (selectedRole?.RoleName === roleName) {
        closeDrawer();
      }
      await fetchRoles();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete role";
      messageApi.error(errorMessage);
    }
  }

  const columns: ColumnsType<Role> = [
    {
      title: "Role Name",
      dataIndex: "RoleName",
      key: "RoleName",
      render: (name: string) => (
        <a onClick={() => openRoleDetail(name)}>{name}</a>
      ),
    },
    {
      title: "ARN",
      dataIndex: "Arn",
      key: "Arn",
      ellipsis: true,
    },
    {
      title: "Created",
      dataIndex: "CreateDate",
      key: "CreateDate",
      width: 200,
      render: (date: Date) => formatDate(date),
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      render: (_: unknown, record: Role) => (
        <Popconfirm
          title="Delete role"
          description={`Delete "${record.RoleName}" and detach all policies?`}
          onConfirm={() => handleDelete(record.RoleName!)}
          okText="Delete"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={fetchRoles} loading={loading}>
          Refresh
        </Button>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalOpen(true)}
        >
          Create Role
        </Button>
      </Space>
      <Table<Role>
        columns={columns}
        dataSource={roles}
        rowKey="RoleName"
        loading={loading}
        pagination={{ pageSize: 20 }}
        size="middle"
      />

      <Modal
        title="Create Role"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          createForm.resetFields();
        }}
        footer={null}
        destroyOnClose
        width={600}
      >
        <Form<CreateRoleFormValues>
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{ trustPolicy: DEFAULT_TRUST_POLICY }}
        >
          <Form.Item
            name="roleName"
            label="Role Name"
            rules={[{ required: true, message: "Role name is required" }]}
          >
            <Input placeholder="my-role" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input placeholder="Optional description" />
          </Form.Item>
          <Form.Item
            name="trustPolicy"
            label="Trust Policy (JSON)"
            rules={[
              { required: true, message: "Trust policy is required" },
              {
                validator: (_, value) => {
                  try {
                    JSON.parse(value);
                    return Promise.resolve();
                  } catch {
                    return Promise.reject("Invalid JSON");
                  }
                },
              },
            ]}
          >
            <Input.TextArea
              rows={10}
              style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}
            />
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

      <Drawer
        title={selectedRole?.RoleName ?? "Role Details"}
        open={drawerOpen}
        onClose={closeDrawer}
        width={640}
        loading={detailLoading}
      >
        {selectedRole && (
          <>
            <Descriptions
              column={1}
              bordered
              size="small"
              style={{ marginBottom: 24 }}
            >
              <Descriptions.Item label="Role Name">
                {selectedRole.RoleName}
              </Descriptions.Item>
              <Descriptions.Item label="Path">
                {selectedRole.Path}
              </Descriptions.Item>
              <Descriptions.Item label="ARN">
                {selectedRole.Arn}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {formatDate(selectedRole.CreateDate)}
              </Descriptions.Item>
              <Descriptions.Item label="Description">
                {selectedRole.Description || "-"}
              </Descriptions.Item>
            </Descriptions>

            <Typography.Title level={5}>Trust Policy</Typography.Title>
            <PolicyDocumentBlock
              document={formatPolicyDocument(
                selectedRole.AssumeRolePolicyDocument
              )}
            />

            <Typography.Title level={5} style={{ marginTop: 24 }}>
              Attached Policies
            </Typography.Title>
            {attachedPolicies.length === 0 ? (
              <Typography.Text type="secondary">
                No attached policies
              </Typography.Text>
            ) : (
              <Space wrap>
                {attachedPolicies.map((policy) => (
                  <Tag key={policy.PolicyArn} color="blue">
                    {policy.PolicyName}
                  </Tag>
                ))}
              </Space>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}

function PoliciesTab() {
  const { config } = useConfig();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [policyDocument, setPolicyDocument] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm] = Form.useForm<CreatePolicyFormValues>();
  const [messageApi, contextHolder] = message.useMessage();

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listPolicies(config);
      setPolicies(result);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to list policies";
      messageApi.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [config, messageApi]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const openPolicyDetail = useCallback(
    async (policy: Policy) => {
      setDrawerOpen(true);
      setSelectedPolicy(policy);
      setDetailLoading(true);
      setPolicyDocument("");
      try {
        const versionId = policy.DefaultVersionId ?? "v1";
        const version = await getPolicyVersion(
          config,
          policy.Arn!,
          versionId
        );
        setPolicyDocument(
          formatPolicyDocument(version.Document)
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to load policy document";
        messageApi.error(errorMessage);
      } finally {
        setDetailLoading(false);
      }
    },
    [config, messageApi]
  );

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelectedPolicy(null);
    setPolicyDocument("");
  }, []);

  async function handleCreate(values: CreatePolicyFormValues) {
    setCreateLoading(true);
    try {
      JSON.parse(values.policyDocument);
      await createPolicy(config, values.policyName, values.policyDocument, values.description);
      messageApi.success(`Policy "${values.policyName}" created`);
      setCreateModalOpen(false);
      createForm.resetFields();
      await fetchPolicies();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create policy";
      messageApi.error(errorMessage);
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleDelete(policyArn: string, policyName: string) {
    try {
      await deletePolicy(config, policyArn);
      messageApi.success(`Policy "${policyName}" deleted`);
      if (selectedPolicy?.Arn === policyArn) {
        closeDrawer();
      }
      await fetchPolicies();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete policy";
      messageApi.error(errorMessage);
    }
  }

  const columns: ColumnsType<Policy> = [
    {
      title: "Policy Name",
      dataIndex: "PolicyName",
      key: "PolicyName",
      render: (_: string, record: Policy) => (
        <a onClick={() => openPolicyDetail(record)}>{record.PolicyName}</a>
      ),
    },
    {
      title: "ARN",
      dataIndex: "Arn",
      key: "Arn",
      ellipsis: true,
    },
    {
      title: "Attachment Count",
      dataIndex: "AttachmentCount",
      key: "AttachmentCount",
      width: 160,
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      render: (_: unknown, record: Policy) => (
        <Popconfirm
          title="Delete policy"
          description={`Delete "${record.PolicyName}"?`}
          onConfirm={() => handleDelete(record.Arn!, record.PolicyName!)}
          okText="Delete"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchPolicies}
          loading={loading}
        >
          Refresh
        </Button>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalOpen(true)}
        >
          Create Policy
        </Button>
      </Space>
      <Table<Policy>
        columns={columns}
        dataSource={policies}
        rowKey="PolicyName"
        loading={loading}
        pagination={{ pageSize: 20 }}
        size="middle"
      />

      <Modal
        title="Create Policy"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          createForm.resetFields();
        }}
        footer={null}
        destroyOnClose
        width={600}
      >
        <Form<CreatePolicyFormValues>
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{ policyDocument: DEFAULT_POLICY_DOCUMENT }}
        >
          <Form.Item
            name="policyName"
            label="Policy Name"
            rules={[{ required: true, message: "Policy name is required" }]}
          >
            <Input placeholder="my-policy" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input placeholder="Optional description" />
          </Form.Item>
          <Form.Item
            name="policyDocument"
            label="Policy Document (JSON)"
            rules={[
              { required: true, message: "Policy document is required" },
              {
                validator: (_, value) => {
                  try {
                    JSON.parse(value);
                    return Promise.resolve();
                  } catch {
                    return Promise.reject("Invalid JSON");
                  }
                },
              },
            ]}
          >
            <Input.TextArea
              rows={12}
              style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}
            />
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

      <Drawer
        title={selectedPolicy?.PolicyName ?? "Policy Details"}
        open={drawerOpen}
        onClose={closeDrawer}
        width={640}
        loading={detailLoading}
      >
        {selectedPolicy && (
          <>
            <Descriptions
              column={1}
              bordered
              size="small"
              style={{ marginBottom: 24 }}
            >
              <Descriptions.Item label="Policy Name">
                {selectedPolicy.PolicyName}
              </Descriptions.Item>
              <Descriptions.Item label="ARN">
                {selectedPolicy.Arn}
              </Descriptions.Item>
              <Descriptions.Item label="Default Version">
                {selectedPolicy.DefaultVersionId}
              </Descriptions.Item>
              <Descriptions.Item label="Attachment Count">
                {selectedPolicy.AttachmentCount}
              </Descriptions.Item>
            </Descriptions>

            <Typography.Title level={5}>Policy Document</Typography.Title>
            <PolicyDocumentBlock document={policyDocument || "{}"} />
          </>
        )}
      </Drawer>
    </>
  );
}

const TAB_ITEMS = [
  { key: "roles", label: "Roles", children: <RolesTab /> },
  { key: "policies", label: "Policies", children: <PoliciesTab /> },
];

export function IAMPage() {
  return (
    <div>
      <PageHeader title="IAM" />
      <Tabs defaultActiveKey="roles" items={TAB_ITEMS} />
    </div>
  );
}
