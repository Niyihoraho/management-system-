'use client';

import { useState, useEffect } from 'react';

export default function TestRegionsPage() {
  const [regions, setRegions] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [smallGroups, setSmallGroups] = useState([]);
  const [alumniGroups, setAlumniGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRegionId, setSelectedRegionId] = useState('');

  const fetchRegions = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching regions...');
      const response = await fetch('/api/regions');
      const data = await response.json();
      console.log('Regions Response:', { status: response.status, data });
      
      if (response.ok) {
        setRegions(data);
      } else {
        setError(data.error || 'Failed to fetch regions');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUniversities = async (regionId) => {
    try {
      console.log('Fetching universities for region:', regionId);
      const response = await fetch(`/api/universities?regionId=${regionId}`);
      const data = await response.json();
      console.log('Universities Response:', { status: response.status, data });
      
      if (response.ok) {
        setUniversities(data);
      } else {
        console.error('Universities API Error:', data);
      }
    } catch (err) {
      console.error('Universities Error:', err);
    }
  };

  const _fetchSmallGroups = async (regionId, universityId) => {
    try {
      console.log('Fetching small groups for region:', regionId, 'university:', universityId);
      const response = await fetch(`/api/small-groups?regionId=${regionId}&universityId=${universityId}`);
      const data = await response.json();
      console.log('Small Groups Response:', { status: response.status, data });
      
      if (response.ok) {
        setSmallGroups(data);
      } else {
        console.error('Small Groups API Error:', data);
      }
    } catch (err) {
      console.error('Small Groups Error:', err);
    }
  };

  const fetchAlumniGroups = async (regionId) => {
    try {
      console.log('Fetching alumni groups for region:', regionId);
      const response = await fetch(`/api/alumni-small-groups?regionId=${regionId}`);
      const data = await response.json();
      console.log('Alumni Groups Response:', { status: response.status, data });
      
      if (response.ok) {
        setAlumniGroups(data);
      } else {
        console.error('Alumni Groups API Error:', data);
      }
    } catch (err) {
      console.error('Alumni Groups Error:', err);
    }
  };

  useEffect(() => {
    fetchRegions();
  }, []);

  const handleRegionChange = (regionId) => {
    setSelectedRegionId(regionId);
    setUniversities([]);
    setSmallGroups([]);
    setAlumniGroups([]);
    
    if (regionId) {
      fetchUniversities(regionId);
      fetchAlumniGroups(regionId);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test User Role APIs</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Test Region Selection</h2>
          <select 
            value={selectedRegionId} 
            onChange={(e) => handleRegionChange(e.target.value)}
            className="w-full p-2 border rounded mb-4"
          >
            <option value="">Select a region</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <button 
            onClick={fetchRegions}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh Regions'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Regions ({regions.length})</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-40">
            {JSON.stringify(regions, null, 2)}
          </pre>
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Universities ({universities.length})</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-40">
            {JSON.stringify(universities, null, 2)}
          </pre>
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Small Groups ({smallGroups.length})</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-40">
            {JSON.stringify(smallGroups, null, 2)}
          </pre>
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Alumni Groups ({alumniGroups.length})</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-40">
            {JSON.stringify(alumniGroups, null, 2)}
          </pre>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Console Logs</h2>
        <p className="text-sm text-gray-600">Check the browser console for detailed logs</p>
      </div>
    </div>
  );
}
