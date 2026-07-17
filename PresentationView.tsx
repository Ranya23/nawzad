import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// We assume this component receives the fileId from the FileUpload component
export default function PresentationView({ fileId }: { fileId: string }) {
  // Generate a random 7-character session ID when the presentation starts
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 9));
  const [currentSlide, setCurrentSlide] = useState(1);
  
  // Your exact GAS URL
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbzBDSqTQIhasmBxibKtTGyUaPAmiHfxl1uuOlCJ8dON91iNogJRhskAbr8GtYNSRTba/exec';
  
  // The URL the phone will open. (Assumes you have a /remote route set up)
  // In production, change 'window.location.origin' to your GitHub Pages URL
  const remoteUrl = `${window.location.origin}/remote?session=${sessionId}`;

  useEffect(() => {
    // Poll the GAS backend every 1.5 seconds to check for phone commands
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${GAS_URL}?action=getState&sessionId=${sessionId}`);
        const data = await response.json();
        
        if (data && data.slide && data.slide !== currentSlide) {
          setCurrentSlide(data.slide);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 1500);

    return () => clearInterval(pollInterval);
  }, [sessionId, currentSlide]);

  return (
    <div className="flex h-screen w-full bg-gray-900 text-white font-sans">
      
      {/* MAIN SLIDE AREA */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
        <div className="absolute top-4 left-4 bg-gray-800 px-4 py-2 rounded-lg text-sm font-semibold">
          Slide: {currentSlide}
        </div>
        
        {/* 
          NOTE ON RENDERING: 
          For a quick serverless setup, we use Google Drive's native iframe. 
          However, you cannot programmatically change pages inside a Drive iframe due to security rules. 
          To make the slide actually change when `currentSlide` updates, you will eventually 
          need to render the file using PDF.js or standard <img> tags instead of an iframe.
        */}
        <div className="w-full max-w-5xl aspect-video bg-gray-800 rounded-xl overflow-hidden shadow-2xl border border-gray-700 flex items-center justify-center">
          {fileId ? (
            <iframe 
              src={`https://drive.google.com/file/d/${fileId}/preview`} 
              className="w-full h-full border-0"
              title="Presentation Slide"
              allowFullScreen
            />
          ) : (
            <p className="text-gray-400">Loading presentation canvas...</p>
          )}
        </div>
      </div>

      {/* SIDEBAR: QR CODE & SESSION INFO */}
      <div className="w-80 bg-gray-800 border-l border-gray-700 p-6 flex flex-col items-center justify-between">
        <div className="w-full flex flex-col items-center">
          <h2 className="text-xl font-bold mb-2">NextSlide Remote</h2>
          <p className="text-sm text-gray-400 text-center mb-8">
            Scan this QR code with your phone to control the presentation.
          </p>
          
          <div className="bg-white p-4 rounded-xl shadow-lg mb-6">
            <QRCodeSVG value={remoteUrl} size={180} />
          </div>
          
          <div className="w-full bg-gray-900 p-4 rounded-lg text-center font-mono text-sm break-all text-blue-400">
            {remoteUrl}
          </div>
        </div>
        
        <div className="w-full text-center">
          <p className="text-xs text-gray-500 uppercase tracking-widest">Session ID</p>
          <p className="font-mono text-lg font-bold">{sessionId}</p>
        </div>
      </div>

    </div>
  );
}
