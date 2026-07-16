import { Layout, Menu, Avatar, Dropdown, Button } from "antd";
import {
  DashboardOutlined,
  TeamOutlined,
  MessageOutlined,
  SettingOutlined,
  LogoutOutlined,
  RobotOutlined,
  ProfileOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/store/AuthContext";

const { Sider, Header, Content } = Layout;

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const selectedKey = (() => {
    const p = location.pathname;
    if (p.startsWith("/admin/users")) return "/admin/users";
    if (p.startsWith("/admin/agent-memory")) return "/admin/agent-memory";
    if (p.startsWith("/admin/rag")) return "/admin/rag";
    if (p.startsWith("/admin/models")) return "/admin/models";
    if (p.startsWith("/admin/chat-defaults")) return "/admin/chat-defaults";
    return "/admin/dashboard";
  })();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider theme="dark" width={220}>
        <div
          style={{
            height: 60,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 20px",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          <RobotOutlined style={{ fontSize: 22, color: "#5b6cff" }} />
          AI Agent 后台
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={(e) => navigate(e.key)}
          items={[
            {
              key: "/admin/dashboard",
              icon: <DashboardOutlined />,
              label: "概览",
            },
            {
              type: "group",
              label: "Agent 配置",
              children: [
                {
                  key: "/admin/agent-memory",
                  icon: <ProfileOutlined />,
                  label: "默认 Memory",
                },
                {
                  key: "/admin/rag",
                  icon: <DatabaseOutlined />,
                  label: "RAG 知识库",
                },
                {
                  key: "/admin/models",
                  icon: <ThunderboltOutlined />,
                  label: "模型配置",
                },
                {
                  key: "/admin/chat-defaults",
                  icon: <SettingOutlined />,
                  label: "对话默认设置",
                },
              ],
            },
            {
              type: "group",
              label: "系统",
              children: [
                {
                  key: "/admin/users",
                  icon: <TeamOutlined />,
                  label: "用户管理",
                },
              ],
            },
          ]}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 16,
            paddingRight: 24,
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Button
            icon={<MessageOutlined />}
            onClick={() => navigate("/chat")}
          >
            进入对话
          </Button>
          <Dropdown
            menu={{
              items: [
                {
                  key: "logout",
                  icon: <LogoutOutlined />,
                  label: "退出登录",
                  onClick: () => {
                    logout();
                    navigate("/login");
                  },
                },
              ],
            }}
          >
            <div style={{ cursor: "pointer", display: "flex", gap: 8, alignItems: "center" }}>
              <Avatar style={{ background: "#5b6cff" }}>
                {user?.displayName?.[0] ?? "U"}
              </Avatar>
              <span>{user?.displayName}</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
