import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Form, Input, App as AntApp } from "antd";
import { LockOutlined, RobotOutlined, UserOutlined } from "@ant-design/icons";
import { useAuth } from "@/store/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { message } = AntApp.useApp();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success("登录成功");
      navigate("/chat");
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <RobotOutlined style={{ fontSize: 40, color: "#5b6cff" }} />
          <h1>AI Agent 控制台</h1>
          <p>登录以开始对话与管理</p>
        </div>
        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item
            name="username"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>
        <p style={{ textAlign: "center", color: "#9a9ab0", fontSize: 12 }}>
          默认管理员账号 admin / admin123
        </p>
      </div>
    </div>
  );
}
