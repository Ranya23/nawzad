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

const texts = {
  ku: {
    scan: 'سکان بکە بۆ کۆنترۆڵکردن',
    session: 'ئایدی سێشن',
    slide: 'سلاید',
    of: 'لە',
    loading: 'بەڵگەنامەکە دادەبەزێت...',
    errorLoad: 'نەتوانرا بەڵگەنامەکە بخرێتە ڕوو.',
    switchLang: 'English',
  },
  en: {
    scan: 'Scan to control presentation',
    session: 'Session ID',
    slide: 'Slide',
    of: 'of',
    loading: 'Loading content...',
    errorLoad: 'Failed to read document.',
    switchLang: 'کوردی',
  }
};

export default function PresentationView({ fileUrl }: PresentationProps) {
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 9));
  const [currentSlide, setCurrentSlide] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [laser, setLaser] = useState({ x: 0, y: 0, active: false });
  
  const [lang, setLang] = useState<'ku' | 'en'>('ku');
  const t = texts[lang];
  
  const remoteUrl = `${window.location.origin}/remote?session=${sessionId}`;

  useEffect(() => {
    const channel = supabase.channel(`session_${sessionId}`);

    channel.on('broadcast', { event: 'slide_change' }, (payload) => {
      setCurrentSlide(payload.payload.slide);
    });

    channel.on('broadcast', { event: 'laser_move' }, (payload) => {
      setLaser({
        x: payload.payload.x,
        y: payload.payload.y,
        active: payload.payload.active
      });
    });

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setError(null);
  };

  return (
    <div dir={lang === 'ku' ? 'rtl' : 'ltr'} className="flex h-screen w-full bg-gray-900 text-white font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <div className="w-80 bg-gray-800 border-x border-gray-700 p-6 flex flex-col items-center justify-between z-20 shadow-xl">
        <div className="w-full flex justify-end">
          <button 
            onClick={() => setLang(lang === 'ku' ? 'en' : 'ku')}
            className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded transition-colors"
          >
            {t.switchLang}
          </button>
        </div>

        <div className="w-full flex flex-col items-center">
          <h2 className="text-3xl font-bold mb-2 tracking-tight">NextSlide</h2>
          <p className="text-sm text-gray-400 text-center mb-8">{t.scan}</p>
          
          <div className="bg-white p-4 rounded-xl shadow-lg mb-6">
            <QRCodeSVG value={remoteUrl} size={180} level="H" />
          </div>
        </div>
        
        <div className="w-full text-center bg-gray-900 rounded-xl p-4 border border-gray-700">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{t.session}</p>
          <p className="font-mono text-2xl font-bold text-blue-400 tracking-wider">{sessionId}</p>
        </div>
      </div>

      {/* MAIN SLIDE AREA */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative bg-black">
        <div className="absolute top-4 right-4 bg-gray-800/80 px-4 py-2 rounded-lg text-sm font-semibold z-10 backdrop-blur-sm" dir="rtl">
          {t.slide} {currentSlide} {numPages && `${t.of} ${numPages}`}
        </div>
        
        <div className="relative max-h-full max-w-full flex justify-center shadow-2xl rounded-xl overflow-hidden bg-white">
          {error ? (
            <p className="text-red-400 p-8 bg-gray-900">{t.errorLoad}</p>
          ) : (
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={() => setError(t.errorLoad)}
              loading={<div className="animate-pulse text-gray-500 p-12">{t.loading}</div>}
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
                transform: 'translate(-50%, -50%)',
              }}
            />
          )}
        </div>
      </div>

    </div>
  );
}
