import { Card, Spin } from "antd";
import { useAgentConfig } from "@/hooks/useAgentConfig";
import McpPanel from "@/components/config/McpPanel";

export default function McpPage() {
  const { config, loading, reload } = useAgentConfig();

  if (loading || !config) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin />
      </div>
    );
  }

  return (
    <Card title="MCP 配置">
      <McpPanel servers={config.mcpServers} onChange={reload} />
    </Card>
  );
}
