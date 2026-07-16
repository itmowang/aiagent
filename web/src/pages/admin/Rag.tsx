import { useCallback, useEffect, useState } from "react";
import { Card, Spin } from "antd";
import RagPanel from "@/components/config/RagPanel";
import { listRagDocs } from "@/api/rag";
import type { RagDocument } from "@/api/types";

export default function RagPage() {
  const [docs, setDocs] = useState<RagDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setDocs(await listRagDocs());
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
    <Card title="RAG 知识库">
      <RagPanel docs={docs} onChange={reload} />
    </Card>
  );
}
