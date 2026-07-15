import { Card, Spin } from "antd";
import { useAgentConfig } from "@/hooks/useAgentConfig";
import SkillPanel from "@/components/config/SkillPanel";

export default function SkillsPage() {
  const { config, loading, reload } = useAgentConfig();

  if (loading || !config) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin />
      </div>
    );
  }

  return (
    <Card title="技能配置">
      <SkillPanel skills={config.skills} onChange={reload} />
    </Card>
  );
}
