import api from './client'
import type { SearchRequest, SearchResult } from '../types'

export const search = (data: SearchRequest) =>
  api
    .post<{ results: SearchResult[]; total: number }>('/search', data)
    .then((r) => r.data)
