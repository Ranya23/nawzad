import React, { useState, useEffect } from 'react';

export default function MobileRemote() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [isSending, setIsSending] = useState(false);

  // Your exact GAS URL
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbzBDSqTQIhasmBxibKtTGyUaPAmiHfxl1uuOlCJ8dON91iNogJRhskAbr8GtYNSRTba/exec';

  useEffect(() => {
    // Extract the session ID from the URL query parameters
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session');
    
    if (session) {
      setSessionId(session);
    } else {
      console.error('No session ID found in URL');
    }
  }, []);

  const updateSlide = async (newSlideNumber: number) => {
    if (!sessionId || isSending || newSlideNumber < 1) return;
    
    setIsSending(true);
    // Optimistically update the UI so it feels fast to the user
    setCurrentSlide(newSlideNumber);

    try {
      // Prepare the state payload. Later, we can add pointerX and pointerY here.
      const statePayload = JSON.stringify({
        slide: newSlideNumber,
        timestamp: Date.now()
      });

      const params = new URLSearchParams();
      params.append('action', 'updateState');
      params.append('sessionId', sessionId);
      params.append('state', statePayload);

      await fetch(GAS_URL, {
        method: 'POST',
        body: params,
      });
      
    } catch (error) {
      console.error('Failed to sync slide state:', error);
      // Revert if failed (optional, but good practice)
    } finally {
      setIsSending(false);
    }
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

      {/* MAIN CONTROLS */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        
        <button 
          onClick={() => updateSlide(currentSlide + 1)}
          disabled={isSending}
          className="w-full aspect-square max-h-64 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 active:scale-95 transition-all rounded-3xl flex flex-col items-center justify-center shadow-[0_8px_30px_rgb(37,99,235,0.3)]"
        >
          <svg className="w-20 h-20 text-white mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
          </svg>
          <span className="text-2xl font-bold uppercase tracking-widest text-blue-100">Next</span>
        </button>

        <button 
          onClick={() => updateSlide(currentSlide - 1)}
          disabled={isSending || currentSlide === 1}
          className={`w-full h-32 rounded-3xl flex items-center justify-center transition-all ${
            currentSlide === 1 
              ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
              : 'bg-gray-800 hover:bg-gray-700 active:bg-gray-900 active:scale-95 text-white'
          }`}
        >
          <svg className="w-10 h-10 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          <span className="text-xl font-semibold">Previous</span>
        </button>

      </div>

      {/* FOOTER / EXTRAS */}
      <div className="p-6 grid grid-cols-2 gap-4">
         <button className="bg-gray-900 py-4 rounded-xl flex justify-center items-center text-gray-400 active:bg-gray-800">
           {/* Placeholder for Laser Pointer toggle */}
           Laser Pointer
         </button>
         <button className="bg-gray-900 py-4 rounded-xl flex justify-center items-center text-gray-400 active:bg-gray-800">
           {/* Placeholder for Black Screen toggle */}
           Black Screen
         </button>
      </div>

    </div>
  );
}
