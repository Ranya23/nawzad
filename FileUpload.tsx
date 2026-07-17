import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. We imported the navigation tool

export default function FileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  
  // 2. We set up the navigation function
  const navigate = useNavigate();

  const GAS_URL = 'https://script.google.com/macros/s/AKfycbzBDSqTQIhasmBxibKtTGyUaPAmiHfxl1uuOlCJ8dON91iNogJRhskAbr8GtYNSRTba/exec';

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setMessage('Converting file to Base64...');

    const reader = new FileReader();
    
    reader.onload = async () => {
      const base64Data = (reader.result as string).split(',')[1];
      setMessage('Uploading to Google Drive...');
      
      try {
        const params = new URLSearchParams();
        params.append('action', 'upload');
        params.append('filename', file.name);
        params.append('mimeType', file.type);
        params.append('data', base64Data);

        const response = await fetch(GAS_URL, {
          method: 'POST',
          body: params,
        });

        const result = await response.json();
        
        if (result.status === 'success') {
          setMessage('Success! Starting presentation...');
          
          // 3. THIS IS THE MAGIC BRIDGE: 
          // Automatically send the user to the presentation screen with the new File ID
          navigate(`/present/${result.fileId}`);
          
        } else {
          setMessage(`Error: ${result.error}`);
        }
      } catch (error) {
        setMessage('Upload failed. Check the console for details.');
        console.error('Fetch error:', error);
      } finally {
        setIsUploading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto p-6 mt-20">
      <h1 className="text-3xl font-bold text-white mb-8 text-center">NextSlide Uploader</h1>
      <div className="w-full flex justify-center items-center h-64 border-2 border-dashed rounded-lg bg-gray-900 border-gray-600 hover:bg-gray-800 transition-colors">
        <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg className="w-12 h-12 mb-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <p className="mb-2 text-sm text-gray-400">
              <span className="font-semibold text-white">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">PDF ONLY for this version</p>
          </div>
          <input 
            type="file" 
            className="hidden" 
            onChange={handleFileUpload} 
            disabled={isUploading}
            accept=".pdf" 
          />
        </label>
      </div>
      
      {message && (
        <div className={`mt-6 p-4 w-full text-center rounded-xl font-bold text-sm ${
          message.includes('Success') ? 'bg-green-900 text-green-300' : 
          message.includes('Error') || message.includes('failed') ? 'bg-red-900 text-red-300' : 
          'bg-blue-900 text-blue-300 animate-pulse'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}
