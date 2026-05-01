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
  const [fileNames, setFileNames] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const filesRef = useRef<File[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      filesRef.current = Array.from(files)
      setFileNames(Array.from(files).map((f) => f.name))
    }
  }

  const handleUpload = async () => {
    const files = filesRef.current
    if (files.length === 0) return
    if (!collectionId) {
      antMsg.error('请先选择一个知识库')
      return
    }
    setUploading(true)
    let success = 0
    let fail = 0

    for (const file of files) {
      try {
        const doc = await uploadDocument(collectionId, file)
        if (doc.status === 'error') {
          fail++
          antMsg.error(`${file.name} 上传失败: ${doc.error_message || '未知错误'}`)
        } else {
          success++
        }
      } catch (err: any) {
        fail++
        antMsg.error(`${file.name} 上传失败: ${err.message || '未知错误'}`)
      }
    }

    filesRef.current = []
    setFileNames([])
    if (inputRef.current) inputRef.current.value = ''
    onSuccess?.()

    if (success > 0 && fail === 0) {
      antMsg.success(`成功上传 ${success} 个文件`)
    } else if (success > 0) {
      antMsg.warning(`上传完成: ${success} 成功, ${fail} 失败`)
    }
    setUploading(false)
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        ref={inputRef}
        type="file"
        multiple
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
      {fileNames.length === 1 && <span style={{ fontSize: 13, color: '#666' }}>{fileNames[0]}</span>}
      {fileNames.length > 1 && <span style={{ fontSize: 13, color: '#666' }}>已选 {fileNames.length} 个文件</span>}
      <Button
        type="primary"
        onClick={handleUpload}
        disabled={fileNames.length === 0 || disabled}
        loading={uploading}
      >
        上传
      </Button>
    </div>
  )
}

export default FileUpload
