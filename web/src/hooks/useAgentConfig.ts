import { useCallback, useEffect, useState } from "react";
import { getAgentConfig } from "@/api/config";
import type { AgentConfigBundle } from "@/api/types";

export function useAgentConfig() {
  const [config, setConfig] = useState<AgentConfigBundle | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setConfig(await getAgentConfig());
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { config, loading, reload };
}
