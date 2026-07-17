import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Document, Page, pdfjs } from 'react-pdf';
import { supabase } from './supabaseClient'; // Make sure you created this file!
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Initialize the PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PresentationProps {
  fileUrl: string; 
}

export default function PresentationView({ fileUrl }: PresentationProps) {
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 9));
  const [currentSlide, setCurrentSlide] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const remoteUrl = `${window.location.origin}/remote?session=${sessionId}`;

  useEffect(() => {
    // Subscribe to a unique channel for this specific presentation session
    const channel = supabase.channel(`session_${sessionId}`);

    // Listen for 'slide_change' broadcast events from the phone
    channel
      .on('broadcast', { event: 'slide_change' }, (payload) => {
        console.log('Received slide change:', payload.payload.slide);
        setCurrentSlide(payload.payload.slide);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Connected to Supabase Realtime!');
        }
      });

    // Cleanup the subscription when the component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setError('Failed to load presentation. Check CORS settings or file URL.');
  };

  return (
    <div className="flex h-screen w-full bg-gray-900 text-white font-sans">
      
      {/* MAIN SLIDE AREA */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative bg-black">
        <div className="absolute top-4 left-4 bg-gray-800/80 px-4 py-2 rounded-lg text-sm font-semibold z-10 backdrop-blur-sm">
          Slide {currentSlide} {numPages && `of ${numPages}`}
        </div>
        
        <div className="w-full h-full flex items-center justify-center overflow-hidden">
          {error ? (
            <p className="text-red-400">{error}</p>
          ) : (
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              className="max-h-full max-w-full flex justify-center shadow-2xl"
              loading={<div className="animate-pulse text-gray-500">Loading document...</div>}
            >
              <Page 
                pageNumber={currentSlide} 
                renderTextLayer={false} 
                renderAnnotationLayer={false}
                height={window.innerHeight * 0.85} 
                className="rounded-xl overflow-hidden bg-white"
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
