import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Navbar from './components/Navbar';
import StatsCards from './components/StatsCards';
import FilterBar from './components/FilterBar';
import ParkingSlotCard from './components/ParkingSlotCard';
import AhmedabadMapView from './components/AhmedabadMapView';
import AhmedabadCitySearch from './components/AhmedabadCitySearch';
import HeroLandingBanner from './components/HeroLandingBanner';
import BookingFormModal from './components/BookingFormModal';
import LoginModal from './components/LoginModal';
import MyBookingsModal from './components/MyBookingsModal';
import CheckoutModal from './components/CheckoutModal';
import ReceiptModal from './components/ReceiptModal';
import DatabaseModal from './components/DatabaseModal';
import DatabaseTableViewer from './components/DatabaseTableViewer';
import AnalyticsView from './components/AnalyticsView';
import VehicleOwnersView from './components/VehicleOwnersView';
import VehicleOwnerModal from './components/VehicleOwnerModal';
import VehiclesModal from './components/VehiclesModal';
import WalletTopupModal from './components/WalletTopupModal';
import AdminView from './components/AdminView';
import ActiveBayBanner from './components/ActiveBayBanner';
import './App.css';

export default function App() {
  // Locations & current selected Ahmedabad hub
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState('loc-cg-road');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [dbConnected, setDbConnected] = useState(false);

  // Authentication Token & Driver State
  const [authToken, setAuthToken] = useState(() => {
    try {
      return localStorage.getItem('amdavad_token') || null;
    } catch {
      return null;
    }
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('amdavad_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [walletBalance, setWalletBalance] = useState(500);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  // Bookings state
  const [myBookings, setMyBookings] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('search'); // 'search', 'bays', 'map', 'owners', 'analytics', 'database', 'admin'
  const [ownersCount, setOwnersCount] = useState(9);

  // Modal States
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isVehiclesModalOpen, setIsVehiclesModalOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [targetSlot, setTargetSlot] = useState(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedOccupiedSlot, setSelectedOccupiedSlot] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [isMyBookingsOpen, setIsMyBookingsOpen] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);

  // Vehicle Owner Modal States
  const [isVehicleOwnerModalOpen, setIsVehicleOwnerModalOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState(null);
  const [prefillBookingOwner, setPrefillBookingOwner] = useState(null);

  // Toast
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  // Fetch all Ahmedabad parking locations
  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch('/api/locations');
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
        if (!selectedLocationId && data.length > 0) {
          setSelectedLocationId(data[0].id);
        }
      }
    } catch (err) {
      console.warn('Backend server connecting...', err);
    }
  }, [selectedLocationId]);

  // Fetch specific selected location details
  const fetchCurrentLocation = useCallback(async (locId) => {
    try {
      const res = await fetch(`/api/locations/${locId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentLocation(data);
      }
    } catch (err) {
      console.error('Failed to load location details:', err);
    }
  }, []);

  // Fetch authenticated user's bookings from PostgreSQL
  const fetchMyBookings = useCallback(async (token) => {
    if (!token) {
      setMyBookings([]);
      return;
    }
    try {
      const res = await fetch('/api/bookings/my-bookings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyBookings(data);
      } else if (res.status === 401) {
        setMyBookings([]);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    }
  }, []);

  // Fetch Driver's Live Smart Wallet Balance from PostgreSQL
  const fetchWalletBalance = useCallback(async (token) => {
    if (!token) return;
    try {
      const res = await fetch('/api/wallet/balance', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.balance !== undefined) {
          setWalletBalance(data.balance);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch wallet balance:', e);
    }
  }, []);

  // Validate session on load using /api/auth/me
  useEffect(() => {
    if (authToken) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            setCurrentUser(data.user);
            setWalletBalance(data.user.walletBalance);
            localStorage.setItem('amdavad_user', JSON.stringify(data.user));
          } else if (res.status === 401) {
            // Token expired or invalid
            setAuthToken(null);
            setCurrentUser(null);
            localStorage.removeItem('amdavad_token');
            localStorage.removeItem('amdavad_user');
          }
        })
        .catch(() => {});
    }
  }, [authToken]);

  // Check Database status
  const checkDatabaseStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/database/info');
      if (res.ok) {
        const data = await res.json();
        setDbConnected(!!data.connected);
        if (data.schema?.tables) {
          const ownerTable = data.schema.tables.find(t => t.name === 'vehicle_owners');
          if (ownerTable && ownerTable.recordCount !== undefined) {
            setOwnersCount(ownerTable.recordCount);
          }
        }
      }
    } catch {
      setDbConnected(false);
    }
  }, []);

  // Today's collections from the receipts ledger
  const fetchRevenue = useCallback(async () => {
    try {
      const res = await fetch('/api/stats/revenue-today');
      if (res.ok) {
        const data = await res.json();
        setTotalRevenue(data.totalRevenue || 0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchLocations();
    checkDatabaseStatus();
    fetchRevenue();
  }, [fetchLocations, checkDatabaseStatus, fetchRevenue]);

  useEffect(() => {
    if (selectedLocationId) {
      fetchCurrentLocation(selectedLocationId);
    }
  }, [selectedLocationId, fetchCurrentLocation]);

  useEffect(() => {
    if (authToken) {
      fetchMyBookings(authToken);
      fetchWalletBalance(authToken);
    }
  }, [authToken, fetchMyBookings, fetchWalletBalance]);

  // Handle user login / registration success
  const handleLoginSuccess = (user, token) => {
    setCurrentUser(user);
    if (token) {
      setAuthToken(token);
      localStorage.setItem('amdavad_token', token);
    }
    localStorage.setItem('amdavad_user', JSON.stringify(user));

    if (user.walletBalance !== undefined) {
      setWalletBalance(user.walletBalance);
    } else if (token) {
      fetchWalletBalance(token);
    }

    showToast(`Welcome, ${user.name}! Vehicle ${user.carNumber} verified.`, 'success');
    if (token) {
      fetchMyBookings(token);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setAuthToken(null);
    setCurrentUser(null);
    setWalletBalance(0);
    setMyBookings([]);
    localStorage.removeItem('amdavad_token');
    localStorage.removeItem('amdavad_user');
    showToast('Signed out of driver profile. Protected actions locked.', 'info');
  };

  // Handle location selection
  const handleSelectLocation = (locId) => {
    setSelectedLocationId(locId);
    if (activeTab === 'map') {
      setActiveTab('bays');
    }
  };

  // Slots for the current location
  const slots = useMemo(() => currentLocation?.slots || [], [currentLocation]);

  // Filtered Slots
  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      // Zone filter
      if (selectedZone !== 'ALL' && slot.zone !== selectedZone) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'all' && slot.status !== statusFilter) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const plate = slot.vehicle?.plate?.toLowerCase() || '';
        const driver = slot.vehicle?.driver?.toLowerCase() || '';
        const slotId = (slot.id || '').toLowerCase();
        if (!plate.includes(query) && !driver.includes(query) && !slotId.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [slots, selectedZone, statusFilter, searchQuery]);

  // Handlers for booking workflows
  const handleOpenBookModal = (slot = null) => {
    if (!currentUser || !authToken) {
      setIsLoginModalOpen(true);
      showToast('Please sign in with your driver profile to reserve a parking bay.', 'info');
      return;
    }
    setTargetSlot(slot);
    setIsBookModalOpen(true);
  };

  const handleBookingSuccess = (booking) => {
    fetchRevenue();
    fetchCurrentLocation(selectedLocationId);
    fetchLocations();
    if (authToken) {
      fetchMyBookings(authToken);
      fetchWalletBalance(authToken);
    }
    showToast(`Bay ${booking.slotId} reserved for ${booking.plate}!`, 'success');
  };

  const handleOpenCheckoutModal = (slot) => {
    if (!currentUser || !authToken) {
      setIsLoginModalOpen(true);
      showToast('Please sign in to manage vehicle checkout.', 'info');
      return;
    }
    setSelectedOccupiedSlot(slot);
    setIsCheckoutModalOpen(true);
  };

  const handleCheckoutConfirm = (slotId, amount, receiptData) => {
    fetchRevenue();
    setIsCheckoutModalOpen(false);
    setCurrentReceipt(receiptData);
    setIsReceiptModalOpen(true);
    fetchCurrentLocation(selectedLocationId);
    fetchLocations();
    if (authToken) {
      fetchMyBookings(authToken);
      fetchWalletBalance(authToken);
    }
    showToast(`Bay ${slotId} concluded. ₹${amount.toFixed(0)} received.`, 'checkout');
  };

  // Direct checkout/release from My Bookings modal
  const handleCheckoutFromBookings = async (locId, sId, bId) => {
    if (!authToken) {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const res = await fetch('/api/bookings/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          locationId: locId,
          slotId: sId,
          bookingId: bId,
          paymentMethod: 'SMART_WALLET'
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to release booking');

      if (data.receipt) {
        setCurrentReceipt(data.receipt);
        setIsReceiptModalOpen(true);
      }
      fetchCurrentLocation(selectedLocationId);
      fetchLocations();
      fetchMyBookings(authToken);
      fetchWalletBalance(authToken);
      showToast(`Bay ${sId} released successfully! Session concluded.`, 'success');
    } catch (err) {
      showToast(err.message, 'warning');
    }
  };

  // Cancel booking and refund
  const handleCancelBooking = async (bookingId) => {
    if (!authToken) {
      setIsLoginModalOpen(true);
      return;
    }

    const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Cancellation failed');
    }

    if (data.newBalance !== undefined) {
      setWalletBalance(data.newBalance);
    }
    fetchRevenue();
    fetchCurrentLocation(selectedLocationId);
    fetchLocations();
    fetchMyBookings(authToken);
    showToast(data.message || `Booking ${bookingId} cancelled and refunded!`, 'success');
  };

  // Administrative Reset
  const handleResetLot = () => {
    if (window.confirm('Reset all Ahmedabad parking bays to default dataset state?')) {
      fetch('/api/reset', { method: 'POST', headers: { Authorization: `Bearer ${authToken}` } })
        .then(() => {
          fetchLocations();
          fetchCurrentLocation(selectedLocationId);
          if (authToken) fetchMyBookings(authToken);
          showToast('Parking system reset to fresh baseline.', 'info');
        });
    }
  };

  const activeBookingsCount = myBookings.filter(b => b.status === 'active').length;

  return (
    <div className="app-layout">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`toast-notification ${toastMessage.type}`} role="status">
          <div className="toast-dot"></div>
          <span>{toastMessage.message}</span>
          <button className="toast-close" onClick={() => setToastMessage(null)} aria-label="Close notification">✕</button>
        </div>
      )}

      {/* Top Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        walletBalance={walletBalance}
        onOpenWallet={() => {
          if (!currentUser || !authToken) {
            setIsLoginModalOpen(true);
          } else {
            setIsWalletModalOpen(true);
          }
        }}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onOpenBookModal={() => handleOpenBookModal()}
        onOpenMyBookings={() => {
          if (!currentUser || !authToken) {
            setIsLoginModalOpen(true);
          } else {
            setIsMyBookingsOpen(true);
          }
        }}
        onOpenDatabaseModal={() => setIsDbModalOpen(true)}
        onOpenVehicleOwners={() => setActiveTab('owners')}
        onOpenVehiclesModal={() => {
          if (!currentUser || !authToken) {
            setIsLoginModalOpen(true);
          } else {
            setIsVehiclesModalOpen(true);
          }
        }}
        onOpenAdmin={() => setActiveTab('admin')}
        activeBookingsCount={activeBookingsCount}
        ownersCount={ownersCount}
        activeTab={activeTab}
        dbConnected={dbConnected}
        selectedLocationName={currentLocation?.name}
      />

      {/* Facility Selector & View Switcher Ribbon */}
      <div className="location-selector-ribbon">
        <div className="location-ribbon-content">
          <div className="city-pill">
            <span className="dot-pulse"></span>
            <strong>AHMEDABAD, GUJARAT</strong>
          </div>

          <div className="location-select-wrap">
            <label htmlFor="facility-dropdown" className="loc-label">Active Facility:</label>
            <select
              id="facility-dropdown"
              className="location-select-dropdown"
              value={selectedLocationId}
              onChange={(e) => handleSelectLocation(e.target.value)}
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.area}) • ₹{loc.hourlyRate}/hr ({loc.availableSlots} bays available)
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Switcher: Segmented Control */}
          <div className="view-toggle-tabs" role="tablist" aria-label="View Modes">
            <button
              className={`view-tab-btn ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
              role="tab"
              aria-selected={activeTab === 'search'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span>Search & Map</span>
            </button>
            <button
              className={`view-tab-btn ${activeTab === 'bays' ? 'active' : ''}`}
              onClick={() => setActiveTab('bays')}
              role="tab"
              aria-selected={activeTab === 'bays'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              <span>Bays Grid</span>
            </button>
            <button
              className={`view-tab-btn ${activeTab === 'owners' ? 'active' : ''}`}
              onClick={() => setActiveTab('owners')}
              role="tab"
              aria-selected={activeTab === 'owners'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3 3 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path>
                <circle cx="7" cy="17" r="2"></circle>
                <circle cx="17" cy="17" r="2"></circle>
              </svg>
              <span>Vehicle Registry ({ownersCount})</span>
            </button>
            <button
              className={`view-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
              role="tab"
              aria-selected={activeTab === 'analytics'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              <span>Analytics</span>
            </button>
            <button
              className={`view-tab-btn ${activeTab === 'database' ? 'active' : ''}`}
              onClick={() => setActiveTab('database')}
              role="tab"
              aria-selected={activeTab === 'database'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
              </svg>
              <span>PostgreSQL</span>
            </button>
            {currentUser?.role === 'admin' && (
              <button
                className={`view-tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin')}
                role="tab"
                aria-selected={activeTab === 'admin'}
                style={{ color: '#FBBF24', borderColor: 'rgba(245, 158, 11, 0.4)' }}
              >
                <span>🛡️ Admin Command</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Active Received Bay Banner (Displayed Out on the Webpage) */}
        <ActiveBayBanner
          bookings={myBookings}
          onCancelBooking={handleCancelBooking}
          locations={locations}
          onViewReceipt={(rcpt) => {
            setCurrentReceipt(rcpt);
            setIsReceiptModalOpen(true);
          }}
        />

        {/* Public Hero / Service Area Explanation Banner */}
        <HeroLandingBanner
          currentUser={currentUser}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          locations={locations}
          totalAvailable={locations.reduce((sum, l) => sum + (l.availableSlots || 0), 0)}
          onSearchNeighborhood={(area) => {
            setSearchQuery(area);
            setActiveTab('search');
          }}
          onSelectFacility={(facId) => {
            handleSelectLocation(facId);
            setActiveTab('search');
          }}
        />
        {/* KPI Stats Overview */}
        <StatsCards slots={slots} totalRevenue={totalRevenue} />

        {/* View 0: Synchronized City Search & Real Interactive Map */}
        {activeTab === 'search' && (
          <AhmedabadCitySearch
            locations={locations}
            selectedLocationId={selectedLocationId}
            onSelectLocation={handleSelectLocation}
            onOpenBookModal={() => handleOpenBookModal()}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}

        {/* View 1: Map View */}
        {activeTab === 'map' && (
          <div className="map-view-section">
            <AhmedabadMapView
              locations={locations}
              selectedLocationId={selectedLocationId}
              onSelectLocation={handleSelectLocation}
            />
          </div>
        )}

        {/* View 2: Vehicle & Car Owners Hub */}
        {activeTab === 'owners' && (
          <VehicleOwnersView
            onOpenRegisterModal={() => {
              setEditingOwner(null);
              setIsVehicleOwnerModalOpen(true);
            }}
            onEditOwner={(owner) => {
              setEditingOwner(owner);
              setIsVehicleOwnerModalOpen(true);
            }}
            onQuickReserve={(owner) => {
              setPrefillBookingOwner(owner);
              setTargetSlot(null);
              setIsBookModalOpen(true);
            }}
            onNavigateToDbTable={() => setActiveTab('database')}
            showToast={showToast}
          />
        )}

        {/* View 3: Analytics View */}
        {activeTab === 'analytics' && (
          <AnalyticsView locations={locations} slots={slots} totalRevenue={totalRevenue} />
        )}

        {/* View 4: PostgreSQL Database Table Explorer */}
        {activeTab === 'database' && (
          <DatabaseTableViewer onOpenDbModal={() => setIsDbModalOpen(true)} />
        )}

        {/* View 5: Parking Bays Grid */}
        {activeTab === 'bays' && (
          <>
            {/* Executive Facility Toolbar */}
            {currentLocation && (
              <div className="executive-facility-bar">
                <div className="ef-left">
                  <div className="ef-code-badge">FACILITY #{currentLocation.id.toUpperCase()}</div>
                  <h2 className="ef-title">{currentLocation.name}</h2>
                  <p className="ef-address">📍 {currentLocation.address}</p>
                </div>

                <div className="ef-right">
                  <div className="tariff-card">
                    <span className="tariff-title">HOURLY TARIFF</span>
                    <span className="tariff-number">₹{currentLocation.hourlyRate}<small>/hr</small></span>
                  </div>

                  <div className="ef-actions-cluster">
                    <button 
                      className="btn-reserve-primary"
                      onClick={() => handleOpenBookModal()}
                    >
                      + Reserve Bay Here
                    </button>

                    <div className="sim-dropdown-wrap">
                      <button 
                        className="btn-sim-tool secondary" 
                        onClick={handleResetLot}
                        title="Reset slots to baseline dataset"
                      >
                        Reset Lot
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filter and Search Bar */}
            <FilterBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedZone={selectedZone}
              setSelectedZone={setSelectedZone}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              slots={slots}
            />

            {/* Parking Grid Display */}
            {filteredSlots.length === 0 ? (
              <div className="empty-filter-state">
                <div className="empty-icon">🔍</div>
                <h3>No Matching Parking Bays Found</h3>
                <p>Try searching for a different registration plate or reset active zone filters.</p>
                <button 
                  className="reset-filters-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedZone('ALL');
                    setStatusFilter('all');
                  }}
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="parking-grid">
                {filteredSlots.map((slot) => (
                  <ParkingSlotCard
                    key={slot.id}
                    slot={slot}
                    hourlyRate={currentLocation?.hourlyRate || 30}
                    currency="₹"
                    currentUser={currentUser}
                    onSelectAvailable={() => handleOpenBookModal(slot)}
                    onSelectOccupied={handleOpenCheckoutModal}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* View 6: Municipal Administration Command */}
        {activeTab === 'admin' && (
          <AdminView
            currentUser={currentUser}
            authToken={authToken}
            onRoleChanged={(role, token) => {
              if (currentUser) {
                const updated = { ...currentUser, role };
                setCurrentUser(updated);
                localStorage.setItem('amdavad_user', JSON.stringify(updated));
              }
              if (token) {
                setAuthToken(token);
                localStorage.setItem('amdavad_token', token);
              }
            }}
            showToast={showToast}
            onRefreshData={() => {
              fetchLocations();
              if (selectedLocationId) fetchCurrentLocation(selectedLocationId);
            }}
          />
        )}
      </main>

      {/* Executive Footer */}
      <footer className="footer-bar">
        <div className="footer-left">
          <span>Ahmedabad Municipal Corporation • Smart Mobility & Parking Directorate</span>
          <span className="footer-sep">•</span>
          <button className="footer-link-btn" onClick={() => setIsDbModalOpen(true)}>
            PostgreSQL Relational Schema (7 Tables, 104 Columns)
          </button>
        </div>
        <div className="footer-right">
          <span className="status-live-dot"></span>
          <span>Unified Backend Telemetry: ONLINE</span>
        </div>
      </footer>

      {/* Modals */}
      <DatabaseModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
      />

      <BookingFormModal
        isOpen={isBookModalOpen}
        onClose={() => {
          setIsBookModalOpen(false);
          setPrefillBookingOwner(null);
        }}
        location={currentLocation}
        targetSlot={targetSlot}
        currentUser={currentUser}
        authToken={authToken}
        prefillOwner={prefillBookingOwner}
        walletBalance={walletBalance}
        onBookingSuccess={handleBookingSuccess}
        onBalanceUpdated={(newBal) => setWalletBalance(newBal)}
        onOpenLogin={() => {
          setIsBookModalOpen(false);
          setIsLoginModalOpen(true);
        }}
        onOpenWalletTopup={() => {
          setIsBookModalOpen(false);
          setIsWalletModalOpen(true);
        }}
        onUserLoggedIn={(u, tok) => handleLoginSuccess(u, tok)}
      />

      <WalletTopupModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        currentUser={currentUser}
        authToken={authToken}
        walletBalance={walletBalance}
        onBalanceUpdated={(newBal) => setWalletBalance(newBal)}
        onOpenLogin={() => {
          setIsWalletModalOpen(false);
          setIsLoginModalOpen(true);
        }}
      />

      <VehicleOwnerModal
        isOpen={isVehicleOwnerModalOpen}
        onClose={() => {
          setIsVehicleOwnerModalOpen(false);
          setEditingOwner(null);
        }}
        initialData={editingOwner}
        onSuccess={(owner, action) => {
          checkDatabaseStatus();
          fetchLocations();
          showToast(
            action === 'updated'
              ? `Vehicle ${owner.carNumber || owner.car_number} updated in PostgreSQL.`
              : `Vehicle ${owner.carNumber || owner.car_number} & Owner ${owner.ownerName || owner.owner_name} saved to PostgreSQL (public.vehicle_owners)!`,
            'success'
          );
        }}
      />

      <VehiclesModal
        isOpen={isVehiclesModalOpen}
        onClose={() => setIsVehiclesModalOpen(false)}
        currentUser={currentUser}
        authToken={authToken}
        showToast={showToast}
        onOpenLogin={() => {
          setIsVehiclesModalOpen(false);
          setIsLoginModalOpen(true);
        }}
      />

      <MyBookingsModal
        isOpen={isMyBookingsOpen}
        onClose={() => setIsMyBookingsOpen(false)}
        bookings={myBookings}
        onSelectCheckout={handleCheckoutFromBookings}
        onCancelBooking={handleCancelBooking}
        currentUser={currentUser}
        onOpenLogin={() => {
          setIsMyBookingsOpen(false);
          setIsLoginModalOpen(true);
        }}
      />

      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        slot={selectedOccupiedSlot}
        location={currentLocation}
        currentUser={currentUser}
        authToken={authToken}
        onCheckoutConfirm={handleCheckoutConfirm}
      />

      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receipt={currentReceipt}
      />
    </div>
  );
}
