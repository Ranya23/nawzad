import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

export default function MobileRemote() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [channel, setChannel] = useState<any>(null);
  const [isLaserActive, setIsLaserActive] = useState(false);
  
  const trackpadRef = useRef<HTMLDivElement>(null);
  const lastSentTime = useRef<number>(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session');
    
    if (session) {
      setSessionId(session);
      
      const room = supabase.channel(`session_${session}`);
      room.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Mobile connected to Supabase Realtime!');
        }
      });
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

  // Tracks finger movement and converts coordinates to percentages
  const handlePointerMove = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    if (!channel || !isLaserActive || !trackpadRef.current) return;

    // Throttle messages to prevent crashing the connection (max 1 message per 16ms ~ 60fps)
    const now = Date.now();
    if (now - lastSentTime.current < 16) return;
    lastSentTime.current = now;

    const rect = trackpadRef.current.getBoundingClientRect();
    
    // Support both mouse dragging (for testing) and touch events
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    // Calculate position as a fraction of the trackpad space (0 to 1)
    let x = (clientX - rect.left) / rect.width;
    let y = (clientY - rect.top) / rect.height;

    // Clamp coordinates safely between 0% and 100%
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
      <div className="flex h-screen w-full items-center justify-center bg-gray-900 text-white p-6 text-center">
        <p>Invalid link. Please scan the QR code on the presentation screen.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-black text-white font-sans overflow-hidden select-none touch-manipulation">
      
      {/* HEADER */}
      <div className="flex justify-between items-center p-6 bg-gray-900 border-b border-gray-800">
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 uppercase tracking-wider">Session</span>
          <span className="font-mono text-sm text-green-400">{sessionId}</span>
        </div>
        <div className="bg-gray-800 px-4 py-2 rounded-full font-bold text-xl">
          Slide {currentSlide}
        </div>
      </div>

      {/* NAVIGATION BUTTONS */}
      <div className="p-6 grid grid-cols-2 gap-4">
        <button 
          onClick={() => updateSlide(currentSlide - 1)}
          disabled={currentSlide === 1}
          className={`h-24 rounded-2xl flex items-center justify-center font-bold ${
            currentSlide === 1 ? 'bg-gray-900 text-gray-700' : 'bg-gray-800 text-white active:scale-95 transition-transform'
          }`}
        >
          PREV
        </button>
        <button 
          onClick={() => updateSlide(currentSlide + 1)}
          className="h-24 rounded-2xl bg-blue-600 font-bold text-white flex items-center justify-center active:scale-95 transition-transform shadow-lg"
        >
          NEXT
        </button>
      </div>

      {/* TRACKPAD / LASER POINTER FIELD */}
      <div className="flex-1 px-6 pb-6 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400 font-semibold uppercase tracking-wider">Controller Area</span>
          <button 
            onClick={() => {
              setIsLaserActive(!isLaserActive);
              if (isLaserActive) stopLaser();
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all uppercase tracking-wider ${
              isLaserActive ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-800 text-gray-400'
            }`}
          >
            {isLaserActive ? 'Laser On' : 'Laser Off'}
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
            {isLaserActive ? 'Drag your finger here to point' : 'Activate Laser Pointer mode above'}
          </p>
        </div>
      </div>
    </div>
  );
}
