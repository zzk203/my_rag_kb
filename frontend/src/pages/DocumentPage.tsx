import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  SearchOutlined,
} from '@ant-design/icons'
import FileUpload from '../components/FileUpload'
import HighlightedText from '../components/HighlightedText'
import { useAppStore } from '../store/appStore'
import { getDocuments, deleteDocument, reindexDocument, getDocumentChunks, getDocumentDownloadUrl, getDocumentContent } from '../api/documents'
import type { Document, Chunk } from '../types'

const { Text } = Typography

const DocumentPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
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
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const [previewContent, setPreviewContent] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const highlightDocId = searchParams.get('document_id') ? Number(searchParams.get('document_id')) : null
  const urlCollectionId = searchParams.get('collection_id') ? Number(searchParams.get('collection_id')) : null
  useEffect(() => {
    if (urlCollectionId && urlCollectionId !== currentCollectionId) {
      setCurrentCollection(urlCollectionId)
    }
  }, [urlCollectionId])

  useEffect(() => {
    if (highlightDocId && docs.length > 0) {
      setTimeout(() => {
        const el = document.querySelector('.highlight-row')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [docs])

  useEffect(() => {
    if (highlightDocId) {
      setSearchParams({}, { replace: true })
    }
  }, [highlightDocId])

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
      sorter: (a: Document, b: Document) => a.filename.localeCompare(b.filename),
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
      sorter: (a: Document, b: Document) => a.file_type.localeCompare(b.file_type),
    },
    {
      title: '大小',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 100,
      sorter: (a: Document, b: Document) => a.file_size - b.file_size,
      render: (v: number) => (v > 1024 ? `${(v / 1024).toFixed(1)} KB` : `${v} B`),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      sorter: (a: Document, b: Document) => a.status.localeCompare(b.status),
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
      sorter: (a: Document, b: Document) => a.chunk_count - b.chunk_count,
    },
    {
      title: '操作',
      key: 'actions',
      width: 240,
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
            icon={<SearchOutlined />}
            onClick={async () => {
              setPreviewDoc(record)
              if (['md', 'txt', 'html', 'htm'].includes(record.file_type)) {
                setPreviewLoading(true)
                try {
                  const text = await getDocumentContent(record.id)
                  setPreviewContent(text)
                } catch { setPreviewContent('(加载失败)') }
                setPreviewLoading(false)
              } else {
                setPreviewContent(null)
              }
            }}
          >
            预览
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
        rowClassName={(record) => record.id === highlightDocId ? 'highlight-row' : ''}
      />
      <style>{`
        .highlight-row {
          background-color: #fff7e6 !important;
          animation: fadeHighlight 3s ease-out;
        }
        .highlight-row td {
          background-color: #fff7e6 !important;
        }
        @keyframes fadeHighlight {
          from { background-color: #ffd591; }
          to { background-color: #fff7e6; }
        }
      `}</style>

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

      <Modal
        title={previewDoc ? `预览 - ${previewDoc.filename}` : ''}
        open={!!previewDoc}
        onCancel={() => { setPreviewDoc(null); setPreviewContent(null) }}
        footer={null}
        width="80%"
        style={{ top: 20 }}
      >
        {previewDoc && ['png', 'jpg', 'jpeg'].includes(previewDoc.file_type) ? (
          <img
            src={getDocumentDownloadUrl(previewDoc.id)}
            alt={previewDoc.filename}
            style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }}
          />
        ) : previewDoc && previewDoc.file_type === 'pdf' ? (
          <iframe
            src={getDocumentDownloadUrl(previewDoc.id)}
            style={{ width: '100%', minHeight: '80vh', border: 'none' }}
            title={previewDoc.filename}
          />
        ) : previewDoc && ['md', 'txt'].includes(previewDoc.file_type) ? (
          <div
            style={{
              padding: 16, background: '#fafafa', borderRadius: 4,
              maxHeight: '70vh', overflow: 'auto', whiteSpace: 'pre-wrap',
              fontSize: 14, lineHeight: 1.7,
            }}
          >
            {previewLoading ? <Text type="secondary">加载中…</Text> : previewContent}
          </div>
        ) : previewDoc && ['html', 'htm'].includes(previewDoc.file_type) ? (
          <div
            style={{
              padding: 16, background: '#fff', borderRadius: 4,
              maxHeight: '70vh', overflow: 'auto', fontSize: 14,
            }}
            dangerouslySetInnerHTML={{ __html: previewContent || '' }}
          />
        ) : (
          <Text type="secondary">不支持预览此文件类型</Text>
        )}
      </Modal>
    </div>
  )
}

export default DocumentPage
