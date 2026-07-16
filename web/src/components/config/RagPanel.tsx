import { useState } from "react";
import {
  Button,
  Card,
  Empty,
  Input,
  List,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Upload,
  App as AntApp,
  Popconfirm,
  Divider,
} from "antd";
import {
  UploadOutlined,
  DeleteOutlined,
  SearchOutlined,
  FileTextOutlined,
  EditOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { UploadProps } from "antd";
import {
  uploadRagDocs,
  deleteRagDoc,
  updateRagDoc,
  reindexRagDoc,
  getRagDoc,
  searchRag,
  type RagSearchResult,
} from "@/api/rag";
import type { RagDocStatus, RagDocument } from "@/api/types";

interface Props {
  docs: RagDocument[];
  onChange: () => void;
}

const statusTag: Record<RagDocStatus, { color: string; label: string }> = {
  pending: { color: "default", label: "待索引" },
  indexing: { color: "processing", label: "索引中" },
  indexed: { color: "green", label: "已索引" },
  failed: { color: "red", label: "失败" },
};

export default function RagPanel({ docs, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RagSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // 编辑弹窗
  const [editing, setEditing] = useState<RagDocument | null>(null);
  const [editFilename, setEditFilename] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editOriginalContent, setEditOriginalContent] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { message } = AntApp.useApp();

  const uploadProps: UploadProps = {
    accept: ".md,.txt,.pdf,.docx",
    multiple: true,
    showUploadList: false,
    beforeUpload: async (file, fileList) => {
      if (file !== fileList[fileList.length - 1]) return false;
      setUploading(true);
      try {
        const created = await uploadRagDocs(fileList as unknown as File[]);
        const ok = created.filter((d) => d.status === "indexed").length;
        const failed = created.filter((d) => d.status === "failed");
        if (ok > 0) message.success(`成功索引 ${ok} 个文档`);
        if (failed.length > 0)
          message.warning(`${failed.length} 个文档失败：${failed[0].error ?? ""}`);
        onChange();
      } catch (e) {
        message.error((e as Error).message);
      } finally {
        setUploading(false);
      }
      return false;
    },
  };

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      setResults(await searchRag(query, 5));
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const toggleEnabled = async (doc: RagDocument, enabled: boolean) => {
    setBusyId(doc.id);
    try {
      await updateRagDoc(doc.id, { enabled });
      message.success(enabled ? "已启用" : "已停用");
      onChange();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const reindex = async (doc: RagDocument) => {
    setBusyId(doc.id);
    try {
      const r = await reindexRagDoc(doc.id);
      if (r.status === "indexed") message.success(`重新索引完成，共 ${r.chunks} 块`);
      else message.warning(`重新索引失败：${r.error ?? ""}`);
      onChange();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const openEdit = async (doc: RagDocument) => {
    setEditing(doc);
    setEditFilename(doc.filename);
    setEditContent("");
    setEditOriginalContent("");
    setEditLoading(true);
    try {
      const detail = await getRagDoc(doc.id);
      setEditContent(detail.content);
      setEditOriginalContent(detail.content);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setEditLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const contentChanged = editContent !== editOriginalContent;
      const r = await updateRagDoc(editing.id, {
        filename: editFilename,
        content: contentChanged ? editContent : undefined,
      });
      if (contentChanged) {
        if (r.status === "indexed")
          message.success(`已保存并重新索引，共 ${r.chunks} 块`);
        else message.warning(`已保存，但重新索引失败：${r.error ?? ""}`);
      } else {
        message.success("已保存");
      }
      setEditing(null);
      onChange();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Upload {...uploadProps}>
          <Button type="primary" icon={<UploadOutlined />} loading={uploading}>
            导入文档
          </Button>
        </Upload>
        <span style={{ color: "#999" }}>
          支持 .md / .txt（PDF/DOCX 需接入文本抽取库）
        </span>
      </Space>

      <Table<RagDocument>
        rowKey="id"
        dataSource={docs}
        pagination={false}
        columns={[
          {
            title: "文件名",
            dataIndex: "filename",
            render: (v) => (
              <span>
                <FileTextOutlined style={{ marginRight: 6 }} />
                {v}
              </span>
            ),
          },
          {
            title: "类型",
            dataIndex: "type",
            width: 80,
            render: (v) => <Tag>{v}</Tag>,
          },
          {
            title: "大小",
            dataIndex: "size",
            width: 90,
            render: (v: number) => `${(v / 1024).toFixed(1)} KB`,
          },
          { title: "分块数", dataIndex: "chunks", width: 80 },
          {
            title: "状态",
            dataIndex: "status",
            width: 100,
            render: (s: RagDocStatus, d) =>
              s === "failed" && d.error ? (
                <Tooltip title={d.error}>
                  <Tag color={statusTag[s].color}>{statusTag[s].label}</Tag>
                </Tooltip>
              ) : (
                <Tag color={statusTag[s].color}>{statusTag[s].label}</Tag>
              ),
          },
          {
            title: "启用",
            dataIndex: "enabled",
            width: 80,
            render: (v: boolean, d) => (
              <Switch
                size="small"
                checked={v}
                loading={busyId === d.id}
                onChange={(checked) => toggleEnabled(d, checked)}
              />
            ),
          },
          {
            title: "操作",
            width: 160,
            render: (_, d) => (
              <Space>
                <Tooltip title="编辑（改名 / 改正文）">
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => openEdit(d)}
                  />
                </Tooltip>
                <Tooltip title="重新索引">
                  <Button
                    size="small"
                    icon={<ReloadOutlined />}
                    loading={busyId === d.id}
                    onClick={() => reindex(d)}
                  />
                </Tooltip>
                <Popconfirm
                  title="删除该文档？将同时清除其向量"
                  onConfirm={async () => {
                    await deleteRagDoc(d.id);
                    message.success("已删除");
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

      <Divider>检索测试</Divider>

      <Card size="small">
        <Space.Compact style={{ width: "100%" }}>
          <Input
            placeholder="输入查询内容，测试知识库检索效果"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onPressEnter={runSearch}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            loading={searching}
            onClick={runSearch}
          >
            检索
          </Button>
        </Space.Compact>

        <div style={{ marginTop: 16 }}>
          {results.length === 0 ? (
            <Empty description="暂无检索结果" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <List
              dataSource={results}
              renderItem={(r) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space>
                        {typeof r.score === "number" && (
                          <Tag color="blue">score {r.score.toFixed(2)}</Tag>
                        )}
                        <span style={{ color: "#999", fontSize: 12 }}>
                          {r.source}
                        </span>
                      </Space>
                    }
                    description={r.content}
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      </Card>

      <Modal
        title="编辑文档"
        open={!!editing}
        onOk={saveEdit}
        onCancel={() => setEditing(null)}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        width={720}
      >
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 6, color: "#666" }}>文件名</div>
          <Input
            value={editFilename}
            onChange={(e) => setEditFilename(e.target.value)}
          />
        </div>
        <div>
          <div style={{ marginBottom: 6, color: "#666" }}>
            正文（修改后保存会自动重新索引）
          </div>
          <Input.TextArea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            autoSize={{ minRows: 10, maxRows: 20 }}
            disabled={editLoading}
            placeholder={editLoading ? "加载中…" : "文档正文"}
          />
        </div>
      </Modal>
    </div>
  );
}
