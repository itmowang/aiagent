import { Card, Spin } from "antd";
import { useAgentConfig } from "@/hooks/useAgentConfig";
import RagPanel from "@/components/config/RagPanel";

export default function RagPage() {
  const { config, loading, reload } = useAgentConfig();

  if (loading || !config) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin />
      </div>
    );
  }

  return (
    <Card title="RAG 知识库">
      <RagPanel docs={config.ragDocs} onChange={reload} />
    </Card>
  );
}
