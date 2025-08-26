import React, { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';

const TrackerDocs = () => {
  const { user, hasPermission } = useAuthStore();
  const navigate = useNavigate();

  // Set document title
  useEffect(() => {
    document.title = 'Tracker Documentation - OneScan';
  }, []);

  if (!user) {
    navigate('/login');
    return null;
  }

  if (!hasPermission('tracker_docs')) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Tracker Documentation</h1>
            <div className="text-red-600">Access denied. Insufficient permissions.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Tracker Documentation</h1>
          <div className="text-gray-600">Tracker documentation coming soon...</div>
        </div>
      </div>
    </div>
  );
};

export default TrackerDocs;
