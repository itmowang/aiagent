import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Input,
  Avatar,
  Dropdown,
  Drawer,
  Select,
  App as AntApp,
} from "antd";
import {
  PlusOutlined,
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  DashboardOutlined,
  LogoutOutlined,
  DeleteOutlined,
  ProfileOutlined,
  DownOutlined,
  ThunderboltFilled,
} from "@ant-design/icons";
import { useAuth } from "@/store/AuthContext";
import { getUserMemory } from "@/api/config";
import {
  listConversations,
  getConversation,
  deleteConversation,
  sendChat,
  type ConversationSummary,
  type AgentStep,
} from "@/api/chat";
import { http } from "@/api/http";
import type { ChatMessage, MemoryItem, ModelConfig } from "@/api/types";
import MemoryPanel from "@/components/config/MemoryPanel";
import ChatSteps from "@/components/ChatSteps";

// 消息附带可选的执行轨迹
type ChatMessageWithSteps = ChatMessage & { steps?: AgentStep[] };

const SUGGESTIONS = [
  "帮我总结一下这份产品文档",
  "根据知识库回答我的问题",
  "记住我喜欢用中文交流",
  "写一段 TypeScript 示例代码",
];

export default function ChatPage() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const userId = user!.id;
  const { message } = AntApp.useApp();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageWithSteps[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [modelId, setModelId] = useState<string | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMemory = useCallback(async () => {
    setMemories(await getUserMemory(userId));
  }, [userId]);

  const loadConversations = useCallback(async () => {
    setConversations(await listConversations());
  }, []);

  useEffect(() => {
    (async () => {
      await loadConversations();
      loadMemory();
      try {
        const ms = await http.get<ModelConfig[]>("/api/models");
        setModels(ms);
        const def = ms.find((m) => m.isDefault) ?? ms[0];
        setModelId(def?.id);
      } catch {
        // 模型列表加载失败不阻塞聊天
      }
    })();
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, messages, sending]);

  const openConversation = async (id: string) => {
    setActiveId(id);
    const detail = await getConversation(id);
    setMessages(detail.messages);
    if (detail.modelId) setModelId(detail.modelId);
  };

  const newSession = () => {
    setActiveId(null);
    setMessages([]);
  };

  const removeConversation = async (id: string) => {
    await deleteConversation(id);
    if (activeId === id) newSession();
    loadConversations();
  };

  const doSend = async (text: string) => {
    text = text.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await sendChat({
        message: text,
        conversationId: activeId ?? undefined,
        modelId,
      });
      const reply: ChatMessageWithSteps = {
        id: `reply-${Date.now()}`,
        role: "assistant",
        content: res.reply,
        createdAt: Date.now(),
        steps: res.steps,
      };
      setMessages((prev) => [...prev, reply]);
      if (!activeId) setActiveId(res.conversationId);
      if (res.modelId) setModelId(res.modelId);
      loadConversations();
      // 对话中可能抽取了新的长期记忆，刷新一下
      loadMemory();
    } catch (e) {
      message.error((e as Error).message);
      // 回滚刚插入的用户消息
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const activeTitle =
    conversations.find((c) => c.id === activeId)?.title ?? "新对话";
  const currentModel = models.find((m) => m.id === modelId);

  return (
    <div className="chat-shell">
      <div className="chat-sidebar">
        <div className="chat-brand">
          <RobotOutlined style={{ fontSize: 20, color: "#8f7cff" }} />
          AI Agent
        </div>
        <div style={{ padding: 16 }}>
          <Button type="primary" block icon={<PlusOutlined />} onClick={newSession}>
            新建对话
          </Button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {conversations.length === 0 && (
            <div style={{ color: "#6a6a80", textAlign: "center", marginTop: 40, fontSize: 13 }}>
              暂无对话
            </div>
          )}
          {conversations.map((s) => (
            <div
              key={s.id}
              className={`session-item ${s.id === activeId ? "active" : ""}`}
              onClick={() => openConversation(s.id)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  {s.title}
                </span>
                <DeleteOutlined
                  onClick={(e) => {
                    e.stopPropagation();
                    removeConversation(s.id);
                  }}
                  style={{ opacity: 0.5 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-main">
        <div className="chat-header">
          <span className="chat-header-title">{activeTitle}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {models.length > 0 ? (
              <Select
                size="small"
                value={modelId}
                onChange={setModelId}
                style={{ minWidth: 180 }}
                suffixIcon={<ThunderboltFilled />}
                options={models.map((m) => ({
                  value: m.id,
                  label: `${m.name}${m.isDefault ? " · 默认" : ""}`,
                }))}
              />
            ) : (
              <span className="model-pill">
                <ThunderboltFilled /> {currentModel?.name ?? "默认模型"}
              </span>
            )}
            <Dropdown
              placement="bottomRight"
              menu={{
                items: [
                  {
                    key: "memory",
                    icon: <ProfileOutlined />,
                    label: "我的记忆",
                    onClick: () => setMemoryOpen(true),
                  },
                  ...(isAdmin
                    ? [
                        {
                          key: "admin",
                          icon: <DashboardOutlined />,
                          label: "进入后台",
                          onClick: () => navigate("/admin"),
                        },
                      ]
                    : []),
                  { type: "divider" as const },
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
              <div className="header-user">
                <Avatar size={30} style={{ background: "#5b6cff" }}>
                  {user?.displayName?.[0]}
                </Avatar>
                <span className="name">{user?.displayName}</span>
                <DownOutlined style={{ fontSize: 10, color: "#9a9ab0" }} />
              </div>
            </Dropdown>
          </div>
        </div>

        {messages.length === 0 && !sending ? (
          <div className="chat-empty">
            <div className="empty-icon">
              <RobotOutlined />
            </div>
            <p style={{ fontSize: 16, color: "#55556a", margin: 0 }}>
              有什么可以帮你的吗？
            </p>
            <div className="chat-suggestions">
              {SUGGESTIONS.map((s) => (
                <div
                  key={s}
                  className="suggestion-chip"
                  onClick={() => doSend(s)}
                >
                  {s}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="chat-messages">
            <div className="chat-messages-inner">
              {messages.map((m) => (
                <div key={m.id} className={`chat-row ${m.role}`}>
                  <div className={`chat-avatar ${m.role}`}>
                    {m.role === "user" ? <UserOutlined /> : <RobotOutlined />}
                  </div>
                  <div className="chat-col">
                    <div className="chat-sender">
                      {m.role === "user" ? user?.displayName : "AI Agent"}
                    </div>
                    <div className={`chat-bubble ${m.role}`}>{m.content}</div>
                    {m.role === "assistant" && m.steps && m.steps.length > 0 && (
                      <ChatSteps steps={m.steps} />
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="chat-row assistant">
                  <div className="chat-avatar assistant">
                    <RobotOutlined />
                  </div>
                  <div className="chat-col">
                    <div className="chat-sender">AI Agent</div>
                    <div className="chat-bubble assistant">
                      <span className="typing-dots">
                        <span />
                        <span />
                        <span />
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        )}

        <div className="chat-input-bar">
          <div className="chat-input-inner">
            <div className="chat-input-box">
              <Input.TextArea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="给 AI Agent 发送消息…"
                autoSize={{ minRows: 1, maxRows: 6 }}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    doSend(input);
                  }
                }}
              />
              <Button
                type="primary"
                shape="circle"
                icon={<SendOutlined />}
                loading={sending}
                disabled={!input.trim()}
                onClick={() => doSend(input)}
              />
            </div>
            <div className="chat-input-hint">
              Enter 发送，Shift + Enter 换行
            </div>
          </div>
        </div>
      </div>

      <Drawer
        title="我的记忆"
        open={memoryOpen}
        onClose={() => setMemoryOpen(false)}
        width={560}
      >
        <p style={{ color: "#999", marginTop: 0 }}>
          这里是你的个人长期记忆，可添加、删除或清空。
        </p>
        <MemoryPanel
          scope={{ kind: "user", userId }}
          memories={memories}
          onChange={loadMemory}
        />
      </Drawer>
    </div>
  );
}
