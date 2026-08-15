import { Navigate, Route, Routes } from 'react-router';

import { AppShell } from './components/AppShell.js';
import { ProjectCenter } from './features/projects/ProjectCenter.js';
import { ProjectMaterials } from './features/materials/ProjectMaterials.js';
import { RecycleBin } from './features/recycle/RecycleBin.js';
import { TermsWorkspace } from './features/terms/TermsWorkspace.js';
import { UploadQueue } from './features/uploads/UploadQueue.js';
import { AsrWorkspace } from './features/asr/AsrWorkspace.js';
import { AsrDispatches } from './features/asr-dispatch/AsrDispatches.js';
import { PreReviewWorkspace } from './features/pre-review/PreReviewWorkspace.js';
import { ScreenTextWorkspace } from './features/screen-text/ScreenTextWorkspace.js';

export const App = () => (
  <AppShell>
    <Routes>
      <Route path="/projects" element={<ProjectCenter />} />
      <Route path="/projects/:projectId/materials" element={<ProjectMaterials />} />
      <Route path="/projects/:projectId/terms" element={<TermsWorkspace />} />
      <Route path="/projects/:projectId/asr" element={<AsrWorkspace />} />
      <Route path="/projects/:projectId/screen-text" element={<ScreenTextWorkspace />} />
      <Route path="/projects/:projectId/pre-review" element={<PreReviewWorkspace />} />
      <Route path="/uploads" element={<UploadQueue />} />
      <Route path="/recycle-bin" element={<RecycleBin />} />
      <Route path="/asr-dispatches" element={<AsrDispatches />} />
      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  </AppShell>
);
