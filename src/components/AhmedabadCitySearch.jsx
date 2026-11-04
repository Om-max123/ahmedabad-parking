import React, { useState, useMemo, useCallback } from 'react';
import { playSound } from '../utils/sound';
import AhmedabadMapView from './AhmedabadMapView';

export default function AhmedabadCitySearch({
  locations = [],
  selectedLocationId,
  onSelectLocation,
  onOpenBookModal,
  searchQuery = '',
  setSearchQuery,
}) {
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all');
  const [maxPriceFilter, setMaxPriceFilter] = useState('all');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [requestingGeo, setRequestingGeo] = useState(false);
  const [activeCardId, setActiveCardId] = useState(selectedLocationId);

  // Haversine distance calculator in km
  const calculateDistanceKm = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(1));
  }, []);

  // Request browser location with clear explanation
  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    if (
      !window.confirm(
        'Ahmedabad Smart Parking requests your current location to calculate distances to the nearest parking hubs in the city. Allow location access?'
      )
    ) {
      return;
    }

    setRequestingGeo(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setRequestingGeo(false);
        playSound('park');
      },
      (err) => {
        setRequestingGeo(false);
        if (err.code === 1) {
          setLocationError('Location access was denied. Showing general Ahmedabad municipal listings.');
        } else {
          setLocationError('Unable to determine location. Showing standard city order.');
        }
      },
      { timeout: 8000 }
    );
  };

  // Filtered and sorted locations
  const filteredLocations = useMemo(() => {
    let list = [...locations];

    // Neighborhood/locality query search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (loc) =>
          loc.name.toLowerCase().includes(q) ||
          loc.area.toLowerCase().includes(q) ||
          loc.address.toLowerCase().includes(q)
      );
    }

    // Price ceiling filter
    if (maxPriceFilter !== 'all') {
      const max = parseFloat(maxPriceFilter);
      list = list.filter((loc) => (loc.hourlyRate || 30) <= max);
    }

    // Only available filter
    if (onlyAvailable) {
      list = list.filter((loc) => (loc.availableSlots || 0) > 0);
    }

    // Calculate distance if user location is known and sort by distance
    if (userLocation) {
      list = list.map((loc) => ({
        ...loc,
        distanceKm: calculateDistanceKm(userLocation.lat, userLocation.lng, loc.lat, loc.lng),
      }));
      list.sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));
    }

    return list;
  }, [locations, searchQuery, maxPriceFilter, onlyAvailable, userLocation, calculateDistanceKm]);

  // Handle card click (synchronize map pin)
  const handleCardClick = (locId) => {
    playSound('click');
    setActiveCardId(locId);
    if (onSelectLocation) {
      onSelectLocation(locId);
    }
  };

  return (
    <div className="city-search-container" aria-label="Ahmedabad Parking Search & Map">
      {/* Search & Filter Header Bar */}
      <div className="search-filter-ribbon">
        <div className="search-filter-controls">
          {/* Locality Search Input */}
          <div className="search-bar-wrap">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              className="search-input-field"
              placeholder="Search Ahmedabad locality (e.g. Thaltej, Navrangpura, Bodakdev)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Filter locations by neighborhood"
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-query-btn"
                onClick={() => setSearchQuery('')}
                title="Clear filter"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Price Ceilings */}
          <div className="filter-select-group">
            <label htmlFor="price-select" className="filter-mini-label">Rate Limit:</label>
            <select
              id="price-select"
              className="filter-select-dropdown"
              value={maxPriceFilter}
              onChange={(e) => setMaxPriceFilter(e.target.value)}
            >
              <option value="all">Any Hourly Rate</option>
              <option value="30">Max ₹30 / hr</option>
              <option value="40">Max ₹40 / hr</option>
              <option value="60">Max ₹60 / hr</option>
            </select>
          </div>

          {/* Only Available Toggle */}
          <label className="checkbox-filter-label">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
            />
            <span>Available Spots Only</span>
          </label>

          {/* Nearby GPS Geolocation Button */}
          <button
            type="button"
            className={`btn-geo-locate ${userLocation ? 'active' : ''}`}
            onClick={handleRequestLocation}
            disabled={requestingGeo}
            title="Ask browser GPS location to find closest parking in Ahmedabad"
          >
            <span>📍</span>
            <span>{requestingGeo ? 'Locating...' : userLocation ? 'GPS Sorted' : 'Nearest to Me'}</span>
          </button>
        </div>

        {locationError && (
          <div className="geo-warning-banner">
            <span>ℹ️ {locationError}</span>
          </div>
        )}
      </div>

      {/* Synchronized Map & Results View Split Layout */}
      <div className="search-results-split-layout">
        {/* Left Column: Interactive Map */}
        <div className="map-column">
          <AhmedabadMapView
            locations={filteredLocations}
            selectedLocationId={activeCardId || selectedLocationId}
            onSelectLocation={(locId) => {
              setActiveCardId(locId);
              if (onSelectLocation) onSelectLocation(locId);
            }}
          />
        </div>

        {/* Right Column: Synchronized Location Cards List */}
        <div className="results-list-column">
          <div className="results-list-header">
            <span className="results-count-text">
              Showing <strong>{filteredLocations.length}</strong> of {locations.length} Ahmedabad Hubs
            </span>
            <span className="availability-provenance-tag">
              ℹ️ Availability: Municipal Dataset Baseline
            </span>
          </div>

          {/* Honest No-Results UI */}
          {filteredLocations.length === 0 ? (
            <div className="no-results-card">
              <span className="no-results-icon">🔍</span>
              <h4 className="no-results-title">No matching parking facilities in "{searchQuery}"</h4>
              <p className="no-results-desc">
                We currently support major municipal facilities in Ahmedabad. Try one of these covered localities:
              </p>
              <div className="no-results-suggestions">
                {['Thaltej', 'Navrangpura', 'Bodakdev', 'Vastrapur', 'Riverfront West', 'Prahlad Nagar'].map((area) => (
                  <button
                    key={area}
                    type="button"
                    className="suggestion-pill"
                    onClick={() => {
                      playSound('click');
                      setSearchQuery(area);
                    }}
                  >
                    📍 {area}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="location-cards-grid">
              {filteredLocations.map((loc) => {
                const isSelected = loc.id === (activeCardId || selectedLocationId);
                const hasSpots = (loc.availableSlots || 0) > 0;
                const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`;

                return (
                  <article
                    key={loc.id}
                    className={`facility-result-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleCardClick(loc.id)}
                    tabIndex={0}
                    role="button"
                    aria-pressed={isSelected}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleCardClick(loc.id);
                      }
                    }}
                  >
                    <div className="card-top-bar">
                      <div className="card-area-badge">
                        <span>📍 {loc.area}</span>
                        {loc.distanceKm !== undefined && (
                          <span className="distance-badge">{loc.distanceKm} km away</span>
                        )}
                      </div>
                      <div className="card-rating">
                        <span>★ {loc.rating || 4.8}</span>
                      </div>
                    </div>

                    <h4 className="facility-card-name">{loc.name}</h4>
                    <p className="facility-card-address">{loc.address}</p>

                    <div className="facility-card-meta">
                      <div className="meta-stat">
                        <span className="meta-label">Hourly Tariff</span>
                        <span className="meta-value rate-value">₹{loc.hourlyRate || 30} / hr</span>
                      </div>
                      <div className="meta-stat">
                        <span className="meta-label">Availability</span>
                        <span className={`meta-value ${hasSpots ? 'spots-green' : 'spots-red'}`}>
                          {hasSpots ? `${loc.availableSlots} of ${loc.totalSlots} Free` : 'Full / Occupied'}
                        </span>
                      </div>
                      <div className="meta-stat">
                        <span className="meta-label">Hours</span>
                        <span className="meta-value">24/7 Mon-Sun</span>
                      </div>
                    </div>

                    <div className="card-actions-row" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-directions-link"
                        title="Open driving navigation in Google Maps"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
                        </svg>
                        <span>Directions</span>
                      </a>

                      <button
                        type="button"
                        className="btn-card-reserve"
                        onClick={() => {
                          handleCardClick(loc.id);
                          if (onOpenBookModal) onOpenBookModal();
                        }}
                      >
                        Reserve Bay →
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

