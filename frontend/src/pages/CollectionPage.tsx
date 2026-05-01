import React, { useEffect, useState } from 'react'
import {
  Card,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  message as antMsg,
  Statistic,
  Popconfirm,
  Tag,
  Divider,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  DatabaseOutlined,
} from '@ant-design/icons'
import { useAppStore } from '../store/appStore'
import {
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  getCollectionStats,
} from '../api/collections'
import type { Collection, CollectionStats } from '../types'

const { Text } = Typography

const CollectionPage: React.FC = () => {
  const loadCollections = useAppStore((s) => s.loadCollections)
  const [collections, setCollections] = useState<Collection[]>([])
  const [stats, setStats] = useState<Record<number, CollectionStats>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Collection | null>(null)
  const [form] = Form.useForm()

  const fetchData = async () => {
    const data = await getCollections()
    setCollections(data)
    loadCollections()
    const statsMap: Record<number, CollectionStats> = {}
    for (const c of data) {
      try {
        statsMap[c.id] = await getCollectionStats(c.id)
      } catch { /* ignore */ }
    }
    setStats(statsMap)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (c: Collection) => {
    setEditing(c)
    form.setFieldsValue(c)
    setModalOpen(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    try {
      if (editing) {
        await updateCollection(editing.id, values)
        antMsg.success('已更新')
      } else {
        await createCollection(values)
        antMsg.success('已创建')
      }
      setModalOpen(false)
      fetchData()
    } catch (err: any) {
      antMsg.error(err.message || '操作失败')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteCollection(id)
      antMsg.success('已删除')
      fetchData()
    } catch (err: any) {
      antMsg.error(err.message)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Text strong style={{ fontSize: 18 }}>
          知识库管理
        </Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建知识库
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {collections.map((c) => {
          const s = stats[c.id]
          return (
            <Col key={c.id} xs={24} sm={12} lg={8}>
              <Card
                actions={[
                  <EditOutlined key="edit" onClick={() => openEdit(c)} />,
                  <Popconfirm
                    key="delete"
                    title="确定删除此知识库？所有文档和向量将被清除"
                    onConfirm={() => handleDelete(c.id)}
                  >
                    <DeleteOutlined />
                  </Popconfirm>,
                ]}
              >
                <Card.Meta
                  avatar={<DatabaseOutlined style={{ fontSize: 28, color: '#1677ff' }} />}
                  title={c.name}
                  description={
                    <>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {c.description || '无描述'}
                      </Text>
                      <div style={{ marginTop: 8 }}>
                        <Tag>LLM: {c.provider}</Tag>
                        <Tag>{c.llm_model}</Tag>
                        <Tag>Embed: {c.embedding_provider || c.provider}</Tag>
                        <Tag>{c.embedding_model}</Tag>
                      </div>
                    </>
                  }
                />
                {s && (
                  <Row gutter={16} style={{ marginTop: 16 }}>
                    <Col span={12}>
                      <Statistic title="文档" value={s.doc_count} />
                    </Col>
                    <Col span={12}>
                      <Statistic title="分块" value={s.chunk_count} />
                    </Col>
                  </Row>
                )}
              </Card>
            </Col>
          )
        })}
      </Row>

      <Modal
        title={editing ? '编辑知识库' : '新建知识库'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="知识库名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="可选描述" />
          </Form.Item>

          <Divider orientation="left" plain>LLM 配置</Divider>
          <Form.Item name="provider" label="Provider">
            <Select
              options={[
                { label: 'OpenAI 兼容', value: 'openai' },
                { label: 'Ollama (本地)', value: 'ollama' },
              ]}
              allowClear
              placeholder="默认 openai"
            />
          </Form.Item>
          <Form.Item name="base_url" label="API Base URL">
            <Input placeholder="如: https://open.bigmodel.cn/api/paas/v4" />
          </Form.Item>
          <Form.Item name="api_key" label="API Key">
            <Input.Password placeholder="留空则使用 .env 默认值" />
          </Form.Item>
          <Form.Item name="llm_model" label="LLM 模型">
            <Input placeholder="如: gpt-4o-mini 或 glm-4.7-flash" />
          </Form.Item>

          <Divider orientation="left" plain>Embedding 配置 (留空则继承 LLM 配置)</Divider>
          <Form.Item name="embedding_provider" label="Embed Provider">
            <Select
              options={[
                { label: 'OpenAI 兼容', value: 'openai' },
                { label: 'Ollama (本地)', value: 'ollama' },
              ]}
              allowClear
              placeholder="默认继承 LLM Provider"
            />
          </Form.Item>
          <Form.Item name="embedding_base_url" label="Embed API Base URL">
            <Input placeholder="留空继承 LLM Base URL" />
          </Form.Item>
          <Form.Item name="embedding_api_key" label="Embed API Key">
            <Input.Password placeholder="留空继承 LLM API Key" />
          </Form.Item>
          <Form.Item name="embedding_model" label="Embedding 模型">
            <Input placeholder="如: text-embedding-3-small" />
          </Form.Item>

          <Divider orientation="left" plain>其他</Divider>
          <Form.Item name="max_history" label="历史对话轮数">
            <InputNumber min={0} max={50} style={{ width: '100%' }} placeholder="默认 6" />
          </Form.Item>
          <Form.Item name="ocr_enabled" label="OCR 识别" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default CollectionPage
