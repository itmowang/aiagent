import { useEffect, useState } from "react";
import { Card, Col, Row, Statistic, Table, Tag } from "antd";
import {
  TeamOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  ProfileOutlined,
} from "@ant-design/icons";
import { listUsers } from "@/api/users";
import { useAgentConfig } from "@/hooks/useAgentConfig";
import type { User } from "@/api/types";

export default function DashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const { config } = useAgentConfig();

  useEffect(() => {
    listUsers().then(setUsers);
  }, []);

  return (
    <div>
      <Row gutter={16}>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic title="用户总数" value={users.length} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="Agent 记忆"
              value={config?.memories.length ?? 0}
              prefix={<ProfileOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="模型"
              value={config?.models.length ?? 0}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="RAG 文档"
              value={config?.ragDocs.length ?? 0}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="最近用户" style={{ marginTop: 16 }}>
        <Table<User>
          rowKey="id"
          pagination={false}
          dataSource={users.slice(0, 8)}
          columns={[
            { title: "用户名", dataIndex: "username" },
            { title: "昵称", dataIndex: "displayName" },
            {
              title: "角色",
              dataIndex: "role",
              render: (r: string) =>
                r === "admin" ? (
                  <Tag color="purple">管理员</Tag>
                ) : (
                  <Tag>普通用户</Tag>
                ),
            },
            {
              title: "状态",
              dataIndex: "status",
              render: (s: string) =>
                s === "active" ? (
                  <Tag color="green">正常</Tag>
                ) : (
                  <Tag color="red">禁用</Tag>
                ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
