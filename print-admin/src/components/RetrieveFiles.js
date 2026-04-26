import React, { useState } from 'react';

const RetrieveFiles = () => {
  const [jobId, setJobId] = useState('');
  const [message, setMessage] = useState('');

  const handleDownload = () => {
    if (!jobId.trim()) {
      setMessage('Please enter a Job ID.');
      return;
    }
    // Assuming the API is running on localhost:5000
    const url = `http://localhost:5000/api/download/${jobId}`;
    window.open(url, '_blank');
    setMessage('Download initiated. If file exists, it will start downloading.');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Retrieve Files</h1>
      <p className="mb-4">Enter your Print ID to download your file.</p>
      <div className="flex gap-4 items-center">
        <input
          type="text"
          placeholder="Enter Job ID"
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 flex-1"
        />
        <button
          onClick={handleDownload}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Download
        </button>
      </div>
      {message && <p className="mt-4 text-sm text-gray-600">{message}</p>}
    </div>
  );
};

export default RetrieveFiles;