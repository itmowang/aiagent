import { Card, Spin } from "antd";
import { useAgentConfig } from "@/hooks/useAgentConfig";
import ModelPanel from "@/components/config/ModelPanel";

export default function ModelsPage() {
  const { config, loading, reload } = useAgentConfig();

  if (loading || !config) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin />
      </div>
    );
  }

  return (
    <Card title="模型配置">
      <ModelPanel models={config.models} onChange={reload} />
    </Card>
  );
}
