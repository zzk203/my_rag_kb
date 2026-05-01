import api from './client'
import type { ChatRequest, ChatResponse, Conversation, Message } from '../types'

export const chat = (data: ChatRequest) =>
  api.post<ChatResponse>('/chat', data).then((r) => r.data)

export const getConversations = (collectionId?: number) =>
  api
    .get<Conversation[]>('/chat/conversations', {
      params: collectionId ? { collection_id: collectionId } : {},
    })
    .then((r) => r.data)

export const getConversationMessages = (id: number) =>
  api.get<Message[]>(`/chat/conversations/${id}`).then((r) => r.data)

export const deleteConversation = (id: number) =>
  api.delete(`/chat/conversations/${id}`).then((r) => r.data)

export const renameConversation = (id: number, title: string) =>
  api.put(`/chat/conversations/${id}`, { title }).then((r) => r.data)
