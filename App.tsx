import { HashRouter, Routes, Route, useParams } from 'react-router-dom';
import PresentationView from './PresentationView';
import MobileRemote from './MobileRemote';
import FileUpload from './FileUpload';

// This is a helper component that grabs the fileId from the web address
function PresentationRoute() {
  const { fileId } = useParams();
  
  // We use a free CORS proxy (corsproxy.io) wrapped around the Google Drive download link.
  // This prevents your browser from blocking the PDF.js renderer.
  const pdfUrl = `https://corsproxy.io/?https://drive.google.com/uc?export=download&id=${fileId}`;
  
  return <PresentationView fileUrl={pdfUrl} />;
}

export default function App() {
  return (
    // We use HashRouter instead of BrowserRouter so GitHub Pages doesn't break your links
    <HashRouter>
      <div className="min-h-screen bg-black">
        <Routes>
          {/* 1. First screen the user sees */}
          <Route path="/" element={<FileUpload />} />
          
          {/* 2. The presentation screen it automatically navigates to */}
          <Route path="/present/:fileId" element={<PresentationRoute />} />
          
          {/* 3. The screen the phone opens when scanning the QR code */}
          <Route path="/remote" element={<MobileRemote />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
