import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ChatPage } from './pages/ChatPage'
import { MonitorPage } from './pages/MonitorPage'
import { PersonalityPage } from './pages/PersonalityPage'
import { RelationshipPage } from './pages/RelationshipPage'
import { MemoryPage } from './pages/MemoryPage'
import { SocialPage } from './pages/SocialPage'
import { LogsPage } from './pages/LogsPage'
import { SettingsPage } from './pages/SettingsPage'
import { HistoryPage } from './pages/HistoryPage'
// 拟人化页面
import { IntentPage } from './pages/IntentPage'
import { DesirePage } from './pages/DesirePage'
import { CognitionPage } from './pages/CognitionPage'
import { NarrativePage } from './pages/NarrativePage'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ChatPage />} />
          <Route path="/monitor" element={<MonitorPage />} />
          <Route path="/personality" element={<PersonalityPage />} />
          <Route path="/relationship" element={<RelationshipPage />} />
          <Route path="/memory" element={<MemoryPage />} />
          <Route path="/social" element={<SocialPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          {/* 拟人化系统路由 */}
          <Route path="/intent" element={<IntentPage />} />
          <Route path="/desires" element={<DesirePage />} />
          <Route path="/cognition" element={<CognitionPage />} />
          <Route path="/narrative" element={<NarrativePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
