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
  Tooltip,
  App as AntApp,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ApiOutlined,
} from "@ant-design/icons";
import {
  upsertMcpServer,
  deleteMcpServer,
  testMcpServer,
} from "@/api/mcp";
import type { McpServerConfig, McpTransport } from "@/api/types";

interface Props {
  servers: McpServerConfig[];
  onChange: () => void;
}

export default function McpPanel({ servers, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<McpServerConfig | null>(null);
  const [transport, setTransport] = useState<McpTransport>("stdio");
  const [testingId, setTestingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const { message, modal } = AntApp.useApp();

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
    await upsertMcpServer({
      id: editing?.id,
      name: v.name,
      transport: v.transport,
      command: v.command,
      url: v.url,
      enabled: v.enabled,
      args: v.args ? String(v.args).split(/\s+/).filter(Boolean) : [],
      autoApprove: v.autoApprove
        ? String(v.autoApprove)
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [],
    });
    message.success("已保存");
    setOpen(false);
    onChange();
  };

  const onTest = async (m: McpServerConfig) => {
    setTestingId(m.id);
    try {
      const res = await testMcpServer(m.id);
      if (res.ok) {
        modal.success({
          title: `连接成功：${m.name}`,
          content: (
            <div>
              共 {res.tools?.length ?? 0} 个工具：
              <div style={{ marginTop: 8 }}>
                {res.tools?.map((t) => (
                  <Tag key={t.name} style={{ marginBottom: 4 }}>
                    {t.name}
                  </Tag>
                ))}
              </div>
            </div>
          ),
        });
      } else {
        modal.error({ title: "连接失败", content: res.error });
      }
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setTestingId(null);
    }
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
            width: 80,
            render: (v: boolean, m) => (
              <Switch
                size="small"
                checked={v}
                onChange={async (checked) => {
                  await upsertMcpServer({ ...m, enabled: checked });
                  onChange();
                }}
              />
            ),
          },
          {
            title: "操作",
            width: 180,
            render: (_, m) => (
              <Space>
                <Tooltip title="测试连接并列出工具">
                  <Button
                    size="small"
                    icon={<ApiOutlined />}
                    loading={testingId === m.id}
                    onClick={() => onTest(m)}
                  />
                </Tooltip>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => openModal(m)}
                />
                <Popconfirm
                  title="删除该服务？"
                  onConfirm={async () => {
                    await deleteMcpServer(m.id);
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
            <Input placeholder="如：everything（作为工具名前缀，需唯一）" />
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
                <Input placeholder="Windows 建议填 cmd" />
              </Form.Item>
              <Form.Item name="args" label="参数 (空格分隔)">
                <Input placeholder="如：/c npx -y @modelcontextprotocol/server-everything" />
              </Form.Item>
            </>
          ) : (
            <Form.Item name="url" label="服务地址" rules={[{ required: true }]}>
              <Input placeholder="如：https://example.com/mcp" />
            </Form.Item>
          )}
          <Form.Item name="autoApprove" label="自动批准工具 (逗号分隔)">
            <Input placeholder="留空则全部需确认（预留）" />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
