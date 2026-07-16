import { useCallback, useEffect, useState } from "react";
import { Card, Spin, Alert } from "antd";
import McpPanel from "@/components/config/McpPanel";
import { listMcpServers } from "@/api/mcp";
import type { McpServerConfig } from "@/api/types";

export default function McpPage() {
  const [servers, setServers] = useState<McpServerConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setServers(await listMcpServers());
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin />
      </div>
    );
  }

  return (
    <Card title="MCP 配置">
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="启用的 MCP 服务，其工具会在对话时注册进 Agent，供模型调用。Windows 上 stdio 建议用 cmd /c 启动 npx。"
      />
      <McpPanel servers={servers} onChange={reload} />
    </Card>
  );
}
