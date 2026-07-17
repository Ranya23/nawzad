import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Document, Page, pdfjs } from 'react-pdf';
import { supabase } from './supabaseClient';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PresentationProps {
  fileUrl: string; 
}

export default function PresentationView({ fileUrl }: PresentationProps) {
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 9));
  const [currentSlide, setCurrentSlide] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // State to hold live laser coordinates
  const [laser, setLaser] = useState({ x: 0, y: 0, active: false });
  
  const remoteUrl = `${window.location.origin}/remote?session=${sessionId}`;

  useEffect(() => {
    const channel = supabase.channel(`session_${sessionId}`);

    // Listen for Slide Changes
    channel.on('broadcast', { event: 'slide_change' }, (payload) => {
      setCurrentSlide(payload.payload.slide);
    });

    // Listen for Laser Pointer coordinates
    channel.on('broadcast', { event: 'laser_move' }, (payload) => {
      setLaser({
        x: payload.payload.x,
        y: payload.payload.y,
        active: payload.payload.active
      });
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setError(null);
  };

  return (
    <div className="flex h-screen w-full bg-gray-900 text-white font-sans overflow-hidden">
      
      {/* MAIN SLIDE AREA */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative bg-black">
        <div className="absolute top-4 left-4 bg-gray-800/80 px-4 py-2 rounded-lg text-sm font-semibold z-10 backdrop-blur-sm">
          Slide {currentSlide} {numPages && `of ${numPages}`}
        </div>
        
        {/* Relative wrapper holding the PDF canvas and our custom overlays */}
        <div className="relative max-h-full max-w-full flex justify-center shadow-2xl rounded-xl overflow-hidden bg-white">
          {error ? (
            <p className="text-red-400 p-8 bg-gray-900">{error}</p>
          ) : (
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={() => setError('Failed to read document.')}
              loading={<div className="animate-pulse text-gray-500 p-12">Loading content...</div>}
            >
              <Page 
                pageNumber={currentSlide} 
                renderTextLayer={false} 
                renderAnnotationLayer={false}
                height={window.innerHeight * 0.85} 
              />
            </Document>
          )}

          {/* REAL-TIME LASER POINTER OVERLAY */}
          {laser.active && (
            <div 
              className="absolute pointer-events-none z-50 transition-all duration-75 ease-out rounded-full bg-red-500 shadow-[0_0_12px_#ef4444,0_0_24px_#ef4444]"
              style={{
                width: '14px',
                height: '14px',
                left: `${laser.x * 100}%`,
                top: `${laser.y * 100}%`,
                transform: 'translate(-50%, -50%)', // Center the dot on the pointer coordinate
              }}
            />
          )}
        </div>
      </div>

      {/* SIDEBAR */}
      <div className="w-80 bg-gray-800 border-l border-gray-700 p-6 flex flex-col items-center justify-between z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
        <div className="w-full flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-2">NextSlide</h2>
          <p className="text-sm text-gray-400 text-center mb-8">Scan to control presentation</p>
          
          <div className="bg-white p-4 rounded-xl shadow-lg mb-6">
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
