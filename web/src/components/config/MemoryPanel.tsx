import { useState } from "react";
import {
  Button,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Upload,
  App as AntApp,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  UploadOutlined,
  DeleteOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import type { UploadProps } from "antd";
import {
  addAgentMemory,
  importAgentMemories,
  deleteAgentMemory,
  clearAgentMemory,
  addUserMemory,
  importUserMemories,
  deleteUserMemory,
  clearUserMemory,
} from "@/api/config";
import type { MemoryItem } from "@/api/types";

// scope 决定操作的是 Agent 默认记忆还是某个用户的个人记忆
type Scope = { kind: "agent" } | { kind: "user"; userId: string };

interface Props {
  scope: Scope;
  memories: MemoryItem[];
  onChange: () => void;
}

export default function MemoryPanel({ scope, memories, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const { message } = AntApp.useApp();

  const api = {
    add: (k: string, v: string) =>
      scope.kind === "agent"
        ? addAgentMemory(k, v)
        : addUserMemory(scope.userId, k, v),
    importMany: (items: { key: string; value: string }[]) =>
      scope.kind === "agent"
        ? importAgentMemories(items)
        : importUserMemories(scope.userId, items),
    remove: (id: string) =>
      scope.kind === "agent"
        ? deleteAgentMemory(id)
        : deleteUserMemory(scope.userId, id),
    clear: () =>
      scope.kind === "agent"
        ? clearAgentMemory()
        : clearUserMemory(scope.userId),
  };

  const onAdd = async () => {
    const v = await form.validateFields();
    await api.add(v.key, v.value);
    message.success("记忆已保存");
    setOpen(false);
    form.resetFields();
    onChange();
  };

  const uploadProps: UploadProps = {
    accept: ".json",
    showUploadList: false,
    beforeUpload: async (file) => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        let items: { key: string; value: string }[];
        if (Array.isArray(parsed)) {
          items = parsed.map((p) => ({
            key: String(p.key),
            value: String(p.value),
          }));
        } else {
          items = Object.entries(parsed).map(([key, value]) => ({
            key,
            value: String(value),
          }));
        }
        const n = await api.importMany(items);
        message.success(`成功导入 ${n} 条记忆`);
        onChange();
      } catch {
        message.error("解析失败，请检查 JSON 格式");
      }
      return false;
    },
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          添加记忆
        </Button>
        <Upload {...uploadProps}>
          <Button icon={<UploadOutlined />}>导入 JSON</Button>
        </Upload>
        <Popconfirm
          title="确认清空全部记忆？此操作不可撤销"
          onConfirm={async () => {
            await api.clear();
            message.success("已清空");
            onChange();
          }}
        >
          <Button danger icon={<ClearOutlined />} disabled={memories.length === 0}>
            清空
          </Button>
        </Popconfirm>
      </Space>

      <Table<MemoryItem>
        rowKey="id"
        dataSource={memories}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: "键 (key)", dataIndex: "key", width: 220 },
          { title: "值 (value)", dataIndex: "value" },
          {
            title: "操作",
            width: 100,
            render: (_, m) => (
              <Popconfirm
                title="删除该记忆？"
                onConfirm={async () => {
                  await api.remove(m.id);
                  onChange();
                }}
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            ),
          },
        ]}
      />

      <Modal
        title="添加记忆"
        open={open}
        onOk={onAdd}
        onCancel={() => setOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="key" label="键" rules={[{ required: true }]}>
            <Input placeholder="如：用户偏好语言" />
          </Form.Item>
          <Form.Item name="value" label="值" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="如：中文" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
