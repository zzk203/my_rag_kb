import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Typography, Empty, message as antMsg } from 'antd'
import ChatMessage from '../components/ChatMessage'
import ChatInput from '../components/ChatInput'
import { useAppStore } from '../store/appStore'
import { chat as chatApi } from '../api/chat'
import type { Message as MessageType } from '../types'

const { Text } = Typography
const THINKING_ID = -1

const ChatPage: React.FC = () => {
  const currentCollectionId = useAppStore((s) => s.currentCollectionId)
  const currentConversationId = useAppStore((s) => s.currentConversationId)
  const messages = useAppStore((s) => s.messages)
  const addMessage = useAppStore((s) => s.addMessage)
  const replaceMessage = useAppStore((s) => s.replaceMessage)
  const removeMessage = useAppStore((s) => s.removeMessage)
  const loadConversations = useAppStore((s) => s.loadConversations)
  const setCurrentConversation = useAppStore((s) => s.setCurrentConversation)

  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    removeMessage(THINKING_ID)
    setLoading(false)
  }, [removeMessage])

  const handleSend = useCallback(
    async (query: string) => {
      if (!currentCollectionId) {
        antMsg.warning('请先选择知识库')
        return
      }

      const userMsg: MessageType = {
        id: Date.now(),
        conversation_id: currentConversationId || 0,
        role: 'user',
        content: query,
        created_at: new Date().toISOString(),
      }
      addMessage(userMsg)
      removeMessage(THINKING_ID)

      const thinkingMsg: MessageType = {
        id: THINKING_ID,
        conversation_id: currentConversationId || 0,
        role: 'assistant',
        content: '...',
        created_at: new Date().toISOString(),
      }
      addMessage(thinkingMsg)
      setLoading(true)

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await chatApi({
          query,
          collection_id: currentCollectionId,
          conversation_id: currentConversationId,
          top_k: 5,
        }, controller.signal)

        if (!currentConversationId) {
          setCurrentConversation(res.conversation_id)
          await loadConversations()
        }

        const assistantMsg: MessageType = {
          id: res.message_id,
          conversation_id: res.conversation_id,
          role: 'assistant',
          content: res.answer || '(无回答)',
          sources_json: JSON.stringify(res.sources),
          created_at: new Date().toISOString(),
        }
        replaceMessage(THINKING_ID, assistantMsg)
      } catch (err: any) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
        removeMessage(THINKING_ID)
        antMsg.error(err.message || '请求失败')
      } finally {
        setLoading(false)
        abortRef.current = null
      }
    },
    [
      currentCollectionId,
      currentConversationId,
      addMessage,
      replaceMessage,
      removeMessage,
      setCurrentConversation,
      loadConversations,
    ],
  )

  if (!currentCollectionId) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description="请从左侧选择一个知识库开始问答" />
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px 0',
          maxWidth: 800,
          width: '100%',
          margin: '0 auto',
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Text type="secondary" style={{ fontSize: 16 }}>
              开始提问，AI 将基于你的知识库回答
            </Text>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={handleSend} onStop={handleStop} loading={loading} />
    </div>
  )
}

export default ChatPage
