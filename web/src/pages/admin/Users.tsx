import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  App as AntApp,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  ProfileOutlined,
  KeyOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  createUser,
  deleteUser,
  listUsers,
  resetPassword,
  updateUser,
} from "@/api/users";
import type { User } from "@/api/types";
import { useAuth } from "@/store/AuthContext";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [pwdUser, setPwdUser] = useState<User | null>(null);
  const [createForm] = Form.useForm();
  const [pwdForm] = Form.useForm();
  const navigate = useNavigate();
  const { user: current } = useAuth();
  const { message } = AntApp.useApp();

  const load = async () => {
    setLoading(true);
    setUsers(await listUsers());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async () => {
    const values = await createForm.validateFields();
    try {
      await createUser(values);
      message.success("用户已创建");
      setCreateOpen(false);
      createForm.resetFields();
      load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const onResetPwd = async () => {
    const values = await pwdForm.validateFields();
    if (pwdUser) {
      await resetPassword(pwdUser.id, values.password);
      message.success("密码已重置");
      setPwdUser(null);
      pwdForm.resetFields();
    }
  };

  const toggleStatus = async (u: User) => {
    await updateUser(u.id, {
      status: u.status === "active" ? "disabled" : "active",
    });
    load();
  };

  return (
    <Card
      title="用户管理"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateOpen(true)}
        >
          新建用户
        </Button>
      }
    >
      <Table<User>
        rowKey="id"
        loading={loading}
        dataSource={users}
        columns={[
          { title: "用户名", dataIndex: "username" },
          { title: "昵称", dataIndex: "displayName" },
          { title: "邮箱", dataIndex: "email", render: (v) => v || "-" },
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
          {
            title: "操作",
            key: "action",
            width: 320,
            render: (_, u) => (
              <Space>
                <Button
                  size="small"
                  icon={<ProfileOutlined />}
                  onClick={() => navigate(`/admin/users/${u.id}`)}
                >
                  个人记忆
                </Button>
                <Button
                  size="small"
                  icon={<KeyOutlined />}
                  onClick={() => setPwdUser(u)}
                >
                  重置密码
                </Button>
                <Button size="small" onClick={() => toggleStatus(u)}>
                  {u.status === "active" ? "禁用" : "启用"}
                </Button>
                <Popconfirm
                  title="确认删除该用户？"
                  disabled={u.id === current?.id}
                  onConfirm={async () => {
                    await deleteUser(u.id);
                    message.success("已删除");
                    load();
                  }}
                >
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    disabled={u.id === current?.id}
                  >
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title="新建用户"
        open={createOpen}
        onOk={onCreate}
        onCancel={() => setCreateOpen(false)}
        okText="创建"
        cancelText="取消"
      >
        <Form form={createForm} layout="vertical" initialValues={{ role: "user" }}>
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input placeholder="登录用户名" />
          </Form.Item>
          <Form.Item
            name="displayName"
            label="昵称"
            rules={[{ required: true, message: "请输入昵称" }]}
          >
            <Input placeholder="显示名称" />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item
            name="password"
            label="初始密码"
            rules={[{ required: true, message: "请输入初始密码" }]}
          >
            <Input.Password placeholder="初始密码" />
          </Form.Item>
          <Form.Item name="role" label="角色">
            <Select
              options={[
                { value: "user", label: "普通用户" },
                { value: "admin", label: "管理员" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`重置密码 - ${pwdUser?.username ?? ""}`}
        open={!!pwdUser}
        onOk={onResetPwd}
        onCancel={() => setPwdUser(null)}
        okText="确认"
        cancelText="取消"
      >
        <Form form={pwdForm} layout="vertical">
          <Form.Item
            name="password"
            label="新密码"
            rules={[{ required: true, message: "请输入新密码" }]}
          >
            <Input.Password placeholder="新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
