import { Collapse, Timeline, Tag } from "antd";
import {
  BulbOutlined,
  PushpinOutlined,
  QuestionCircleOutlined,
  MessageOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FlagOutlined,
  AimOutlined,
} from "@ant-design/icons";
import type { AgentStep } from "@/api/chat";

function fmtTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString("zh-CN", { hour12: false });
}

function renderStep(step: AgentStep) {
  switch (step.type) {
    case "memory_extracted":
      return {
        color: "purple",
        dot: <BulbOutlined />,
        title: `抽取长期记忆 ${step.items.length} 条`,
        detail: step.items.map((i) => `${i.key} = ${i.value}`).join("；"),
      };
    case "memory_injected":
      return {
        color: "blue",
        dot: <PushpinOutlined />,
        title: `注入${step.scope === "agent" ? " Agent 全局" : "用户"}记忆 ${step.count} 条`,
        detail: "",
      };
    case "llm_request":
      return {
        color: "gray",
        dot: <QuestionCircleOutlined />,
        title: `第 ${step.round} 轮思考 · 可用工具 ${step.tools.length} 个`,
        detail: step.tools.length > 0 ? step.tools.join("、") : "（无工具）",
      };
    case "llm_response":
      return {
        color: step.hasToolCalls ? "orange" : "green",
        dot: <MessageOutlined />,
        title: step.hasToolCalls
          ? `模型决定调用工具（第 ${step.round} 轮）`
          : `模型生成回答（第 ${step.round} 轮）`,
        detail: step.content?.slice(0, 200) ?? "",
      };
    case "tool_call":
      return {
        color: "orange",
        dot: <ToolOutlined />,
        title: `调用工具 ${step.name}`,
        detail: `参数：${step.arguments}`,
      };
    case "tool_result":
      return {
        color: step.ok ? "green" : "red",
        dot: step.ok ? <CheckCircleOutlined /> : <CloseCircleOutlined />,
        title: `工具 ${step.name} ${step.ok ? "返回" : "失败"}`,
        detail: step.preview,
      };
    case "skill_activated":
      return {
        color: "purple",
        dot: <AimOutlined />,
        title: `激活技能：${step.name}`,
        detail: step.tools.length > 0 ? `新增工具：${step.tools.join("、")}` : "",
      };
    case "final":
      return {
        color: "green",
        dot: <FlagOutlined />,
        title: "最终回答",
        detail: "",
      };
    default:
      return { color: "gray", dot: null, title: "步骤", detail: "" };
  }
}

export default function ChatSteps({ steps }: { steps: AgentStep[] }) {
  if (!steps || steps.length === 0) return null;

  const toolCalls = steps.filter((s) => s.type === "tool_call").length;

  return (
    <Collapse
      ghost
      size="small"
      style={{ marginTop: 8 }}
      items={[
        {
          key: "trace",
          label: (
            <span style={{ fontSize: 12, color: "#888" }}>
              执行轨迹 · {steps.length} 步
              {toolCalls > 0 && (
                <Tag color="orange" style={{ marginLeft: 8 }}>
                  {toolCalls} 次工具调用
                </Tag>
              )}
            </span>
          ),
          children: (
            <Timeline
              style={{ marginTop: 8 }}
              items={steps.map((s) => {
                const r = renderStep(s);
                return {
                  color: r.color,
                  dot: r.dot,
                  children: (
                    <div>
                      <div style={{ fontSize: 13 }}>
                        {r.title}
                        <span style={{ color: "#bbb", marginLeft: 8, fontSize: 11 }}>
                          {fmtTime(s.ts)}
                        </span>
                      </div>
                      {r.detail && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#888",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                            marginTop: 2,
                          }}
                        >
                          {r.detail}
                        </div>
                      )}
                    </div>
                  ),
                };
              })}
            />
          ),
        },
      ]}
    />
  );
}
