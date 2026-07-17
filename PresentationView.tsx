import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Initialize the PDF.js worker (Required)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PresentationProps {
  // Pass the raw download URL returned from your GAS upload script
  fileUrl: string; 
}

export default function PresentationView({ fileUrl }: PresentationProps) {
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 9));
  const [currentSlide, setCurrentSlide] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Your GAS URL
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbzBDSqTQIhasmBxibKtTGyUaPAmiHfxl1uuOlCJ8dON91iNogJRhskAbr8GtYNSRTba/exec';
  const remoteUrl = `${window.location.origin}/remote?session=${sessionId}`;

  // Poll GAS for slide changes
  useEffect(() => {
    // 1000ms polling is a good balance between responsiveness and not overwhelming GAS quota
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${GAS_URL}?action=getState&sessionId=${sessionId}`);
        const data = await response.json();
        
        if (data && data.slide && data.slide !== currentSlide) {
          // If the phone sends a command, update the local state to change the page
          setCurrentSlide(data.slide);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [sessionId, currentSlide]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setError('Failed to load presentation. Ensure the Google Drive file is accessible.');
  };

  return (
    <div className="flex h-screen w-full bg-gray-900 text-white font-sans">
      
      {/* MAIN SLIDE AREA */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative bg-black">
        
        {/* Slide Counter Overlay */}
        <div className="absolute top-4 left-4 bg-gray-800/80 px-4 py-2 rounded-lg text-sm font-semibold z-10 backdrop-blur-sm">
          Slide {currentSlide} {numPages && `of ${numPages}`}
        </div>
        
        {/* PDF Render Canvas */}
        <div className="w-full h-full flex items-center justify-center overflow-hidden">
          {error ? (
            <p className="text-red-400">{error}</p>
          ) : (
            <Document
              file={fileUrl} // Pass the Drive download URL here
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              className="max-h-full max-w-full flex justify-center shadow-2xl"
              loading={<div className="animate-pulse text-gray-500">Loading document...</div>}
            >
              {/* The Page component redraws automatically when currentSlide changes */}
              <Page 
                pageNumber={currentSlide} 
                renderTextLayer={false} 
                renderAnnotationLayer={false}
                // Automatically scale the page to fit the screen height, minus padding
                height={window.innerHeight * 0.85} 
                className="rounded-xl overflow-hidden"
              />
            </Document>
          )}
        </div>
      </div>

      {/* SIDEBAR: QR CODE & SESSION INFO */}
      <div className="w-80 bg-gray-800 border-l border-gray-700 p-6 flex flex-col items-center justify-between z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
        <div className="w-full flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-2">NextSlide</h2>
          <p className="text-sm text-gray-400 text-center mb-8">
            Scan to control presentation
          </p>
          
          <div className="bg-white p-4 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] mb-6 transition-transform hover:scale-105">
            <QRCodeSVG value={remoteUrl} size={200} level="H" />
          </div>
        </div>
        
        <div className="w-full text-center bg-gray-900 rounded-xl p-4 border border-gray-700">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Session ID</p>
          <p className="font-mono text-xl font-bold text-blue-400 tracking-wider">{sessionId}</p>
        </div>
      </div>

    </div>
  );
}
