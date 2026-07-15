import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Avatar, Dropdown, Drawer, App as AntApp } from "antd";
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
import { read, write, uid } from "@/api/db";
import { getAgentConfig, getChatDefaults, getUserMemory } from "@/api/config";
import type {
  AgentConfigBundle,
  ChatDefaults,
  ChatMessage,
  MemoryItem,
} from "@/api/types";
import MemoryPanel from "@/components/config/MemoryPanel";

interface Session {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

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
  const storeKey = `sessions:${userId}`;

  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [config, setConfig] = useState<AgentConfigBundle | null>(null);
  const [defaults, setDefaults] = useState<ChatDefaults | null>(null);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMemory = useCallback(async () => {
    setMemories(await getUserMemory(userId));
  }, [userId]);

  useEffect(() => {
    setSessions(read<Session[]>(storeKey, []));
    (async () => {
      setConfig(await getAgentConfig());
      setDefaults(await getChatDefaults());
      loadMemory();
    })();
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, sessions, sending]);

  const persist = (next: Session[]) => {
    setSessions(next);
    write(storeKey, next);
  };

  const active = sessions.find((s) => s.id === activeId) ?? null;

  const newSession = () => {
    const s: Session = {
      id: uid(),
      title: "新对话",
      messages: [],
      createdAt: Date.now(),
    };
    persist([s, ...sessions]);
    setActiveId(s.id);
  };

  const deleteSession = (id: string) => {
    const next = sessions.filter((s) => s.id !== id);
    persist(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
  };

  const doSend = (text: string) => {
    text = text.trim();
    if (!text || sending) return;
    let target = active;
    let list = sessions;
    if (!target) {
      target = {
        id: uid(),
        title: text.slice(0, 20),
        messages: [],
        createdAt: Date.now(),
      };
      list = [target, ...sessions];
      setActiveId(target.id);
    }

    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    setInput("");
    setSending(true);

    // 占位回复：真实调用后端 agent.run 的逻辑将后续接入
    const reply: ChatMessage = {
      id: uid(),
      role: "assistant",
      content:
        "（占位回复）后端对话逻辑将在下一步接入 —— 会调用单 Agent 的 run，结合默认设置：Agent 记忆、用户个人记忆、RAG、技能与所选模型。",
      createdAt: Date.now() + 1,
    };

    const updated = list.map((s) =>
      s.id === target!.id
        ? {
            ...s,
            title: s.messages.length === 0 ? text.slice(0, 20) : s.title,
            messages: [...s.messages, userMsg],
          }
        : s
    );
    persist(updated);

    setTimeout(() => {
      const withReply = read<Session[]>(storeKey, updated).map((s) =>
        s.id === target!.id ? { ...s, messages: [...s.messages, reply] } : s
      );
      persist(withReply);
      setSending(false);
    }, 800);
  };

  const currentModel = config?.models.find((m) => m.id === defaults?.modelId);

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
          {sessions.length === 0 && (
            <div style={{ color: "#6a6a80", textAlign: "center", marginTop: 40, fontSize: 13 }}>
              暂无对话
            </div>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`session-item ${s.id === activeId ? "active" : ""}`}
              onClick={() => setActiveId(s.id)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  {s.title}
                </span>
                <DeleteOutlined
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(s.id);
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
          <span className="chat-header-title">{active?.title ?? "新对话"}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span className="model-pill">
              <ThunderboltFilled /> {currentModel?.name ?? "默认模型"}
            </span>
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

        {!active || active.messages.length === 0 ? (
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
              {active.messages.map((m) => (
                <div key={m.id} className={`chat-row ${m.role}`}>
                  <div className={`chat-avatar ${m.role}`}>
                    {m.role === "user" ? <UserOutlined /> : <RobotOutlined />}
                  </div>
                  <div className="chat-col">
                    <div className="chat-sender">
                      {m.role === "user" ? user?.displayName : "AI Agent"}
                    </div>
                    <div className={`chat-bubble ${m.role}`}>{m.content}</div>
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
