import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Breadcrumb, Card, Spin, Tag, Alert } from "antd";
import { getUserMemory } from "@/api/config";
import { listUsers } from "@/api/users";
import type { MemoryItem, User } from "@/api/types";
import MemoryPanel from "@/components/config/MemoryPanel";

export default function UserDetailPage() {
  const { userId = "" } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [users, mem] = await Promise.all([
      listUsers(),
      getUserMemory(userId),
    ]);
    setUser(users.find((u) => u.id === userId) ?? null);
    setMemories(mem);
    setLoading(false);
  }, [userId]);

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
    <div>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <a onClick={() => navigate("/admin/users")}>用户管理</a> },
          { title: user?.displayName ?? userId },
        ]}
      />
      <Card
        title={
          <span>
            {user?.displayName}{" "}
            <Tag color={user?.role === "admin" ? "purple" : "default"}>
              {user?.role === "admin" ? "管理员" : "普通用户"}
            </Tag>
            <span style={{ color: "#999", fontWeight: 400, fontSize: 13 }}>
              @{user?.username} 的个人记忆
            </span>
          </span>
        }
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="用户仅有个人 Memory 可供管理与清空，Agent 的技能 / RAG / 模型 / MCP 为全局配置。"
        />
        <MemoryPanel
          scope={{ kind: "user", userId }}
          memories={memories}
          onChange={reload}
        />
      </Card>
    </div>
  );
}
