import { useCallback, useEffect, useState } from "react";
import {
  Card,
  Table,
  Tag,
  Switch,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Alert,
  Popconfirm,
  App as AntApp,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import {
  listSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  type SkillItem,
} from "@/api/skill";

export default function SkillsPage() {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SkillItem | null>(null);
  const [form] = Form.useForm();
  const { message } = AntApp.useApp();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setSkills(await listSkills());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const openModal = (s?: SkillItem) => {
    setEditing(s ?? null);
    form.setFieldsValue(
      s ?? { name: "", description: "", systemPrompt: "" }
    );
    setOpen(true);
  };

  const onSave = async () => {
    const v = await form.validateFields();
    try {
      if (editing) {
        await updateSkill(editing.key, {
          systemPrompt: v.systemPrompt,
          name: editing.builtin ? undefined : v.name,
          description: editing.builtin ? undefined : v.description,
        });
      } else {
        await createSkill(v);
      }
      message.success("已保存");
      setOpen(false);
      reload();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const toggle = async (s: SkillItem, enabled: boolean) => {
    await updateSkill(s.key, { enabled });
    message.success(enabled ? "已启用" : "已停用");
    reload();
  };

  return (
    <Card
      title="技能配置"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          新增自定义技能
        </Button>
      }
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="启用的技能会作为“可激活能力”提供给 Agent，由模型在对话中通过 use_skill 自主激活。内置技能不可删除，可停用或改提示词。"
      />
      <Table<SkillItem>
        rowKey="key"
        loading={loading}
        dataSource={skills}
        pagination={false}
        columns={[
          {
            title: "技能",
            dataIndex: "name",
            render: (v, s) => (
              <Space>
                {v}
                {s.builtin ? <Tag color="geekblue">内置</Tag> : <Tag>自定义</Tag>}
                {s.hasOwnTools && <Tag color="orange">自带工具</Tag>}
              </Space>
            ),
          },
          { title: "说明", dataIndex: "description" },
          {
            title: "key",
            dataIndex: "key",
            width: 160,
            render: (v) => <code style={{ fontSize: 12 }}>{v}</code>,
          },
          {
            title: "启用",
            dataIndex: "enabled",
            width: 80,
            render: (v: boolean, s) => (
              <Switch size="small" checked={v} onChange={(c) => toggle(s, c)} />
            ),
          },
          {
            title: "操作",
            width: 120,
            render: (_, s) => (
              <Space>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => openModal(s)}
                />
                {!s.builtin && (
                  <Popconfirm
                    title="删除该技能？"
                    onConfirm={async () => {
                      await deleteSkill(s.key);
                      message.success("已删除");
                      reload();
                    }}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? `编辑技能：${editing.name}` : "新增自定义技能"}
        open={open}
        onOk={onSave}
        onCancel={() => setOpen(false)}
        okText="保存"
        cancelText="取消"
        width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="技能名称"
            rules={[{ required: true }]}
          >
            <Input placeholder="如：合同审查" disabled={!!editing?.builtin} />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input
              placeholder="一句话描述，模型据此判断何时激活"
              disabled={!!editing?.builtin}
            />
          </Form.Item>
          <Form.Item
            name="systemPrompt"
            label="技能提示词（激活后注入）"
            rules={[{ required: true }]}
          >
            <Input.TextArea
              rows={8}
              placeholder="定义该技能的行为、步骤、使用哪些工具"
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
