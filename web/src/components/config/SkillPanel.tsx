import { useState } from "react";
import {
  Button,
  Form,
  Input,
  Modal,
  Space,
  Switch,
  Table,
  App as AntApp,
  Popconfirm,
} from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { deleteSkill, upsertSkill } from "@/api/config";
import type { SkillConfig } from "@/api/types";

interface Props {
  skills: SkillConfig[];
  onChange: () => void;
}

export default function SkillPanel({ skills, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SkillConfig | null>(null);
  const [form] = Form.useForm();
  const { message } = AntApp.useApp();

  const openModal = (skill?: SkillConfig) => {
    setEditing(skill ?? null);
    form.setFieldsValue(
      skill ?? { name: "", description: "", prompt: "", enabled: true }
    );
    setOpen(true);
  };

  const onSave = async () => {
    const v = await form.validateFields();
    await upsertSkill({ ...editing, ...v });
    message.success("已保存");
    setOpen(false);
    onChange();
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          新增技能
        </Button>
      </Space>

      <Table<SkillConfig>
        rowKey="id"
        dataSource={skills}
        pagination={false}
        columns={[
          { title: "名称", dataIndex: "name", width: 180 },
          { title: "描述", dataIndex: "description" },
          {
            title: "状态",
            dataIndex: "enabled",
            width: 100,
            render: (v: boolean, s) => (
              <Switch
                checked={v}
                size="small"
                onChange={async (checked) => {
                  await upsertSkill({ ...s, enabled: checked });
                  onChange();
                }}
              />
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
                <Popconfirm
                  title="删除该技能？"
                  onConfirm={async () => {
                    await deleteSkill(s.id);
                    onChange();
                  }}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? "编辑技能" : "新增技能"}
        open={open}
        onOk={onSave}
        onCancel={() => setOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="技能名称" rules={[{ required: true }]}>
            <Input placeholder="如：知识库检索" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="技能用途说明" />
          </Form.Item>
          <Form.Item name="prompt" label="触发提示词 (可选)">
            <Input.TextArea rows={3} placeholder="调用该技能时附加的指令" />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
