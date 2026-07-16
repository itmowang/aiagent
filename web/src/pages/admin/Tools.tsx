import { useCallback, useEffect, useState } from "react";
import { Card, Table, Tag, Button, Alert, App as AntApp } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { listTools, type ToolInfo } from "@/api/tools";

export default function ToolsPage() {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { message } = AntApp.useApp();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setTools(await listTools());
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    reload();
  }, [reload]);

  const builtin = tools.filter((t) => t.source === "builtin").length;
  const mcp = tools.length - builtin;

  return (
    <Card
      title={`Agent 可用工具（共 ${tools.length} 个：内置 ${builtin} · MCP ${mcp}）`}
      extra={
        <Button icon={<ReloadOutlined />} onClick={reload} loading={loading}>
          刷新
        </Button>
      }
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="这是对话时真正注册进 Agent 的工具清单：内置知识库工具 + 所有启用的 MCP 服务的工具。刷新会实时连接 MCP 服务重新拉取。"
      />
      <Table<ToolInfo>
        rowKey="name"
        loading={loading}
        dataSource={tools}
        pagination={false}
        columns={[
          {
            title: "工具名",
            dataIndex: "name",
            width: 320,
            render: (v) => <code>{v}</code>,
          },
          {
            title: "来源",
            dataIndex: "source",
            width: 140,
            render: (s: string) =>
              s === "builtin" ? (
                <Tag color="green">内置</Tag>
              ) : (
                <Tag color="blue">MCP · {s}</Tag>
              ),
          },
          { title: "描述", dataIndex: "description", render: (v) => v || "-" },
        ]}
      />
    </Card>
  );
}
