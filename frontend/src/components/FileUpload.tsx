import React, { useState } from 'react'
import { Upload, message as antMsg, Button } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd'
import { uploadDocument } from '../api/documents'

interface Props {
  collectionId: number
  onSuccess?: () => void
  disabled?: boolean
}

const FileUpload: React.FC<Props> = ({ collectionId, onSuccess, disabled }) => {
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)

  const handleUpload = async () => {
    const file = fileList[0]?.originFileObj
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
      setFileList([])
      onSuccess?.()
    } catch (err: any) {
      antMsg.error(err.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const props: UploadProps = {
    fileList,
    beforeUpload: (file) => {
      setFileList([file])
      return false
    },
    onRemove: () => setFileList([]),
    maxCount: 1,
    accept: '.pdf,.docx,.pptx,.md,.txt,.html,.htm,.png,.jpg,.jpeg',
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Upload {...props} disabled={disabled}>
        <Button icon={<UploadOutlined />} disabled={disabled}>
          选择文件
        </Button>
      </Upload>
      <Button
        type="primary"
        onClick={handleUpload}
        disabled={fileList.length === 0 || disabled}
        loading={uploading}
      >
        上传
      </Button>
    </div>
  )
}

export default FileUpload
