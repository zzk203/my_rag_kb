import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Typography, Collapse, Tag, Space } from 'antd'
import { UserOutlined, RobotOutlined, LinkOutlined } from '@ant-design/icons'
import type { Message, SearchResult } from '../types'
import HighlightedText from './HighlightedText'

const { Text, Paragraph } = Typography

interface Props {
  message: Message
}

const ThinkingDots: React.FC = () => {
  const [dots, setDots] = useState('')
  useEffect(() => {
    const t = setInterval(() => setDots((s) => (s.length >= 3 ? '' : s + '.')), 400)
    return () => clearInterval(t)
  }, [])
  return <span style={{ fontSize: 20, letterSpacing: 2 }}>{dots}</span>
}

const ChatMessage: React.FC<Props> = ({ message }) => {
  const navigate = useNavigate()
  const isUser = message.role === 'user'

  let sources: SearchResult[] = []
  if (message.sources_json) {
    try {
      sources = JSON.parse(message.sources_json)
    } catch { /* ignore */ }
  }

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 20, padding: '0 20px' }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isUser ? '#1677ff' : '#52c41a',
          color: '#fff',
          flexShrink: 0,
        }}
      >
        {isUser ? <UserOutlined /> : <RobotOutlined />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
          {isUser ? '你' : 'AI 助手'}
        </Text>

        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
          {!isUser && message.content === '...' ? <ThinkingDots /> : message.content}
        </div>

        {sources.length > 0 && (
          <Collapse
            ghost
            size="small"
            items={[
              {
                key: 'sources',
                label: (
                  <Space size={4}>
                    <LinkOutlined />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {sources.length} 个来源
                    </Text>
                  </Space>
                ),
                children: sources.map((s, i) => (
                  <Card
                    key={i}
                    size="small"
                    style={{ marginBottom: 6, fontSize: 13 }}
                    title={
                      <Space>
                        <Text strong style={{ fontSize: 12 }}>来源 {i + 1}</Text>
                        <Tag
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/documents?collection_id=${(s as any).collection_id || ''}&document_id=${s.document_id}`)}
                        >
                          {s.filename || '未知'}
                        </Tag>
                      </Space>
                    }
                  >
                    <Paragraph
                      ellipsis={{ rows: 3, expandable: true }}
                      style={{ fontSize: 13, margin: 0 }}
                    >
                      <HighlightedText text={s.highlight_content || s.content} />
                    </Paragraph>
                  </Card>
                )),
              },
            ]}
          />
        )}
      </div>
    </div>
  )
}

export default ChatMessage
