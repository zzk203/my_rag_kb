import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, Select, Typography, Button, Space, Modal, Input, message as antMsg } from 'antd'
import {
  MessageOutlined,
  PlusOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  CommentOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { useAppStore } from '../store/appStore'
import { deleteConversation as apiDeleteConversation, renameConversation as apiRenameConversation } from '../api/chat'

const { Text } = Typography

const Sidebar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const collections = useAppStore((s) => s.collections)
  const currentCollectionId = useAppStore((s) => s.currentCollectionId)
  const conversations = useAppStore((s) => s.conversations)
  const setCurrentCollection = useAppStore((s) => s.setCurrentCollection)
  const loadConversations = useAppStore((s) => s.loadConversations)
  const setCurrentConversation = useAppStore((s) => s.setCurrentConversation)
  const currentConversationId = useAppStore((s) => s.currentConversationId)

  const [renaming, setRenaming] = useState<{ id: number; title: string } | null>(null)

  useEffect(() => {
    if (currentCollectionId) {
      loadConversations()
    }
  }, [currentCollectionId, loadConversations])

  const handleNewChat = () => {
    setCurrentConversation(null)
    navigate('/')
  }

  const handleDelete = (e: React.MouseEvent, id: number, title: string) => {
    e.stopPropagation()
    Modal.confirm({
      title: '删除对话',
      content: `确定删除对话「${title}」吗？此操作不可撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await apiDeleteConversation(id)
          antMsg.success('已删除')
          loadConversations()
          if (currentConversationId === id) {
            setCurrentConversation(null)
          }
        } catch (err: any) {
          antMsg.error(err.message || '删除失败')
        }
      },
    })
  }

  const handleRename = (e: React.MouseEvent, id: number, title: string) => {
    e.stopPropagation()
    setRenaming({ id, title })
  }

  const submitRename = async () => {
    if (!renaming || !renaming.title.trim()) return
    try {
      await apiRenameConversation(renaming.id, renaming.title.trim())
      antMsg.success('已重命名')
      loadConversations()
    } catch (err: any) {
      antMsg.error(err.message || '重命名失败')
    }
    setRenaming(null)
  }

  const navItems = [
    {
      key: '/',
      icon: <CommentOutlined />,
      label: '问答',
      onClick: () => navigate('/'),
    },
    {
      key: '/documents',
      icon: <FileTextOutlined />,
      label: '文档管理',
      onClick: () => navigate('/documents'),
    },
    {
      key: '/collections',
      icon: <DatabaseOutlined />,
      label: '知识库设置',
      onClick: () => navigate('/collections'),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
        <Text strong style={{ fontSize: 16 }}>
          🧠 个人知识库
        </Text>
      </div>

      <div style={{ padding: '12px' }}>
        <Select
          style={{ width: '100%' }}
          placeholder="选择知识库"
          value={currentCollectionId}
          onChange={setCurrentCollection}
          options={collections.map((c) => ({ label: c.name, value: c.id }))}
        />
      </div>

      <div style={{ padding: '0 12px 8px' }}>
        <Button type="dashed" icon={<PlusOutlined />} block onClick={handleNewChat}>
          新建对话
        </Button>
      </div>

      <div style={{ padding: '0 12px' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          对话历史
        </Text>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => {
              setCurrentConversation(conv.id)
              navigate('/')
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 8px 8px 16px',
              cursor: 'pointer',
              background: currentConversationId === conv.id ? '#e6f4ff' : undefined,
              borderRadius: 4,
              margin: '2px 8px',
            }}
            onMouseEnter={(e) => {
              const btns = e.currentTarget.querySelector('.conv-actions') as HTMLElement
              if (btns) btns.style.display = 'flex'
            }}
            onMouseLeave={(e) => {
              const btns = e.currentTarget.querySelector('.conv-actions') as HTMLElement
              if (btns) btns.style.display = 'none'
            }}
          >
            <Space>
              <MessageOutlined style={{ color: '#999' }} />
              <Text ellipsis style={{ maxWidth: 140, fontSize: 13 }}>
                {conv.title}
              </Text>
            </Space>
            <Space
              className="conv-actions"
              style={{ display: 'none', flexShrink: 0 }}
              size={2}
            >
              <Button
                type="text"
                size="small"
                icon={<EditOutlined style={{ fontSize: 12 }} />}
                onClick={(e) => handleRename(e, conv.id, conv.title)}
              />
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined style={{ fontSize: 12 }} />}
                onClick={(e) => handleDelete(e, conv.id, conv.title)}
              />
            </Space>
          </div>
        ))}
        {conversations.length === 0 && (
          <Text type="secondary" style={{ fontSize: 12, padding: '8px 16px', display: 'block' }}>
            暂无对话
          </Text>
        )}
      </div>

      <div style={{ borderTop: '1px solid #f0f0f0', padding: '4px 0' }}>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={navItems}
          style={{ border: 'none' }}
        />
      </div>

      <Modal
        title="重命名对话"
        open={!!renaming}
        onOk={submitRename}
        onCancel={() => setRenaming(null)}
        okText="确定"
        cancelText="取消"
      >
        <Input
          value={renaming?.title || ''}
          onChange={(e) => setRenaming((s) => (s ? { ...s, title: e.target.value } : null))}
          onPressEnter={submitRename}
          placeholder="输入新名称"
        />
      </Modal>
    </div>
  )
}

export default Sidebar
