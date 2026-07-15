// 极简的 localStorage 持久化封装。
// 作为 mock 后端的存储层，将来替换成真实 HTTP 请求时可整体移除。

const PREFIX = "aiagent:";

export function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function write<T>(key: string, value: T): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export function remove(key: string): void {
  localStorage.removeItem(PREFIX + key);
}

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}

// 模拟网络延迟，让 UI 的 loading 状态可见
export function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
