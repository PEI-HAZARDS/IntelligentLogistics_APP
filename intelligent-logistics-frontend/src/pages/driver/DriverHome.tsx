import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  MapPin,
  Clock,
  Package,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Navigation,
  QrCode,
  Loader2,
  ChevronRight,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { getMyActiveArrival, getMyTodayArrivals, claimArrival } from '@/services/drivers';
import type { Appointment, ClaimAppointmentResponse } from '@/types/types';

// Map status to English
function mapStatusToLabel(status: string): string {
  const statusMap: Record<string, string> = {
    in_transit: 'In Transit',
    delayed: 'Delayed',
    completed: 'Completed',
    canceled: 'Canceled',
  };
  return statusMap[status] || status;
}

// Get status color class
function getStatusClass(status: string): string {
  switch (status) {
    case 'completed':
      return 'status-completed';
    case 'delayed':
      return 'status-delayed';
    case 'canceled':
      return 'status-canceled';
    default:
      return 'status-in-transit';
  }
}

export default function DriverHome() {
  const navigate = useNavigate();

  // User info from localStorage
  const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
  const driversLicense = userInfo.drivers_license;
  const driverName = userInfo.name || 'Driver';

  // State
  const [activeArrival, setActiveArrival] = useState<Appointment | null>(null);
  const [todayArrivals, setTodayArrivals] = useState<Appointment[]>([]);
  const [claimResult, setClaimResult] = useState<ClaimAppointmentResponse | null>(null);
  const [pinCode, setPinCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!driversLicense) {
      setError('Session expired. Please log in again.');
      setIsLoading(false);
      return;
    }

    setError(null);
    try {
      const [active, today] = await Promise.all([
        getMyActiveArrival(driversLicense),
        getMyTodayArrivals(driversLicense),
      ]);

      setActiveArrival(active);
      setTodayArrivals(today);
    } catch (err) {
      console.error('Failed to fetch driver data:', err);
      setError('Failed to load data. Pull to refresh.');
    } finally {
      setIsLoading(false);
    }
  }, [driversLicense]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle PIN claim
  const handleClaimArrival = async () => {
    if (!pinCode.trim()) {
      setError('Please enter the PIN code.');
      return;
    }

    setIsClaiming(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await claimArrival(driversLicense, {
        arrival_id: pinCode.trim(),
      });

      setClaimResult(result);
      setSuccessMessage('Arrival registered successfully!');
      setPinCode('');

      // Refresh data
      await fetchData();
    } catch (err: unknown) {
      console.error('Failed to claim arrival:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number; data?: { detail?: string } } };
        if (axiosError.response?.status === 404) {
          setError('PIN code not found. Please check the code.');
        } else if (axiosError.response?.status === 400) {
          setError(axiosError.response?.data?.detail || 'Invalid PIN code.');
        } else {
          setError('Failed to register arrival. Please try again.');
        }
      } else {
        setError('Connection error. Please check your network.');
      }
    } finally {
      setIsClaiming(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    navigate('/login');
  };

  // Handle refresh
  const handleRefresh = () => {
    setIsLoading(true);
    fetchData();
  };

  return (
    <div className="driver-home">
      {/* Header */}
      <header className="driver-header">
        <div className="header-content">
          <div className="header-left">
            <Truck size={28} />
            <div className="header-text">
              <h1>Intelligent Logistics</h1>
              <span className="driver-name">Hello, {driverName}</span>
            </div>
          </div>
          <div className="header-actions">
            <button className="icon-btn" onClick={handleRefresh} disabled={isLoading}>
              {isLoading ? <Loader2 size={20} className="spin" /> : <RefreshCw size={20} />}
            </button>
            <button className="icon-btn logout" onClick={handleLogout}>
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="driver-main">
        {/* Error Message */}
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="alert alert-success">
            <CheckCircle size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* PIN Claim Section */}
        <section className="claim-section">
          <div className="section-header">
            <QrCode size={20} />
            <h2>Register Arrival</h2>
          </div>
          <div className="claim-form">
            <input
              type="text"
              placeholder="PIN Code / Arrival ID"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value.toUpperCase())}
              className="pin-input"
              disabled={isClaiming}
            />
            <button
              className="claim-btn"
              onClick={handleClaimArrival}
              disabled={isClaiming || !pinCode.trim()}
            >
              {isClaiming ? (
                <>
                  <Loader2 size={18} className="spin" />
                  Registering...
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  Register
                </>
              )}
            </button>
          </div>
        </section>

        {/* Claim Result - Navigation Info */}
        {claimResult && (
          <section className="navigation-card">
            <div className="section-header">
              <Navigation size={20} />
              <h2>Navigation Instructions</h2>
            </div>
            <div className="navigation-content">
              <div className="nav-row">
                <span className="nav-label">License Plate:</span>
                <span className="nav-value">{claimResult.license_plate}</span>
              </div>
              {claimResult.dock_bay_number && (
                <div className="nav-row">
                  <span className="nav-label">Dock:</span>
                  <span className="nav-value highlight">{claimResult.dock_bay_number}</span>
                </div>
              )}
              {claimResult.dock_location && (
                <div className="nav-row">
                  <span className="nav-label">Location:</span>
                  <span className="nav-value">{claimResult.dock_location}</span>
                </div>
              )}
              {claimResult.cargo_description && (
                <div className="nav-row">
                  <span className="nav-label">Cargo:</span>
                  <span className="nav-value">{claimResult.cargo_description}</span>
                </div>
              )}
              {claimResult.navigation_url && (
                <a
                  href={claimResult.navigation_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="navigation-link"
                >
                  <MapPin size={18} />
                  Open GPS Navigation
                </a>
              )}
            </div>
          </section>
        )}

        {/* Active Arrival */}
        {activeArrival && (
          <section className="active-arrival">
            <div className="section-header">
              <AlertTriangle size={20} className="active-icon" />
              <h2>Active Arrival</h2>
            </div>
            <div className="arrival-card active">
              <div className="arrival-row">
                <Truck size={18} />
                <span className="plate">{activeArrival.truck_license_plate}</span>
                <span className={`status-badge ${getStatusClass(activeArrival.status)}`}>
                  {mapStatusToLabel(activeArrival.status)}
                </span>
              </div>
              <div className="arrival-details">
                <div className="detail-item">
                  <Clock size={16} />
                  <span>
                    {activeArrival.scheduled_start_time
                      ? new Date(activeArrival.scheduled_start_time).toLocaleString('pt-PT', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                      : '--:--'}
                  </span>
                </div>
                <div className="detail-item">
                  <MapPin size={16} />
                  <span>{activeArrival.gate_in?.label || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <Package size={16} />
                  <span>{activeArrival.booking?.reference || 'N/A'}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Today's Arrivals */}
        <section className="today-arrivals">
          <div className="section-header">
            <Calendar size={20} />
            <h2>Today's Arrivals</h2>
            <span className="count-badge">{todayArrivals.length}</span>
          </div>

          {isLoading && todayArrivals.length === 0 ? (
            <div className="loading-state">
              <Loader2 size={24} className="spin" />
              <span>Loading arrivals...</span>
            </div>
          ) : todayArrivals.length === 0 ? (
            <div className="empty-state">
              <Package size={32} />
              <span>No arrivals scheduled for today.</span>
            </div>
          ) : (
            <div className="arrivals-list">
              {todayArrivals.map((arrival) => (
                <div key={arrival.id} className="arrival-card">
                  <div className="arrival-row">
                    <span className="plate">{arrival.truck_license_plate}</span>
                    <span className={`status-badge ${getStatusClass(arrival.status)}`}>
                      {mapStatusToLabel(arrival.status)}
                    </span>
                  </div>
                  <div className="arrival-info">
                    <div className="info-item">
                      <Clock size={14} />
                      {arrival.scheduled_start_time
                        ? new Date(arrival.scheduled_start_time).toLocaleTimeString('pt-PT', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                        : '--:--'}
                    </div>
                    <div className="info-item">
                      <MapPin size={14} />
                      {arrival.gate_in?.label || 'N/A'}
                    </div>
                    <div className="info-item">
                      <Package size={14} />
                      {arrival.booking?.reference || 'N/A'}
                    </div>
                  </div>
                  <ChevronRight size={20} className="chevron" />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <style>{`
        .driver-home {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #e2e8f0;
        }

        .driver-header {
          background: rgba(15, 23, 42, 0.95);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding: 1rem;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 600px;
          margin: 0 auto;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .header-left svg {
          color: #0ea5e9;
        }

        .header-text h1 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
        }

        .driver-name {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .header-actions {
          display: flex;
          gap: 0.5rem;
        }

        .icon-btn {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 8px;
          padding: 0.5rem;
          color: #e2e8f0;
          cursor: pointer;
          transition: all 0.2s;
        }

        .icon-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .icon-btn.logout {
          color: #f87171;
        }

        .driver-main {
          max-width: 600px;
          margin: 0 auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
        }

        .alert-error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
        }

        .alert-success {
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #86efac;
        }

        section {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1rem;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .section-header h2 {
          font-size: 0.875rem;
          font-weight: 600;
          margin: 0;
        }

        .section-header svg {
          color: #0ea5e9;
        }

        .active-icon {
          color: #fbbf24 !important;
        }

        .count-badge {
          background: #0ea5e9;
          color: white;
          font-size: 0.75rem;
          padding: 0.125rem 0.5rem;
          border-radius: 999px;
          margin-left: auto;
        }

        .claim-form {
          display: flex;
          gap: 0.5rem;
        }

        .pin-input {
          flex: 1;
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 0.75rem 1rem;
          color: white;
          font-size: 1rem;
          text-transform: uppercase;
        }

        .pin-input::placeholder {
          color: #64748b;
          text-transform: none;
        }

        .claim-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%);
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .claim-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .navigation-card {
          background: rgba(14, 165, 233, 0.1);
          border-color: rgba(14, 165, 233, 0.3);
        }

        .navigation-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .nav-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
        }

        .nav-label {
          color: #94a3b8;
        }

        .nav-value {
          font-weight: 500;
        }

        .nav-value.highlight {
          color: #0ea5e9;
          font-size: 1rem;
          font-weight: 700;
        }

        .navigation-link {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: #0ea5e9;
          color: white;
          padding: 0.75rem;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          margin-top: 0.5rem;
        }

        .active-arrival .section-header {
          color: #fbbf24;
        }

        .arrival-card {
          background: rgba(15, 23, 42, 0.5);
          border-radius: 8px;
          padding: 0.75rem;
          position: relative;
        }

        .arrival-card.active {
          background: rgba(251, 191, 36, 0.1);
          border: 1px solid rgba(251, 191, 36, 0.3);
        }

        .arrival-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .plate {
          font-weight: 600;
          flex: 1;
        }

        .status-badge {
          font-size: 0.75rem;
          padding: 0.125rem 0.5rem;
          border-radius: 999px;
        }

        .status-in-transit {
          background: rgba(59, 130, 246, 0.2);
          color: #93c5fd;
        }

        .status-delayed {
          background: rgba(251, 191, 36, 0.2);
          color: #fcd34d;
        }

        .status-completed {
          background: rgba(34, 197, 94, 0.2);
          color: #86efac;
        }

        .status-canceled {
          background: rgba(239, 68, 68, 0.2);
          color: #fca5a5;
        }

        .arrival-details, .arrival-info {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .detail-item, .info-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .arrivals-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .arrivals-list .arrival-card {
          display: flex;
          flex-direction: column;
          cursor: pointer;
          transition: all 0.2s;
        }

        .arrivals-list .arrival-card:hover {
          background: rgba(15, 23, 42, 0.8);
        }

        .chevron {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
        }

        .loading-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 2rem;
          color: #64748b;
          text-align: center;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
