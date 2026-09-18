'use client';

import { useState, useEffect } from 'react';
import { Eye, ArrowLeft, Loader2 } from 'lucide-react';

export default function AdminPreviewBanner({ currentUserName }) {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [adminName, setAdminName] = useState('Admin');
  const [reverting, setReverting] = useState(false);

  useEffect(() => {
    // Check if originalAdminId cookie exists
    const hasAdminCookie = document.cookie.split(';').some(c => c.trim().startsWith('originalAdminId='));
    if (hasAdminCookie) {
      setIsImpersonating(true);
      // Try to extract admin name
      const nameCookie = document.cookie.split(';').find(c => c.trim().startsWith('originalAdminName='));
      if (nameCookie) {
        try {
          setAdminName(decodeURIComponent(nameCookie.split('=')[1]));
        } catch(e) {}
      }
    }
  }, []);

  const handleReturnToAdmin = async () => {
    setReverting(true);
    try {
      const res = await fetch('/api/auth/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revert: true })
      });
      const data = await res.json();
      if (res.ok && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        window.location.href = '/dashboard/admin';
      }
    } catch (err) {
      window.location.href = '/dashboard/admin';
    }
  };

  if (!isImpersonating) return null;

  return (
    <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md sticky top-0 z-50 border-b border-blue-500/40 animate-fade-in">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-300"></span>
        </span>
        <Eye className="w-4 h-4 text-amber-300 shrink-0" />
        <span>
          Admin Preview Mode: Viewing dashboard as <strong className="underline decoration-amber-400 decoration-2 underline-offset-2">{currentUserName || 'Employee'}</strong>
        </span>
      </div>
      <button
        type="button"
        disabled={reverting}
        onClick={handleReturnToAdmin}
        className="px-3.5 py-1 bg-white hover:bg-slate-100 text-blue-900 font-extrabold rounded-lg text-xs shadow transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
        title="Return back to Admin Dashboard"
      >
        {reverting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <ArrowLeft className="w-3.5 h-3.5" />
        )}
        <span>Return to Admin</span>
      </button>
    </div>
  );
}
