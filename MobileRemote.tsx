import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

const texts = {
  ku: {
    session: 'سێشن', slide: 'سلاید', next: 'دواتر', prev: 'پێشتر',
    controller: 'پادی کۆنترۆڵ', laser: 'لێزەر', draw: 'کێشان',
    clear: 'سڕینەوە', timer: 'کات', switchLang: 'EN',
  },
  en: {
    session: 'Session', slide: 'Slide', next: 'NEXT', prev: 'PREV',
    controller: 'Controller Area', laser: 'Laser', draw: 'Draw',
    clear: 'Clear', timer: 'Time', switchLang: 'کوردی',
  }
};

export default function MobileRemote() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides] = useState(20); // Hardcoded max for thumbnail UI, update via channel if needed
  const [channel, setChannel] = useState<any>(null);
  
  // Modes: 'none', 'laser', 'draw'
  const [activeMode, setActiveMode] = useState<'none' | 'laser' | 'draw'>('none');
  const [lang, setLang] = useState<'ku' | 'en'>('ku'); 
  const t = texts[lang];
  
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const trackpadRef = useRef<HTMLDivElement>(null);
  const lastSentTime = useRef<number>(0);
  const isDrawing = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session');
    if (session) {
      setSessionId(session);
      const room = supabase.channel(`session_${session}`);
      room.subscribe();
      setChannel(room);
    }

    // Timer Logic
    const timer = setInterval(() => setSecondsElapsed(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const updateSlide = async (newSlideNumber: number) => {
    if (!channel || newSlideNumber < 1 || newSlideNumber > totalSlides) return;
    setCurrentSlide(newSlideNumber);
    // Auto-clear drawing when slide changes
    handleClear(); 
    await channel.send({
      type: 'broadcast',
      event: 'slide_change',
      payload: { slide: newSlideNumber },
    });
  };

  const sendPointerData = (e: React.TouchEvent | React.MouseEvent, type: 'start' | 'move' | 'end') => {
    if (!channel || activeMode === 'none' || !trackpadRef.current) return;

    const rect = trackpadRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    let x = (clientX - rect.left) / rect.width;
    let y = (clientY - rect.top) / rect.height;
    if (lang === 'ku') x = 1 - x;
    
    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));

    if (activeMode === 'laser') {
      const now = Date.now();
      if (now - lastSentTime.current < 16 && type === 'move') return;
      lastSentTime.current = now;
      
      channel.send({
        type: 'broadcast',
        event: 'laser_move',
        payload: { x, y, active: type !== 'end' },
      });
    } else if (activeMode === 'draw') {
      channel.send({
        type: 'broadcast',
        event: 'draw_stroke',
        payload: { x, y, type }, // 'start', 'move', or 'end'
      });
    }
  };

  const handleClear = () => {
    if (!channel) return;
    channel.send({ type: 'broadcast', event: 'draw_clear' });
  };

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    isDrawing.current = true;
    sendPointerData(e, 'start');
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing.current) return;
    sendPointerData(e, 'move');
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    isDrawing.current = false;
    sendPointerData(e, 'end');
  };

  if (!sessionId) return <div className="bg-black text-white p-6">Invalid Link.</div>;

  return (
    <div dir={lang === 'ku' ? 'rtl' : 'ltr'} className="flex flex-col h-screen w-full bg-black text-white font-sans select-none overflow-hidden">
      
      {/* HEADER w/ Timer */}
      <div className="flex justify-between items-center p-4 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="bg-gray-800 px-3 py-1 rounded text-red-400 font-mono text-xl shadow-inner">
            {formatTime(secondsElapsed)}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setLang(lang === 'ku' ? 'en' : 'ku')} className="bg-gray-800 px-3 py-1 rounded text-sm font-bold">
            {t.switchLang}
          </button>
          <div className="bg-blue-600 px-3 py-1 rounded-full font-bold">
            {t.slide} {currentSlide}
          </div>
        </div>
      </div>

      {/* THUMBNAIL / SLIDE NAVIGATOR (Horizontal Scroll) */}
      <div className="w-full bg-gray-900 border-b border-gray-800 p-2 overflow-x-auto flex gap-2 no-scrollbar" style={{ direction: 'ltr' }}>
        {Array.from({ length: totalSlides }).map((_, i) => (
          <button
            key={i}
            onClick={() => updateSlide(i + 1)}
            className={`min-w-[60px] h-12 rounded flex items-center justify-center font-bold text-sm transition-all ${
              currentSlide === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-500'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* BIG NAVIGATION BUTTONS */}
      <div className="p-4 grid grid-cols-2 gap-4">
        <button onClick={() => updateSlide(currentSlide - 1)} className="h-20 rounded-xl bg-gray-800 text-white text-xl font-bold active:bg-gray-700">
          {t.prev}
        </button>
        <button onClick={() => updateSlide(currentSlide + 1)} className="h-20 rounded-xl bg-blue-600 text-white text-xl font-bold shadow-lg active:bg-blue-700">
          {t.next}
        </button>
      </div>

      {/* TOOLS & TRACKPAD */}
      <div className="flex-1 px-4 pb-4 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-400 font-bold uppercase">{t.controller}</span>
          <div className="flex gap-2">
            <button onClick={() => setActiveMode(activeMode === 'laser' ? 'none' : 'laser')} 
              className={`px-3 py-1 rounded-full text-xs font-bold ${activeMode === 'laser' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
              {t.laser}
            </button>
            <button onClick={() => setActiveMode(activeMode === 'draw' ? 'none' : 'draw')} 
              className={`px-3 py-1 rounded-full text-xs font-bold ${activeMode === 'draw' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400'}`}>
              {t.draw}
            </button>
            {activeMode === 'draw' && (
              <button onClick={handleClear} className="px-3 py-1 rounded-full bg-gray-700 text-white text-xs font-bold">
                {t.clear}
              </button>
            )}
          </div>
        </div>

        <div 
          ref={trackpadRef}
          onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart} onMouseMove={handleTouchMove} onMouseUp={handleTouchEnd} onMouseLeave={handleTouchEnd}
          className={`flex-1 w-full rounded-2xl border-2 flex items-center justify-center transition-colors relative touch-none ${
            activeMode !== 'none' ? 'bg-gray-900/50 border-gray-600 cursor-crosshair' : 'bg-gray-900/20 border-gray-800 opacity-50'
          }`}
        >
        </div>
      </div>
    </div>
  );
}
