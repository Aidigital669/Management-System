'use client';
import { useState } from 'react';

export default function CampaignDeliveriesTable({ deliveries = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [postTypeFilter, setPostTypeFilter] = useState('All');

  // Derive unique values for filters
  const uniqueStatuses = ['All', ...new Set(deliveries.map(d => d.status).filter(Boolean))];
  const uniquePostTypes = ['All', ...new Set(deliveries.map(d => d.postType).filter(Boolean))];

  // Filter deliveries based on current state
  const filteredDeliveries = deliveries.filter(d => {
    const matchesSearch = 
      (d.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.deliveryId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.workingOn || '').toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
    const matchesPostType = postTypeFilter === 'All' || d.postType === postTypeFilter;

    return matchesSearch && matchesStatus && matchesPostType;
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
        <h2 className="text-lg font-semibold text-gray-800">Campaign Deliveries</h2>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text" 
            placeholder="Search by ID, Client, or Employee..."
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <select 
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {uniqueStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          
          <select 
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={postTypeFilter}
            onChange={(e) => setPostTypeFilter(e.target.value)}
          >
            {uniquePostTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[750px] text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-medium">Delivery ID</th>
              <th className="px-6 py-4 font-medium">Client</th>
              <th className="px-6 py-4 font-medium">Post Type</th>
              <th className="px-6 py-4 font-medium">Post Date</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Working On</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredDeliveries.length > 0 ? (
              filteredDeliveries.map((delivery, i) => (
                <tr key={i} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{delivery.deliveryId}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-800">{delivery.clientName}</div>
                    <div className="text-xs text-gray-500">{delivery.clientId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                      {delivery.postType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{delivery.postDate}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      delivery.status === 'Delivered' ? 'bg-green-50 text-green-700 border-green-100' : 
                      delivery.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                      'bg-gray-50 text-gray-700 border-gray-100'
                    }`}>
                      {delivery.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-700 font-medium">{delivery.workingOn || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                  <p className="mb-2">No deliveries found matching your filters.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {filteredDeliveries.length > 0 && (
        <div className="p-4 border-t border-gray-100 bg-gray-50 text-sm text-gray-600 flex justify-between items-center">
          <span>Showing <strong>{filteredDeliveries.length}</strong> of <strong>{deliveries.length}</strong> deliveries</span>
        </div>
      )}
    </div>
  );
}
