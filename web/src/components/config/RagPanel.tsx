import { useState } from "react";
import {
  Button,
  Card,
  Empty,
  Input,
  List,
  Space,
  Table,
  Tag,
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
} from "@ant-design/icons";
import type { UploadProps } from "antd";
import { addRagDocs, deleteRagDoc, updateRagDoc } from "@/api/config";
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
  const [results, setResults] = useState<
    { content: string; score: number; source: string }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const { message } = AntApp.useApp();

  const uploadProps: UploadProps = {
    accept: ".md,.txt,.pdf,.docx",
    multiple: true,
    showUploadList: false,
    beforeUpload: async (file, fileList) => {
      if (file !== fileList[fileList.length - 1]) return false;
      const ext = (f: File) => f.name.split(".").pop()?.toLowerCase() ?? "txt";
      await addRagDocs(
        fileList.map((f) => ({
          filename: f.name,
          type: ext(f),
          size: f.size,
          collection: "product_workflow_test",
        }))
      );
      message.success(`已添加 ${fileList.length} 个文档，待索引`);
      onChange();
      return false;
    },
  };

  // 模拟索引：真实逻辑后续接入 indexer + Qdrant
  const runIndex = async (doc: RagDocument) => {
    await updateRagDoc(doc.id, { status: "indexing" });
    onChange();
    setTimeout(async () => {
      await updateRagDoc(doc.id, {
        status: "indexed",
        chunks: Math.floor(Math.random() * 40) + 5,
      });
      onChange();
    }, 800);
  };

  // 模拟检索测试：真实逻辑后续接入 retriever
  const runSearch = () => {
    if (!query.trim()) return;
    setSearching(true);
    setTimeout(() => {
      const indexed = docs.filter((d) => d.status === "indexed");
      setResults(
        indexed.slice(0, 3).map((d, i) => ({
          content: `[占位结果] 来自《${d.filename}》与「${query}」相关的片段 ${i + 1}。真实检索将接入 retriever + Qdrant。`,
          score: Number((0.9 - i * 0.12).toFixed(2)),
          source: d.filename,
        }))
      );
      setSearching(false);
    }, 500);
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Upload {...uploadProps}>
          <Button type="primary" icon={<UploadOutlined />}>
            导入文档
          </Button>
        </Upload>
        <span style={{ color: "#999" }}>支持 .md / .txt / .pdf / .docx</span>
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
            width: 90,
            render: (v) => <Tag>{v}</Tag>,
          },
          {
            title: "大小",
            dataIndex: "size",
            width: 110,
            render: (v: number) => `${(v / 1024).toFixed(1)} KB`,
          },
          { title: "分块数", dataIndex: "chunks", width: 90 },
          {
            title: "状态",
            dataIndex: "status",
            width: 110,
            render: (s: RagDocStatus) => (
              <Tag color={statusTag[s].color}>{statusTag[s].label}</Tag>
            ),
          },
          {
            title: "操作",
            width: 160,
            render: (_, d) => (
              <Space>
                {d.status !== "indexed" && d.status !== "indexing" && (
                  <Button size="small" onClick={() => runIndex(d)}>
                    索引
                  </Button>
                )}
                <Popconfirm
                  title="删除该文档？"
                  onConfirm={async () => {
                    await deleteRagDoc(d.id);
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
                        <Tag color="blue">score {r.score}</Tag>
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
    </div>
  );
}
