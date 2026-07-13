import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProjectListPage from './routes/ProjectListPage'
import ProjectSettingsPage from './routes/ProjectSettingsPage'
import ReportListPage from './routes/ReportListPage'
import ReportEditorPage from './routes/ReportEditorPage'
import ReportPreviewPage from './routes/ReportPreviewPage'

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<ProjectListPage />} />
        <Route path="/projects/:projectId" element={<ReportListPage />} />
        <Route path="/projects/:projectId/settings" element={<ProjectSettingsPage />} />
        <Route path="/projects/:projectId/reports/:reportId" element={<ReportEditorPage />} />
        <Route path="/projects/:projectId/reports/:reportId/preview" element={<ReportPreviewPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
