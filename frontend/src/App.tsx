import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import AppLayout from './components/AppLayout'
import ChatPage from './pages/ChatPage'
import DocumentPage from './pages/DocumentPage'
import CollectionPage from './pages/CollectionPage'

const App: React.FC = () => (
  <ConfigProvider locale={zhCN}>
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/documents" element={<DocumentPage />} />
          <Route path="/collections" element={<CollectionPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  </ConfigProvider>
)

export default App
