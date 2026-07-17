import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Document, Page, pdfjs } from 'react-pdf';
import { supabase } from './supabaseClient';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const texts = {
  ku: { scan: 'سکان بکە', session: 'سێشن', slide: 'سلاید', switchLang: 'EN', loading: 'دەکرێتەوە...', error: 'هەڵە' },
  en: { scan: 'Scan to control', session: 'Session', slide: 'Slide', switchLang: 'کوردی', loading: 'Loading...', error: 'Error' }
};

export default function PresentationView({ fileUrl }: { fileUrl: string }) {
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 9));
  const [currentSlide, setCurrentSlide] = useState(1);
  const [laser, setLaser] = useState({ x: 0, y: 0, active: false });
  const [lang, setLang] = useState<'ku' | 'en'>('ku');
  const t = texts[lang];
  
  // Refs for drawing
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    // Setup drawing canvas context
    if (canvasRef.current && wrapperRef.current) {
      const canvas = canvasRef.current;
      // Match canvas size to the container size
      canvas.width = wrapperRef.current.clientWidth;
      canvas.height = wrapperRef.current.clientHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#eab308'; // Tailwind Yellow-500
        ctxRef.current = ctx;
      }
    }

    const channel = supabase.channel(`session_${sessionId}`);

    channel.on('broadcast', { event: 'slide_change' }, (payload) => {
      setCurrentSlide(payload.payload.slide);
      // Auto clear canvas on slide change
      if (ctxRef.current && canvasRef.current) {
        ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    });

    channel.on('broadcast', { event: 'laser_move' }, (payload) => {
      setLaser({ x: payload.payload.x, y: payload.payload.y, active: payload.payload.active });
    });

    // Handle Drawing Events from Supabase
    channel.on('broadcast', { event: 'draw_stroke' }, (payload) => {
      const ctx = ctxRef.current;
      const canvas = canvasRef.current;
      if (!ctx || !canvas) return;

      // Convert percentage coordinates back to exact canvas pixels
      const pxX = payload.payload.x * canvas.width;
      const pxY = payload.payload.y * canvas.height;

      if (payload.payload.type === 'start') {
        ctx.beginPath();
        ctx.moveTo(pxX, pxY);
      } else if (payload.payload.type === 'move') {
        ctx.lineTo(pxX, pxY);
        ctx.stroke();
      } else if (payload.payload.type === 'end') {
        ctx.closePath();
      }
    });

    channel.on('broadcast', { event: 'draw_clear' }, () => {
      if (ctxRef.current && canvasRef.current) {
        ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    });

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  return (
    <div dir={lang === 'ku' ? 'rtl' : 'ltr'} className="flex h-screen w-full bg-gray-900 text-white overflow-hidden">
      
      {/* SIDEBAR */}
      <div className="w-80 bg-gray-800 border-x border-gray-700 p-6 flex flex-col items-center justify-between z-20">
        <button onClick={() => setLang(lang === 'ku' ? 'en' : 'ku')} className="self-end text-xs bg-gray-700 px-3 py-1 rounded">
          {t.switchLang}
        </button>
        <div className="w-full flex flex-col items-center">
          <h2 className="text-3xl font-bold mb-2">NextSlide</h2>
          <p className="text-sm text-gray-400 mb-8">{t.scan}</p>
          <div className="bg-white p-4 rounded-xl mb-6"><QRCodeSVG value={`${window.location.origin}/remote?session=${sessionId}`} size={180} /></div>
        </div>
        <div className="w-full text-center bg-gray-900 rounded p-4 border border-gray-700">
          <p className="text-xs text-gray-500 mb-1">{t.session}</p>
          <p className="font-mono text-2xl text-blue-400">{sessionId}</p>
        </div>
      </div>

      {/* SLIDE AREA */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-black">
        <div className="absolute top-4 right-4 bg-gray-800/80 px-4 py-2 rounded z-10">
          {t.slide} {currentSlide}
        </div>
        
        {/* PDF & CANVAS CONTAINER */}
        <div ref={wrapperRef} className="relative flex justify-center bg-white rounded-xl shadow-2xl overflow-hidden" style={{ height: window.innerHeight * 0.85 }}>
          
          <Document file={fileUrl} loading={<div className="p-12 text-black">{t.loading}</div>}>
            <Page pageNumber={currentSlide} renderTextLayer={false} renderAnnotationLayer={false} height={window.innerHeight * 0.85} />
          </Document>

          {/* DRAWING CANVAS (Transparent overlay) */}
          <canvas 
            ref={canvasRef} 
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-30"
          />

          {/* LASER DOT */}
          {laser.active && (
            <div 
              className="absolute pointer-events-none z-40 rounded-full bg-red-500 shadow-[0_0_12px_#ef4444]"
              style={{ width: '14px', height: '14px', left: `${laser.x * 100}%`, top: `${laser.y * 100}%`, transform: 'translate(-50%, -50%)' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
