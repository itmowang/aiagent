import { Card, Spin, Alert } from "antd";
import { useAgentConfig } from "@/hooks/useAgentConfig";
import MemoryPanel from "@/components/config/MemoryPanel";

export default function AgentMemoryPage() {
  const { config, loading, reload } = useAgentConfig();

  if (loading || !config) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin />
      </div>
    );
  }

  return (
    <Card title="Agent 默认 Memory">
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="这里维护 Agent 的默认长期记忆，对所有对话生效。用户的个人记忆在「用户管理」中单独维护。"
      />
      <MemoryPanel
        scope={{ kind: "agent" }}
        memories={config.memories}
        onChange={reload}
      />
    </Card>
  );
}
