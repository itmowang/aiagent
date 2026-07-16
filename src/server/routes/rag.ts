import { Hono } from "hono";
import { prisma } from "../../lib/prisma";
import { authMiddleware, adminMiddleware, type AppEnv } from "../middleware";
import {
    indexText,
    removeVectors,
    searchKnowledge,
    RAG_COLLECTION,
} from "../ragService";

export const ragRoutes = new Hono<AppEnv>();

ragRoutes.use("*", authMiddleware);

const TEXT_TYPES = new Set(["md", "markdown", "txt", "text"]);

function extOf(name: string): string {
    return name.split(".").pop()?.toLowerCase() ?? "txt";
}

function toDoc(d: {
    id: string;
    filename: string;
    type: string;
    size: number;
    chunks: number;
    status: string;
    enabled: boolean;
    collection: string;
    error: string | null;
    createdAt: Date;
}) {
    return {
        id: d.id,
        filename: d.filename,
        type: d.type,
        size: d.size,
        chunks: d.chunks,
        status: d.status,
        enabled: d.enabled,
        collection: d.collection,
        error: d.error,
        createdAt: d.createdAt.getTime(),
    };
}

// 从已存储的原文重新索引：先删旧向量，再重新分块入库
async function reindexFromContent(docId: string) {
    const doc = await prisma.ragDocument.findUnique({ where: { id: docId } });
    if (!doc) throw new Error("文档不存在");
    if (!doc.content) throw new Error("该文档没有可用的原始文本，无法重新索引");

    const oldIds = Array.isArray(doc.vectorIds) ? (doc.vectorIds as string[]) : [];
    await prisma.ragDocument.update({
        where: { id: docId },
        data: { status: "indexing", error: null },
    });
    try {
        await removeVectors(oldIds);
        const { chunks, vectorIds } = await indexText({
            ragDocId: doc.id,
            filename: doc.filename,
            type: doc.type,
            text: doc.content,
        });
        return prisma.ragDocument.update({
            where: { id: docId },
            data: { status: "indexed", chunks, vectorIds, error: null },
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return prisma.ragDocument.update({
            where: { id: docId },
            data: { status: "failed", error: msg },
        });
    }
}

// 文档列表（已登录可读）
ragRoutes.get("/docs", async (c) => {
    const docs = await prisma.ragDocument.findMany({
        orderBy: { createdAt: "desc" },
    });
    return c.json(docs.map(toDoc));
});

// 上传并索引（管理员）。支持多文件，字段名 files。
ragRoutes.post("/docs", adminMiddleware, async (c) => {
    const body = await c.req.parseBody({ all: true });
    const raw = body["files"] ?? body["file"];
    const files = (Array.isArray(raw) ? raw : [raw]).filter(
        (f): f is File => f instanceof File
    );

    if (files.length === 0) {
        return c.json({ error: "未收到文件" }, 400);
    }

    const results = [];
    for (const file of files) {
        const type = extOf(file.name);
        const buffer = Buffer.from(await file.arrayBuffer());

        const doc = await prisma.ragDocument.create({
            data: {
                filename: file.name,
                type,
                size: buffer.length,
                status: "indexing",
                collection: RAG_COLLECTION,
            },
        });

        // 目前仅支持文本类文件（md / txt）。pdf/docx 需额外解析库。
        if (!TEXT_TYPES.has(type)) {
            const updated = await prisma.ragDocument.update({
                where: { id: doc.id },
                data: {
                    status: "failed",
                    error: "暂不支持该类型，请上传 .md 或 .txt（PDF/DOCX 需接入文本抽取库）",
                },
            });
            results.push(toDoc(updated));
            continue;
        }

        try {
            const text = buffer.toString("utf8");
            const { chunks, vectorIds } = await indexText({
                ragDocId: doc.id,
                filename: file.name,
                type,
                text,
            });
            const updated = await prisma.ragDocument.update({
                where: { id: doc.id },
                data: { status: "indexed", chunks, vectorIds, content: text },
            });
            results.push(toDoc(updated));
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            const updated = await prisma.ragDocument.update({
                where: { id: doc.id },
                data: { status: "failed", error: msg },
            });
            results.push(toDoc(updated));
        }
    }

    return c.json(results, 201);
});

// 单个文档详情（含原文，供编辑，管理员）
ragRoutes.get("/docs/:id", adminMiddleware, async (c) => {
    const doc = await prisma.ragDocument.findUnique({
        where: { id: c.req.param("id") },
    });
    if (!doc) return c.json({ error: "文档不存在" }, 404);
    return c.json({ ...toDoc(doc), content: doc.content ?? "" });
});

// 编辑文档（管理员）：可改文件名、启停；改了正文会自动重新索引
ragRoutes.patch("/docs/:id", adminMiddleware, async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json<{
        filename?: string;
        enabled?: boolean;
        content?: string;
    }>();

    const doc = await prisma.ragDocument.findUnique({ where: { id } });
    if (!doc) return c.json({ error: "文档不存在" }, 404);

    const contentChanged =
        typeof body.content === "string" && body.content !== doc.content;

    const updated = await prisma.ragDocument.update({
        where: { id },
        data: {
            filename: body.filename ?? doc.filename,
            enabled: typeof body.enabled === "boolean" ? body.enabled : doc.enabled,
            ...(contentChanged
                ? { content: body.content, size: Buffer.byteLength(body.content ?? "") }
                : {}),
        },
    });

    // 正文变了就重新索引
    if (contentChanged) {
        const reindexed = await reindexFromContent(id);
        return c.json(toDoc(reindexed));
    }
    return c.json(toDoc(updated));
});

// 手动重新索引（管理员）
ragRoutes.post("/docs/:id/reindex", adminMiddleware, async (c) => {
    try {
        const doc = await reindexFromContent(c.req.param("id"));
        return c.json(toDoc(doc));
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return c.json({ error: msg }, 400);
    }
});

// 删除文档（管理员）：清理 Qdrant 向量 + DB 记录
ragRoutes.delete("/docs/:id", adminMiddleware, async (c) => {
    const id = c.req.param("id");
    const doc = await prisma.ragDocument.findUnique({ where: { id } });
    if (!doc) return c.json({ error: "文档不存在" }, 404);

    const vectorIds = Array.isArray(doc.vectorIds)
        ? (doc.vectorIds as string[])
        : [];
    try {
        await removeVectors(vectorIds);
    } catch (err) {
        console.error("[rag] 删除向量失败", err);
    }
    await prisma.ragDocument.delete({ where: { id } });
    return c.json({ ok: true });
});

// 检索测试（已登录可用）
ragRoutes.post("/search", async (c) => {
    const { query, limit } = await c.req.json<{
        query: string;
        limit?: number;
    }>();
    if (!query || !query.trim()) {
        return c.json({ error: "query 不能为空" }, 400);
    }
    const results = await searchKnowledge(query, limit ?? 5);
    return c.json(
        results.map((r) => ({
            content: r.content,
            source: (r.metadata?.fileName as string) ?? r.metadata?.source ?? "",
            score: r.metadata?.score ?? undefined,
            headings: r.metadata?.headings,
        }))
    );
});
