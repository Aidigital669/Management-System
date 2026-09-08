'use client';

import { useState } from 'react';

export default function TestEnquiryPage() {
  const [formData, setFormData] = useState({
    name: 'Pravin Ingle',
    email: 'pravin@aidigital.biz',
    phone: '+91 9096090701',
    service: 'Performance Marketing',
    message: 'Testing website enquiry integration with Sales Dashboard.'
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      setResult({ success: res.ok, data });
    } catch (err) {
      setResult({ success: false, data: { error: err.message } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="text-center mb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-400 bg-blue-950/60 px-3 py-1 rounded-full border border-blue-800">
            Website Enquiry Simulator
          </span>
          <h2 className="text-xl font-black text-white mt-3">aidigital.biz Contact Form</h2>
          <p className="text-xs text-slate-400 mt-1">Submit this form to test live lead creation in the Sales Dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Your Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Phone Number</label>
            <input
              type="text"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Service of Interest</label>
            <select
              value={formData.service}
              onChange={(e) => setFormData({ ...formData, service: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="SEO Growth">SEO Growth</option>
              <option value="Performance Marketing">Performance Marketing</option>
              <option value="Web Development">Web Development</option>
              <option value="AI Video Production">AI Video Production</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Message / Project Brief</label>
            <textarea
              rows={3}
              required
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition shadow-lg shadow-blue-600/20 text-sm"
          >
            {loading ? 'Sending Enquiry...' : '🚀 Submit Website Enquiry'}
          </button>
        </form>

        {result && (
          <div className={`mt-4 p-3 rounded-lg border text-xs ${result.success ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-rose-950/40 border-rose-800 text-rose-300'}`}>
            <p className="font-bold">{result.success ? '✔ Success!' : '❌ Error'}</p>
            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap font-mono text-[11px]">{JSON.stringify(result.data, null, 2)}</pre>
            {result.success && (
              <p className="mt-2 text-emerald-400 font-bold">
                👉 Now open your <a href="/dashboard/sales" className="underline text-white">Sales Dashboard</a> to see this lead!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
