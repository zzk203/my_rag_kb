import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 120000,
})

function extractError(err: any): string {
  const detail = err.response?.data?.detail
  if (Array.isArray(detail)) {
    return detail.map((d: any) => d.msg || String(d)).join('; ')
  }
  if (typeof detail === 'string') return detail
  return err.message || '请求失败'
}

api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(new Error(extractError(err))),
)

export default api
