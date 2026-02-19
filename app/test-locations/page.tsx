'use client';

import { useState, useEffect } from 'react';

export default function TestLocationsPage() {
  const [provinces, setProvinces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProvinces = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching provinces...');
      const response = await fetch('/api/locations?type=provinces');
      const data = await response.json();
      console.log('Response:', { status: response.status, data });

      if (response.ok) {
        setProvinces(data);
      } else {
        setError(data.error || 'Failed to fetch provinces');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProvinces();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Locations API</h1>

      <button
        onClick={fetchProvinces}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Fetch Provinces'}
      </button>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Provinces ({provinces.length})</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(provinces, null, 2)}
        </pre>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Console Logs</h2>
        <p className="text-sm text-gray-600">Check the browser console for detailed logs</p>
      </div>
    </div>
  );
}
