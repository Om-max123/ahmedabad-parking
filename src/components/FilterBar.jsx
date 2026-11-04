import React from 'react';
import { ZONES } from '../utils/parkingData';

export default function FilterBar({ 
  searchQuery, 
  setSearchQuery, 
  selectedZone, 
  setSelectedZone, 
  statusFilter, 
  setStatusFilter, 
  slots = [] 
}) {
  const getZoneCount = (zoneId) => {
    if (zoneId === 'ALL') return slots.length;
    return slots.filter(s => s.zone === zoneId).length;
  };

  const getStatusCount = (status) => {
    if (status === 'all') return slots.length;
    return slots.filter(s => s.status === status).length;
  };

  return (
    <div className="filter-bar-card">
      <div className="filter-top-row">
        {/* Google / Apple Spotlight Search Input */}
        <div className="search-input-wrapper">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search by license plate (e.g. GJ-01), driver, or bay code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
              title="Clear search"
              aria-label="Clear Search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Filter Segmented Control (Apple Style) */}
        <div className="segmented-control status-toggle-group">
          <button
            className={`segmented-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Bays <span className="count-pill">{getStatusCount('all')}</span>
          </button>
          <button
            className={`segmented-btn available-filter ${statusFilter === 'available' ? 'active' : ''}`}
            onClick={() => setStatusFilter('available')}
          >
            <span className="dot dot-green"></span>
            Available <span className="count-pill">{getStatusCount('available')}</span>
          </button>
          <button
            className={`segmented-btn occupied-filter ${statusFilter === 'occupied' ? 'active' : ''}`}
            onClick={() => setStatusFilter('occupied')}
          >
            <span className="dot dot-red"></span>
            Parked <span className="count-pill">{getStatusCount('occupied')}</span>
          </button>
        </div>
      </div>

      {/* Zone Chips (Apple Horizontal Pill Bar) */}
      <div className="zone-tabs-list" role="tablist">
        {ZONES.map((zone) => {
          const isSelected = selectedZone === zone.id;
          return (
            <button
              key={zone.id}
              role="tab"
              aria-selected={isSelected}
              className={`zone-chip-btn ${isSelected ? 'active' : ''}`}
              onClick={() => setSelectedZone(zone.id)}
            >
              <span className="zone-name">{zone.name}</span>
              {zone.type && <span className="zone-desc">{zone.type}</span>}
              <span className="zone-count-badge">{getZoneCount(zone.id)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
