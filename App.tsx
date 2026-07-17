import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PresentationView from './PresentationView';
import MobileRemote from './MobileRemote';
import FileUpload from './FileUpload';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* The main flow: Upload -> Desktop Presentation */}
        <Route path="/" element={<FileUpload />} />
        <Route path="/present/:fileId" element={<PresentationView fileId="dynamic_id_here" />} />
        
        {/* The remote control flow */}
        <Route path="/remote" element={<MobileRemote />} />
      </Routes>
    </BrowserRouter>
  );
}
