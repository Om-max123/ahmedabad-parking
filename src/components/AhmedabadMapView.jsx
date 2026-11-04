import React, { useEffect, useRef, useState } from 'react';
import { playSound } from '../utils/sound';

export default function AhmedabadMapView({ locations, selectedLocationId, onSelectLocation }) {
  const mapRef = useRef(null);
  const DEFAULT_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ahmedabad_gmap_key') || DEFAULT_KEY);
  const [isKeyInputOpen, setIsKeyInputOpen] = useState(false);
  const [tempKey, setTempKey] = useState('');
  const [gmapLoaded, setGmapLoaded] = useState(false);
  const [gmapError, setGmapError] = useState('');
  const googleMapInstance = useRef(null);
  const markersRef = useRef([]);

  // Load Google Maps script if API key is provided
  useEffect(() => {
    if (!apiKey) {
      setGmapLoaded(false);
      return;
    }

    if (window.google && window.google.maps) {
      setGmapLoaded(true);
      return;
    }

    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId);

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setGmapLoaded(true);
        setGmapError('');
      };
      script.onerror = () => {
        setGmapError('Failed to load Google Maps with provided key. Please verify key restrictions.');
        setGmapLoaded(false);
      };
      document.head.appendChild(script);
    } else {
      setGmapLoaded(true);
    }
  }, [apiKey]);

  // Initialize or update Google Map instance
  useEffect(() => {
    if (!gmapLoaded || !mapRef.current || !window.google || !window.google.maps) return;

    // Centered on Ahmedabad
    const ahmedabadCenter = { lat: 23.0300, lng: 72.5500 };

    if (!googleMapInstance.current) {
      googleMapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: ahmedabadCenter,
        zoom: 12.8,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
          {
            featureType: 'administrative.locality',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }],
          },
          {
            featureType: 'poi',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }],
          },
          {
            featureType: 'poi.park',
            elementType: 'geometry',
            stylers: [{ color: '#263c3f' }],
          },
          {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ color: '#38414e' }],
          },
          {
            featureType: 'road',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#212a37' }],
          },
          {
            featureType: 'road',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#9ca5b3' }],
          },
          {
            featureType: 'road.highway',
            elementType: 'geometry',
            stylers: [{ color: '#746855' }],
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#17263c' }],
          },
        ],
      });
    }

    const map = googleMapInstance.current;

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    // Add markers for each Ahmedabad parking location
    locations.forEach(loc => {
      const isSelected = loc.id === selectedLocationId;
      const isAvailable = loc.availableSlots > 0;

      const marker = new window.google.maps.Marker({
        position: { lat: loc.lat, lng: loc.lng },
        map,
        title: loc.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 12 : 9,
          fillColor: isAvailable ? '#10B981' : '#EF4444',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="color: #111; padding: 6px; font-family: sans-serif; max-width: 220px;">
            <strong style="font-size: 14px; display: block; margin-bottom: 4px;">${loc.name}</strong>
            <p style="margin: 0 0 6px; font-size: 12px; color: #555;">${loc.area} • ${loc.currency || '₹'}${loc.hourlyRate}/hr</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 12px; font-weight: bold; color: ${isAvailable ? '#059669' : '#DC2626'}">
                ${loc.availableSlots} of ${loc.totalSlots} Bays Free
              </span>
            </div>
            <button id="book-loc-btn-${loc.id}" style="width: 100%; background: #2563EB; color: white; border: none; padding: 6px 10px; border-radius: 4px; font-size: 12px; cursor: pointer; font-weight: 600;">
              Select & View Bays
            </button>
          </div>
        `,
      });

      marker.addListener('click', () => {
        playSound('click');
        infoWindow.open(map, marker);
        onSelectLocation(loc.id);

        setTimeout(() => {
          const btn = document.getElementById(`book-loc-btn-${loc.id}`);
          if (btn) {
            btn.onclick = () => {
              onSelectLocation(loc.id);
            };
          }
        }, 100);
      });

      if (isSelected) {
        map.panTo({ lat: loc.lat, lng: loc.lng });
      }

      markersRef.current.push(marker);
    });
  }, [gmapLoaded, locations, selectedLocationId, onSelectLocation]);

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    const clean = tempKey.trim();
    setApiKey(clean);
    localStorage.setItem('ahmedabad_gmap_key', clean);
    setIsKeyInputOpen(false);
    playSound('park');
  };

  const handleClearApiKey = () => {
    setApiKey('');
    localStorage.removeItem('ahmedabad_gmap_key');
    setGmapLoaded(false);
    playSound('click');
  };

  return (
    <div className="map-view-wrapper">
      {/* Map Bar Header */}
      <div className="map-header-bar">
        <div className="map-title-wrap">
          <div className="map-radar-pulse"></div>
          <div>
            <h3 className="map-title">Ahmedabad Smart Parking Radar</h3>
            <p className="map-subtitle">
              {locations.length} Strategic Urban Locations • Real-time GPS Telemetry
            </p>
          </div>
        </div>

        <div className="map-actions-group">
          {apiKey ? (
            <div className="gmap-active-badge">
              <span className="dot-green"></span>
              <span>Google Maps API Active</span>
              <button className="btn-unlink-key" onClick={handleClearApiKey} title="Switch to Radar view">
                Disconnect
              </button>
            </div>
          ) : (
            <button 
              className="btn-api-key-config"
              onClick={() => { playSound('click'); setIsKeyInputOpen(!isKeyInputOpen); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 2l-2 2m-1.5 1.5L14 9l-1.5-1.5L10 10l-1.5-1.5L7 10l-4 4v7h7l4-4 1.5 1.5L17 17l1.5-1.5L20 17l2-2-4.5-4.5z"></path>
              </svg>
              <span>Add Google Map API Key</span>
            </button>
          )}
        </div>
      </div>

      {/* Modal/Dropdown for API Key Input */}
      {isKeyInputOpen && (
        <form onSubmit={handleSaveApiKey} className="api-key-drawer">
          <div className="api-key-inner">
            <div>
              <strong>Connect Google Maps API Key</strong>
              <p>Enter your Google Maps JavaScript API key to display satellite street map.</p>
            </div>
            <div className="api-input-row">
              <input
                type="text"
                className="form-input key-input"
                placeholder="AIzaSy..."
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn-save-key">Activate</button>
              <button type="button" className="btn-cancel-small" onClick={() => setIsKeyInputOpen(false)}>✕</button>
            </div>
          </div>
        </form>
      )}

      {/* Map Display Container */}
      <div className="map-canvas-container">
        {apiKey && !gmapError ? (
          <div ref={mapRef} className="google-map-element" style={{ width: '100%', height: '360px', borderRadius: '12px' }} />
        ) : (
          /* Interactive High-Def Ahmedabad Radar Map */
          <div className="ahmedabad-radar-map">
            {/* Grid overlay & Riverfront decorative line */}
            <div className="map-grid-bg"></div>
            <div className="sabarmati-river-visual" title="Sabarmati River">
              <span className="river-tag">Sabarmati River</span>
            </div>

            {/* City Center Coordinate Tag */}
            <div className="ahmedabad-center-tag">
              <span>📍 Ahmedabad City (23.0225° N, 72.5714° E)</span>
            </div>

            {/* Markers placed based on real relative Lat/Lng in Ahmedabad */}
            <div className="markers-layer">
              {locations.map((loc) => {
                // Map Ahmedabad bounding box (~22.98 to 23.06 lat, 72.48 to 72.62 lng) to percentage
                const minLat = 22.990;
                const maxLat = 23.055;
                const minLng = 72.500;
                const maxLng = 72.610;

                const topPct = Math.max(10, Math.min(88, 100 - ((loc.lat - minLat) / (maxLat - minLat)) * 80 - 10));
                const leftPct = Math.max(8, Math.min(90, ((loc.lng - minLng) / (maxLng - minLng)) * 80 + 10));

                const isSelected = loc.id === selectedLocationId;
                const hasSpots = loc.availableSlots > 0;

                return (
                  <div
                    key={loc.id}
                    className={`radar-pin-node ${isSelected ? 'selected' : ''} ${hasSpots ? 'available' : 'full'}`}
                    style={{ top: `${topPct}%`, left: `${leftPct}%` }}
                    onClick={() => {
                      playSound('click');
                      onSelectLocation(loc.id);
                    }}
                    title={`${loc.name} - ${loc.availableSlots}/${loc.totalSlots} Bays Free`}
                  >
                    <div className="pin-pulse-ring"></div>
                    <div className="pin-circle">
                      <span className="pin-icon">{hasSpots ? 'P' : '✕'}</span>
                    </div>
                    <div className="pin-tooltip">
                      <span className="tooltip-name">{loc.name}</span>
                      <span className="tooltip-sub">
                        {loc.area} • <strong>{loc.availableSlots} free</strong> (₹{loc.hourlyRate}/hr)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Quick Select Ahmedabad Location Chips */}
      <div className="location-chips-scroller">
        {locations.map((loc) => {
          const isSelected = loc.id === selectedLocationId;
          const hasSpots = loc.availableSlots > 0;

          return (
            <button
              key={loc.id}
              className={`location-chip ${isSelected ? 'active' : ''}`}
              onClick={() => {
                playSound('click');
                onSelectLocation(loc.id);
              }}
            >
              <div className="chip-left">
                <span className={`status-indicator-dot ${hasSpots ? 'green' : 'red'}`}></span>
                <span className="chip-name">{loc.name.split(' ')[0]} {loc.name.split(' ')[1]}</span>
              </div>
              <div className="chip-meta">
                <span className="chip-slots">{loc.availableSlots} / {loc.totalSlots} bays</span>
                <span className="chip-price">₹{loc.hourlyRate}/h</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
