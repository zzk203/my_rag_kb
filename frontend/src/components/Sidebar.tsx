import React, { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, Select, Typography, Button, Space } from 'antd'
import {
  MessageOutlined,
  PlusOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  CommentOutlined,
} from '@ant-design/icons'
import { useAppStore } from '../store/appStore'

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

  useEffect(() => {
    if (currentCollectionId) {
      loadConversations()
    }
  }, [currentCollectionId, loadConversations])

  const handleNewChat = () => {
    setCurrentConversation(null)
    navigate('/')
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
              padding: '8px 16px',
              cursor: 'pointer',
              background: currentConversationId === conv.id ? '#e6f4ff' : undefined,
              borderRadius: 4,
              margin: '2px 8px',
            }}
          >
            <Space>
              <MessageOutlined style={{ color: '#999' }} />
              <Text
                ellipsis
                style={{ maxWidth: 180, fontSize: 13 }}
              >
                {conv.title}
              </Text>
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
    </div>
  )
}

export default Sidebar
