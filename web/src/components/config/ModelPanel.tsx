import { useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  App as AntApp,
  Popconfirm,
} from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { deleteModel, upsertModel } from "@/api/config";
import type { ModelConfig } from "@/api/types";

interface Props {
  models: ModelConfig[];
  onChange: () => void;
}

export default function ModelPanel({ models, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ModelConfig | null>(null);
  const [form] = Form.useForm();
  const { message } = AntApp.useApp();

  const openModal = (m?: ModelConfig) => {
    setEditing(m ?? null);
    form.setFieldsValue(
      m ?? {
        name: "",
        provider: "dashscope",
        model: "",
        baseUrl: "",
        apiKey: "",
        temperature: 0.7,
        maxTokens: 2048,
        isDefault: false,
      }
    );
    setOpen(true);
  };

  const onSave = async () => {
    const v = await form.validateFields();
    await upsertModel({ ...editing, ...v });
    message.success("已保存");
    setOpen(false);
    onChange();
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          新增模型
        </Button>
      </Space>

      <Table<ModelConfig>
        rowKey="id"
        dataSource={models}
        pagination={false}
        columns={[
          {
            title: "名称",
            dataIndex: "name",
            render: (v, m) => (
              <Space>
                {v}
                {m.isDefault && <Tag color="gold">默认</Tag>}
              </Space>
            ),
          },
          {
            title: "提供商",
            dataIndex: "provider",
            render: (v) => <Tag>{v}</Tag>,
          },
          { title: "模型", dataIndex: "model" },
          { title: "温度", dataIndex: "temperature", width: 80 },
          { title: "最大 Tokens", dataIndex: "maxTokens", width: 110 },
          {
            title: "操作",
            width: 120,
            render: (_, m) => (
              <Space>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => openModal(m)}
                />
                <Popconfirm
                  title="删除该模型？"
                  onConfirm={async () => {
                    await deleteModel(m.id);
                    onChange();
                  }}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? "编辑模型" : "新增模型"}
        open={open}
        onOk={onSave}
        onCancel={() => setOpen(false)}
        okText="保存"
        cancelText="取消"
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="配置名称" rules={[{ required: true }]}>
            <Input placeholder="如：通义千问 Plus" />
          </Form.Item>
          <Form.Item name="provider" label="提供商" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "dashscope", label: "DashScope (通义)" },
                { value: "openai", label: "OpenAI" },
                { value: "custom", label: "自定义" },
              ]}
            />
          </Form.Item>
          <Form.Item name="model" label="模型标识" rules={[{ required: true }]}>
            <Input placeholder="如：qwen-plus / gpt-4o" />
          </Form.Item>
          <Form.Item name="baseUrl" label="Base URL">
            <Input placeholder="API 基础地址" />
          </Form.Item>
          <Form.Item name="apiKey" label="API Key">
            <Input.Password placeholder="留空则使用服务端环境变量" />
          </Form.Item>
          <Space size="large">
            <Form.Item name="temperature" label="温度">
              <InputNumber min={0} max={2} step={0.1} />
            </Form.Item>
            <Form.Item name="maxTokens" label="最大 Tokens">
              <InputNumber min={1} max={32768} step={128} />
            </Form.Item>
            <Form.Item name="isDefault" label="设为默认" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
