import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Select,
  Switch,
  App as AntApp,
  Spin,
} from "antd";
import { getChatDefaults, saveChatDefaults } from "@/api/config";
import { useAgentConfig } from "@/hooks/useAgentConfig";
import type { ChatDefaults } from "@/api/types";

export default function ChatDefaultsPage() {
  const { config, loading } = useAgentConfig();
  const [form] = Form.useForm();
  const [ready, setReady] = useState(false);
  const { message } = AntApp.useApp();

  useEffect(() => {
    (async () => {
      const d = await getChatDefaults();
      form.setFieldsValue(d);
      setReady(true);
    })();
  }, []);

  const onSave = async () => {
    const v = (await form.validateFields()) as ChatDefaults;
    await saveChatDefaults(v);
    message.success("默认设置已保存");
  };

  if (loading || !config || !ready) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin />
      </div>
    );
  }

  return (
    <Card title="对话默认设置" style={{ maxWidth: 720 }}>
      <p style={{ color: "#999", marginTop: 0 }}>
        新建对话时默认继承以下 Agent 配置。
      </p>
      <Form form={form} layout="vertical">
        <Form.Item name="modelId" label="默认模型" rules={[{ required: true }]}>
          <Select
            options={config.models.map((m) => ({
              value: m.id,
              label: `${m.name} (${m.model})`,
            }))}
          />
        </Form.Item>
        <Form.Item name="systemPrompt" label="系统提示词">
          <Input.TextArea rows={4} placeholder="定义助手的默认角色与语气" />
        </Form.Item>
        <Form.Item name="enableMemory" label="启用长期记忆" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="enableRag" label="启用 RAG 检索" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item>
          <Button type="primary" onClick={onSave}>
            保存设置
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
