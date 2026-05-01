import axios from 'axios'

const USER_MESSAGES: Record<string, string> = {
  'Collection not found': '知识库不存在，可能已被删除',
  'Document not found': '文档不存在，可能已被删除',
  'Conversation not found': '对话不存在，可能已被删除',
  'Document is being indexed, please wait': '文档正在索引中，请等待处理完成',
  'Document is currently being indexed, please wait': '文档正在索引中，请等待处理完成',
  'Empty document after parsing': '文件内容为空，无法解析',
  'Unsupported file type': '不支持该文件类型，请上传 PDF/DOCX/PPTX/MD/TXT/HTML/图片',
  'must be a valid email': '邮箱格式不正确',
  'field required': '请填写必填字段',
  'none is not an allowed value': '该字段不能为空',
  'value is not a valid dict': '数据格式错误',
  'too many values to unpack': '数据格式异常',
  'string too short': '输入内容太短',
  'string too long': '输入内容太长',
  'Network Error': '网络连接失败，请确认后端服务是否启动',
  'timeout of': '请求超时，请检查网络或后端状态',
  'connect ECONNREFUSED': '后端服务未启动，请先启动后端',
  'connect ETIMEDOUT': '连接后端超时，请检查网络',
  'Request failed with status code 500': '服务器内部错误，请稍后重试',
  'Request failed with status code 502': '后端服务暂不可用，请稍后重试',
  'Request failed with status code 503': '后端服务暂不可用，请稍后重试',
  'Request failed with status code 504': '网关超时，请稍后重试',
}

function normalizeMessage(msg: string): string {
  for (const [key, val] of Object.entries(USER_MESSAGES)) {
    if (msg.includes(key)) return val
  }
  return msg
}

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 120000,
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const detail = err.response?.data?.detail

    if (err.code === 'ERR_CANCELED') return Promise.reject(err)

    if (status === 422) {
      return Promise.reject(new Error('输入数据格式有误，请检查后重试'))
    }
    if (status === 404) {
      const msg = typeof detail === 'string' ? detail : ''
      return Promise.reject(new Error(normalizeMessage(msg || '请求的资源不存在')))
    }
    if (status === 409) {
      const msg = typeof detail === 'string' ? detail : ''
      return Promise.reject(new Error(normalizeMessage(msg || '操作冲突，请稍后重试')))
    }
    if (status && status >= 500) {
      return Promise.reject(new Error('服务器内部错误，请稍后重试'))
    }
    if (status === 401) return Promise.reject(new Error('认证已过期，请重新登录'))
    if (status === 403) return Promise.reject(new Error('没有权限执行此操作'))

    if (typeof detail === 'string') {
      return Promise.reject(new Error(normalizeMessage(detail)))
    }
    if (Array.isArray(detail)) {
      const msgs = detail.map((d: any) => d.msg || String(d)).filter(Boolean)
      const msg = msgs.length > 0 ? normalizeMessage(msgs[0]) : '输入数据格式有误'
      return Promise.reject(new Error(msg))
    }

    return Promise.reject(new Error(normalizeMessage(err.message || '操作失败，请稍后重试')))
  },
)

export default api
