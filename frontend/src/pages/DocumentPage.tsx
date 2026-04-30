import React, { useEffect, useState } from 'react'
import {
  Table,
  Select,
  Button,
  Space,
  Tag,
  Tooltip,
  Typography,
  message as antMsg,
  Modal,
  Popconfirm,
} from 'antd'
import {
  DeleteOutlined,
  ReloadOutlined,
  FileTextOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import FileUpload from '../components/FileUpload'
import { useAppStore } from '../store/appStore'
import { getDocuments, deleteDocument, reindexDocument, getDocumentChunks } from '../api/documents'
import type { Document, Chunk } from '../types'

const { Text } = Typography

const DocumentPage: React.FC = () => {
  const collections = useAppStore((s) => s.collections)
  const currentCollectionId = useAppStore((s) => s.currentCollectionId)
  const setCurrentCollection = useAppStore((s) => s.setCurrentCollection)

  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [chunksModal, setChunksModal] = useState<{ open: boolean; chunks: Chunk[]; title: string }>({
    open: false,
    chunks: [],
    title: '',
  })

  const loadDocs = async () => {
    if (!currentCollectionId) {
      setDocs([])
      return
    }
    setLoading(true)
    try {
      const data = await getDocuments({ collection_id: currentCollectionId })
      setDocs(data)
    } catch (err: any) {
      antMsg.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocs()
  }, [currentCollectionId])

  const handleDelete = async (id: number) => {
    try {
      await deleteDocument(id)
      antMsg.success('已删除')
      loadDocs()
    } catch (err: any) {
      antMsg.error(err.message)
    }
  }

  const handleReindex = async (id: number) => {
    try {
      await reindexDocument(id)
      antMsg.success('已重新索引')
      loadDocs()
    } catch (err: any) {
      antMsg.error(err.message)
    }
  }

  const handleViewChunks = async (id: number, filename: string) => {
    try {
      const data = await getDocumentChunks(id)
      setChunksModal({ open: true, chunks: data, title: filename })
    } catch (err: any) {
      antMsg.error(err.message)
    }
  }

  const columns = [
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
      render: (v: string) => (
        <Space>
          <FileTextOutlined />
          {v}
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'file_type',
      key: 'file_type',
      width: 80,
    },
    {
      title: '大小',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 100,
      render: (v: number) => (v > 1024 ? `${(v / 1024).toFixed(1)} KB` : `${v} B`),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string, record: Document) => {
        const color =
          v === 'ready' ? 'green' : v === 'error' ? 'red' : v === 'processing' ? 'blue' : 'default'
        const tag = <Tag color={color}>{v}</Tag>
        if (v === 'error' && record.error_message) {
          return <Tooltip title={record.error_message}>{tag}</Tooltip>
        }
        return tag
      },
    },
    {
      title: '分块数',
      dataIndex: 'chunk_count',
      key: 'chunk_count',
      width: 80,
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: Document) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewChunks(record.id, record.filename)}
          >
            分块
          </Button>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => handleReindex(record.id)}
          >
            重建
          </Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text strong style={{ fontSize: 18 }}>
          文档管理
        </Text>
        <Space>
          <Select
            style={{ width: 200 }}
            placeholder="选择知识库"
            value={currentCollectionId}
            onChange={setCurrentCollection}
            options={collections.map((c) => ({ label: c.name, value: c.id }))}
          />
          {currentCollectionId && (
            <FileUpload collectionId={currentCollectionId} onSuccess={loadDocs} />
          )}
        </Space>
      </div>

      <Table
        dataSource={docs}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        locale={{ emptyText: currentCollectionId ? '暂无文档，请上传' : '请先选择知识库' }}
      />

      <Modal
        title={`分块列表 - ${chunksModal.title}`}
        open={chunksModal.open}
        onCancel={() => setChunksModal((s) => ({ ...s, open: false }))}
        footer={null}
        width={700}
      >
        {chunksModal.chunks.map((chunk) => (
          <div
            key={chunk.id}
            style={{
              padding: 12,
              marginBottom: 8,
              background: '#fafafa',
              borderRadius: 4,
              border: '1px solid #f0f0f0',
            }}
          >
            <Text type="secondary" style={{ fontSize: 12 }}>
              块 #{chunk.chunk_index}
              {chunk.page_number != null && ` | 第 ${chunk.page_number} 页`}
            </Text>
            <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {chunk.content.slice(0, 500)}
              {chunk.content.length > 500 && '...'}
            </div>
          </div>
        ))}
        {chunksModal.chunks.length === 0 && <Text type="secondary">暂无分块</Text>}
      </Modal>
    </div>
  )
}

export default DocumentPage
