import React, { useState } from 'react'
import { Input, Button } from 'antd'
import { SendOutlined, CloseOutlined } from '@ant-design/icons'

const { TextArea } = Input

interface Props {
  onSend: (text: string) => void
  onStop?: () => void
  loading?: boolean
}

const ChatInput: React.FC<Props> = ({ onSend, onStop, loading }) => {
  const [text, setText] = useState('')

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    onSend(trimmed)
    setText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (loading) return
      handleSend()
    }
  }

  return (
    <div style={{ padding: '16px 20px', borderTop: '1px solid #f0f0f0', background: '#fff' }}>
      <div style={{ display: 'flex', gap: 8, maxWidth: 800, margin: '0 auto' }}>
        <TextArea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入问题，Enter 发送，Shift+Enter 换行"
          autoSize={{ minRows: 1, maxRows: 4 }}
          style={{ flex: 1 }}
        />
        {loading ? (
          <Button
            danger
            icon={<CloseOutlined />}
            onClick={onStop}
            style={{ alignSelf: 'flex-end' }}
          >
            停止
          </Button>
        ) : (
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            disabled={!text.trim()}
            style={{ alignSelf: 'flex-end' }}
          >
            发送
          </Button>
        )}
      </div>
    </div>
  )
}

export default ChatInput
