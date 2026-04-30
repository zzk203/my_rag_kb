import React, { useEffect } from 'react'
import { Layout } from 'antd'
import Sidebar from './Sidebar'
import { useAppStore } from '../store/appStore'

const { Sider, Content } = Layout

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const loadCollections = useAppStore((s) => s.loadCollections)

  useEffect(() => {
    loadCollections()
  }, [loadCollections])

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={280} theme="light" style={{ borderRight: '1px solid #f0f0f0', overflow: 'auto' }}>
        <Sidebar />
      </Sider>
      <Layout>
        <Content style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}

export default AppLayout
