import { useState } from "react";
import { Modal, Form, Input, Button, message, Space } from "antd";
import { ApiOutlined } from "@ant-design/icons";
import { useConfig } from "../config/ConfigContext";
import type { AwsConfig } from "../config/aws-config";
import { DEFAULT_CONFIG, createS3Client } from "../config/aws-config";
import { ListBucketsCommand } from "@aws-sdk/client-s3";

interface ConfigModalProps {
  open: boolean;
  onClose: () => void;
}

export function ConfigModal({ open, onClose }: ConfigModalProps) {
  const { config, updateConfig } = useConfig();
  const [form] = Form.useForm<AwsConfig>();
  const [testing, setTesting] = useState(false);

  async function handleTestConnection() {
    setTesting(true);
    try {
      const values = form.getFieldsValue();
      const client = createS3Client(values);
      await client.send(new ListBucketsCommand({}));
      message.success("Connection successful");
    } catch {
      message.error("Connection failed. Check your endpoint and credentials.");
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    form.validateFields().then((values) => {
      updateConfig(values);
      message.success("Configuration saved");
      onClose();
    });
  }

  return (
    <Modal
      title="LocalStack Configuration"
      open={open}
      onCancel={onClose}
      footer={
        <Space>
          <Button
            icon={<ApiOutlined />}
            onClick={handleTestConnection}
            loading={testing}
          >
            Test Connection
          </Button>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={handleSave}>
            Save
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={config}
      >
        <Form.Item
          name="endpoint"
          label="Endpoint URL"
          rules={[{ required: true, message: "Endpoint is required" }]}
        >
          <Input placeholder={DEFAULT_CONFIG.endpoint} />
        </Form.Item>
        <Form.Item
          name="region"
          label="Region"
          rules={[{ required: true, message: "Region is required" }]}
        >
          <Input placeholder={DEFAULT_CONFIG.region} />
        </Form.Item>
        <Form.Item
          name="accessKeyId"
          label="Access Key ID"
          rules={[{ required: true, message: "Access Key is required" }]}
        >
          <Input placeholder={DEFAULT_CONFIG.accessKeyId} />
        </Form.Item>
        <Form.Item
          name="secretAccessKey"
          label="Secret Access Key"
          rules={[{ required: true, message: "Secret Key is required" }]}
        >
          <Input.Password placeholder={DEFAULT_CONFIG.secretAccessKey} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
