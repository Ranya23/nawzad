import React, { useState } from 'react';

export default function FileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');

  // ⚠️ Replace this with your actual Google Apps Script Web App URL
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbzBDSqTQIhasmBxibKtTGyUaPAmiHfxl1uuOlCJ8dON91iNogJRhskAbr8GtYNSRTba/exec';

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setMessage('Converting file to Base64...');

    const reader = new FileReader();
    
    reader.onload = async () => {
      // Strip the data URL prefix to get raw base64
      const base64Data = (reader.result as string).split(',')[1];

      setMessage('Uploading to Google Drive...');
      
      try {
        // GAS reads POST variables best when sent as URL-encoded parameters
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
          setMessage('Success! Presentation ready.');
          console.log('File ID:', result.fileId);
          console.log('View URL:', result.viewUrl);
          
          // Next step: Save this fileId to your state/context to start the presentation
          
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
    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto p-6">
      <div className="w-full flex justify-center items-center h-64 border-2 border-dashed rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-100 transition-colors">
        <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">PDF, PNG, JPG, or MP4</p>
          </div>
          <input 
            type="file" 
            className="hidden" 
            onChange={handleFileUpload} 
            disabled={isUploading}
            accept=".pdf,.png,.jpg,.jpeg,.mp4" 
          />
        </label>
      </div>
      
      {message && (
        <div className={`mt-4 p-3 w-full text-center rounded text-sm ${
          message.includes('Success') ? 'bg-green-100 text-green-800' : 
          message.includes('Error') || message.includes('failed') ? 'bg-red-100 text-red-800' : 
          'bg-blue-100 text-blue-800'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}
