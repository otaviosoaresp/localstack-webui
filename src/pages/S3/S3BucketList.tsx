import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  Button,
  Space,
  Modal,
  Input,
  Popconfirm,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Bucket } from "@aws-sdk/client-s3";
import {
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useConfig } from "../../config/ConfigContext";
import { PageHeader } from "../../components/PageHeader";
import {
  listBuckets,
  createBucket,
  deleteBucket,
} from "../../services/s3-service";

export function S3BucketList() {
  const navigate = useNavigate();
  const { config } = useConfig();
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [newBucketName, setNewBucketName] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);

  const fetchBuckets = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listBuckets(config);
      setBuckets(result);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to list buckets";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    fetchBuckets();
  }, [fetchBuckets]);

  async function handleCreateBucket() {
    if (!newBucketName.trim()) {
      message.warning("Bucket name is required");
      return;
    }
    setCreating(true);
    try {
      await createBucket(config, newBucketName.trim());
      message.success(`Bucket "${newBucketName.trim()}" created`);
      setModalOpen(false);
      setNewBucketName("");
      fetchBuckets();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create bucket";
      message.error(errorMessage);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteBucket(bucketName: string) {
    try {
      await deleteBucket(config, bucketName);
      message.success(`Bucket "${bucketName}" deleted`);
      fetchBuckets();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete bucket";
      message.error(errorMessage);
    }
  }

  const columns: ColumnsType<Bucket> = [
    {
      title: "Bucket Name",
      dataIndex: "Name",
      key: "Name",
      render: (name: string) => (
        <a onClick={() => navigate(`/s3/${name}`)}>{name}</a>
      ),
    },
    {
      title: "Creation Date",
      dataIndex: "CreationDate",
      key: "CreationDate",
      width: 200,
      render: (date: Date | undefined) =>
        date ? new Date(date).toLocaleString() : "-",
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_: unknown, record: Bucket) => (
        <Popconfirm
          title="Delete this bucket?"
          description="This action cannot be undone. The bucket must be empty."
          onConfirm={() => handleDeleteBucket(record.Name!)}
          okText="Delete"
          cancelText="Cancel"
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="S3 Buckets"
        actions={
          <>
            <Button icon={<ReloadOutlined />} onClick={fetchBuckets} loading={loading}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalOpen(true)}
            >
              Create Bucket
            </Button>
          </>
        }
      />

      <Table<Bucket>
        dataSource={buckets}
        columns={columns}
        rowKey="Name"
        pagination={false}
        size="middle"
        loading={loading}
        locale={{ emptyText: "No buckets found. Create one to get started." }}
      />

      <Modal
        title="Create Bucket"
        open={modalOpen}
        onOk={handleCreateBucket}
        onCancel={() => {
          setModalOpen(false);
          setNewBucketName("");
        }}
        confirmLoading={creating}
        okText="Create"
      >
        <Input
          placeholder="Bucket name"
          value={newBucketName}
          onChange={(e) => setNewBucketName(e.target.value)}
          onPressEnter={handleCreateBucket}
          autoFocus
        />
      </Modal>
    </div>
  );
}
