import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

// Translation Dictionary
const texts = {
  ku: {
    session: 'سێشن',
    slide: 'سلاید',
    next: 'دواتر',
    prev: 'پێشتر',
    controller: 'پادی کۆنترۆڵ',
    laserOn: 'لێزەر چالاکە',
    laserOff: 'لێزەر ناچالاکە',
    dragHint: 'پەنجەت لێرە بجوڵێنە بۆ ئاماژەدان',
    activateHint: 'دۆخی لێزەر لە سەرەوە چالاک بکە',
    invalidLink: 'لینکی هەڵە. تکایە کیو ئاڕ کۆدەکە لەسەر شاشەکە سکان بکە.',
    switchLang: 'EN',
  },
  en: {
    session: 'Session',
    slide: 'Slide',
    next: 'NEXT',
    prev: 'PREV',
    controller: 'Controller Area',
    laserOn: 'Laser On',
    laserOff: 'Laser Off',
    dragHint: 'Drag your finger here to point',
    activateHint: 'Activate Laser Pointer mode above',
    invalidLink: 'Invalid link. Please scan the QR code on the presentation screen.',
    switchLang: 'کوردی',
  }
};

export default function MobileRemote() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [channel, setChannel] = useState<any>(null);
  const [isLaserActive, setIsLaserActive] = useState(false);
  
  // Set Kurdish as default language
  const [lang, setLang] = useState<'ku' | 'en'>('ku'); 
  const t = texts[lang];
  
  const trackpadRef = useRef<HTMLDivElement>(null);
  const lastSentTime = useRef<number>(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session');
    
    if (session) {
      setSessionId(session);
      const room = supabase.channel(`session_${session}`);
      room.subscribe();
      setChannel(room);
    }
  }, []);

  const updateSlide = async (newSlideNumber: number) => {
    if (!channel || newSlideNumber < 1) return;
    setCurrentSlide(newSlideNumber);
    await channel.send({
      type: 'broadcast',
      event: 'slide_change',
      payload: { slide: newSlideNumber },
    });
  };

  const handlePointerMove = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    if (!channel || !isLaserActive || !trackpadRef.current) return;

    const now = Date.now();
    if (now - lastSentTime.current < 16) return;
    lastSentTime.current = now;

    const rect = trackpadRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    let x = (clientX - rect.left) / rect.width;
    let y = (clientY - rect.top) / rect.height;

    // Flip the X coordinate for the desktop if the mobile is currently in RTL mode, 
    // so the physical direction of the finger matches the screen.
    if (lang === 'ku') {
       x = 1 - x;
    }

    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));

    channel.send({
      type: 'broadcast',
      event: 'laser_move',
      payload: { x, y, active: true },
    });
  };

  const stopLaser = () => {
    if (!channel || !isLaserActive) return;
    channel.send({
      type: 'broadcast',
      event: 'laser_move',
      payload: { x: 0, y: 0, active: false },
    });
  };

  if (!sessionId) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-900 text-white p-6 text-center" dir="rtl">
        <p>{texts.ku.invalidLink}</p>
      </div>
    );
  }

  return (
    // Apply dynamic direction: Right-to-Left for Kurdish, Left-to-Right for English
    <div dir={lang === 'ku' ? 'rtl' : 'ltr'} className="flex flex-col h-screen w-full bg-black text-white font-sans overflow-hidden select-none touch-manipulation">
      
      {/* HEADER */}
      <div className="flex justify-between items-center p-6 bg-gray-900 border-b border-gray-800">
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 uppercase tracking-wider">{t.session}</span>
          <span className="font-mono text-sm text-green-400">{sessionId}</span>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setLang(lang === 'ku' ? 'en' : 'ku')}
            className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
          >
            {t.switchLang}
          </button>
          <div className="bg-blue-600 px-4 py-2 rounded-full font-bold text-xl">
            {t.slide} {currentSlide}
          </div>
        </div>
      </div>

      {/* NAVIGATION BUTTONS */}
      <div className="p-6 grid grid-cols-2 gap-4">
        {/* We swap the visual order of buttons dynamically based on language direction */}
        <button 
          onClick={() => updateSlide(currentSlide - 1)}
          disabled={currentSlide === 1}
          className={`h-24 rounded-2xl flex items-center justify-center font-bold text-2xl ${
            currentSlide === 1 ? 'bg-gray-900 text-gray-700' : 'bg-gray-800 text-white active:scale-95 transition-transform'
          }`}
        >
          {t.prev}
        </button>
        <button 
          onClick={() => updateSlide(currentSlide + 1)}
          className="h-24 rounded-2xl bg-blue-600 font-bold text-white flex items-center justify-center text-3xl active:scale-95 transition-transform shadow-[0_0_20px_rgba(37,99,235,0.4)]"
        >
          {t.next}
        </button>
      </div>

      {/* TRACKPAD / LASER POINTER FIELD */}
      <div className="flex-1 px-6 pb-6 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400 font-semibold uppercase tracking-wider">{t.controller}</span>
          <button 
            onClick={() => {
              setIsLaserActive(!isLaserActive);
              if (isLaserActive) stopLaser();
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all tracking-wider ${
              isLaserActive ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-800 text-gray-400'
            }`}
          >
            {isLaserActive ? t.laserOn : t.laserOff}
          </button>
        </div>

        <div 
          ref={trackpadRef}
          onTouchMove={handlePointerMove}
          onMouseMove={handlePointerMove}
          onTouchEnd={stopLaser}
          onMouseLeave={stopLaser}
          className={`flex-1 w-full rounded-2xl border-2 flex items-center justify-center transition-colors relative cursor-crosshair ${
            isLaserActive 
              ? 'bg-gray-900/50 border-red-500/50' 
              : 'bg-gray-900/20 border-gray-800 pointer-events-none opacity-40'
          }`}
        >
          <p className="text-gray-500 text-sm pointer-events-none text-center px-4">
            {isLaserActive ? t.dragHint : t.activateHint}
          </p>
        </div>
      </div>
    </div>
  );
}
