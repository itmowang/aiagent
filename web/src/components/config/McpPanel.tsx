import { useState } from "react";
import {
  Button,
  Form,
  Input,
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
import { deleteMcp, upsertMcp } from "@/api/config";
import type { McpServerConfig, McpTransport } from "@/api/types";

interface Props {
  servers: McpServerConfig[];
  onChange: () => void;
}

export default function McpPanel({ servers, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<McpServerConfig | null>(null);
  const [transport, setTransport] = useState<McpTransport>("stdio");
  const [form] = Form.useForm();
  const { message } = AntApp.useApp();

  const openModal = (m?: McpServerConfig) => {
    setEditing(m ?? null);
    setTransport(m?.transport ?? "stdio");
    form.setFieldsValue(
      m
        ? {
            ...m,
            args: m.args?.join(" "),
            autoApprove: m.autoApprove?.join(","),
          }
        : {
            name: "",
            transport: "stdio",
            command: "",
            args: "",
            url: "",
            enabled: true,
            autoApprove: "",
          }
    );
    setOpen(true);
  };

  const onSave = async () => {
    const v = await form.validateFields();
    await upsertMcp({
      ...editing,
      name: v.name,
      transport: v.transport,
      command: v.command,
      url: v.url,
      enabled: v.enabled,
      args: v.args ? String(v.args).split(/\s+/).filter(Boolean) : [],
      autoApprove: v.autoApprove
        ? String(v.autoApprove).split(",").map((s: string) => s.trim()).filter(Boolean)
        : [],
    });
    message.success("已保存");
    setOpen(false);
    onChange();
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          新增 MCP 服务
        </Button>
      </Space>

      <Table<McpServerConfig>
        rowKey="id"
        dataSource={servers}
        pagination={false}
        columns={[
          { title: "名称", dataIndex: "name", width: 160 },
          {
            title: "传输方式",
            dataIndex: "transport",
            width: 110,
            render: (v) => <Tag color="blue">{v}</Tag>,
          },
          {
            title: "连接",
            render: (_, m) =>
              m.transport === "stdio"
                ? `${m.command ?? ""} ${(m.args ?? []).join(" ")}`
                : m.url,
          },
          {
            title: "启用",
            dataIndex: "enabled",
            width: 90,
            render: (v: boolean, m) => (
              <Switch
                size="small"
                checked={v}
                onChange={async (checked) => {
                  await upsertMcp({ ...m, enabled: checked });
                  onChange();
                }}
              />
            ),
          },
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
                  title="删除该服务？"
                  onConfirm={async () => {
                    await deleteMcp(m.id);
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
        title={editing ? "编辑 MCP 服务" : "新增 MCP 服务"}
        open={open}
        onOk={onSave}
        onCancel={() => setOpen(false)}
        okText="保存"
        cancelText="取消"
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="服务名称" rules={[{ required: true }]}>
            <Input placeholder="如：aws-docs" />
          </Form.Item>
          <Form.Item name="transport" label="传输方式">
            <Select
              onChange={(v) => setTransport(v)}
              options={[
                { value: "stdio", label: "stdio (本地命令)" },
                { value: "sse", label: "SSE" },
                { value: "http", label: "HTTP" },
              ]}
            />
          </Form.Item>
          {transport === "stdio" ? (
            <>
              <Form.Item name="command" label="命令" rules={[{ required: true }]}>
                <Input placeholder="如：uvx" />
              </Form.Item>
              <Form.Item name="args" label="参数 (空格分隔)">
                <Input placeholder="如：awslabs.aws-documentation-mcp-server@latest" />
              </Form.Item>
            </>
          ) : (
            <Form.Item name="url" label="服务地址" rules={[{ required: true }]}>
              <Input placeholder="如：https://example.com/mcp" />
            </Form.Item>
          )}
          <Form.Item name="autoApprove" label="自动批准工具 (逗号分隔)">
            <Input placeholder="如：search,read" />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
