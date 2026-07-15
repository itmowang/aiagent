# AI Agent 控制台 (前端)

独立的前端界面，位于 `web/`，不依赖也不改动根目录的 `src/` 后端代码。
当前所有数据由浏览器 localStorage 的 mock 层驱动，后续按步骤替换为真实后端接口。

## 技术栈

- React 18 + TypeScript
- Vite
- Ant Design 5 + react-router-dom 6

## 运行

```bash
cd web
pnpm install
pnpm dev
```

默认地址 http://localhost:5173

默认管理员账号：`admin` / `admin123`

## 功能结构

- 登录页 `/login`：真实的用户名密码校验（mock 层持久化）
- 对话页 `/chat`：会话列表 + 聊天界面 + 对话设置抽屉（回复为占位，后端逻辑后续接入）
- 后台 `/admin`（仅管理员）
  - 概览 `dashboard`：统计卡片
  - 用户管理 `users`：真实的增删改查、启用/禁用、重置密码
  - 用户配置 `users/:id`：分标签页
    - 记忆配置：增删 + JSON 导入
    - 技能配置：增删改 + 启停
    - RAG 知识库：文档导入、索引、检索测试
    - 模型配置：多模型管理、默认模型
    - MCP 配置：stdio / SSE / HTTP 服务管理
  - 对话默认设置 `chat-defaults`：模型、系统提示词、记忆/RAG 开关、默认技能与 MCP

## 与后端的对接点

`src/api/` 下的 `auth.ts`、`users.ts`、`config.ts` 是所有数据访问的唯一入口。
接入真实后端时，只需把这些函数体从 localStorage 改为 HTTP 请求，UI 层无需改动。

映射关系：
- Memory → 后端 `Memory` 模型 (prisma)
- Model → `src/llm`
- Skill → `src/tool` / `src/runtime`
- RAG → `src/rag`（loader / chunker / embedding / indexer / retriever / qdrant）
- 对话 → `src/agent` + `src/conversation`
