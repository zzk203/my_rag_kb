import React, { useRef, useState } from 'react'
import { Button, message as antMsg } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { uploadDocument } from '../api/documents'

interface Props {
  collectionId: number
  onSuccess?: () => void
  disabled?: boolean
}

const FileUpload: React.FC<Props> = ({ collectionId, onSuccess, disabled }) => {
  const [fileName, setFileName] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      fileRef.current = file
      setFileName(file.name)
    }
  }

  const handleUpload = async () => {
    const file = fileRef.current
    if (!file) return
    if (!collectionId) {
      antMsg.error('请先选择一个知识库')
      return
    }
    setUploading(true)
    try {
      const doc = await uploadDocument(collectionId, file)
      if (doc.status === 'error') {
        antMsg.error(`${file.name} 上传失败: ${doc.error_message || '未知错误'}`)
      } else {
        antMsg.success(`${file.name} 上传成功`)
      }
      fileRef.current = null
      setFileName(null)
      if (inputRef.current) inputRef.current.value = ''
      onSuccess?.()
    } catch (err: any) {
      antMsg.error(err.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        ref={inputRef}
        type="file"
        hidden
        onChange={handleFileChange}
        accept=".pdf,.docx,.pptx,.md,.txt,.html,.htm,.png,.jpg,.jpeg"
      />
      <Button
        icon={<UploadOutlined />}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        选择文件
      </Button>
      {fileName && <span style={{ fontSize: 13, color: '#666' }}>{fileName}</span>}
      <Button
        type="primary"
        onClick={handleUpload}
        disabled={!fileRef.current || disabled}
        loading={uploading}
      >
        上传
      </Button>
    </div>
  )
}

export default FileUpload
