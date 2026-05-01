import api from './client'
import type { Document, Chunk } from '../types'

export const uploadDocument = (collectionId: number, file: File, tags?: string) => {
  const fd = new FormData()
  fd.append('file', file)
  if (tags) fd.append('tags', tags)
  return api
    .post<Document>(`/documents/upload/${collectionId}`, fd)
    .then((r) => r.data)
}

export const getDocuments = (params?: { collection_id?: number; status?: string }) =>
  api.get<Document[]>('/documents', { params }).then((r) => r.data)

export const deleteDocument = (id: number) =>
  api.delete(`/documents/${id}`).then((r) => r.data)

export const reindexDocument = (id: number) =>
  api.post(`/documents/${id}/reindex`).then((r) => r.data)

export const getDocumentChunks = (id: number) =>
  api.get<Chunk[]>(`/documents/${id}/chunks`).then((r) => r.data)

export const getDocumentDownloadUrl = (id: number) =>
  `/api/v1/documents/${id}/download`
