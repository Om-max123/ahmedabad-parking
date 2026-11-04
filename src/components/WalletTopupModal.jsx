import React, { useState, useEffect, useCallback } from 'react';
import { playSound } from '../utils/sound';

export default function WalletTopupModal({
  isOpen,
  onClose,
  currentUser,
  authToken,
  walletBalance,
  onBalanceUpdated,
  onOpenLogin,
}) {
  const [amount, setAmount] = useState(200);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [fetchingTx, setFetchingTx] = useState(false);

  const fetchWalletData = useCallback(async () => {
    if (!authToken && !currentUser) return;
    setFetchingTx(true);
    try {
      const headers = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/wallet/balance', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.balance !== undefined && onBalanceUpdated) {
          onBalanceUpdated(data.balance);
        }
        if (data.transactions) {
          setTransactions(data.transactions);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch wallet info:', err);
    } finally {
      setFetchingTx(false);
    }
  }, [authToken, currentUser, onBalanceUpdated]);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccessMsg('');
      fetchWalletData();
    }
  }, [isOpen, fetchWalletData]);

  if (!isOpen) return null;

  const handleTopup = async (e) => {
    e.preventDefault();
    if (!currentUser || !authToken) {
      setError('Please sign in with your driver profile to recharge your wallet.');
      return;
    }
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      setError('Please enter a valid top-up amount.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          amount: num,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to top-up wallet');
      }

      playSound('checkout');
      setSuccessMsg(`✓ ₹${num.toFixed(2)} added successfully via ${paymentMethod}! New balance: ₹${Number(data.newBalance).toFixed(2)}`);
      if (onBalanceUpdated) {
        onBalanceUpdated(data.newBalance);
      }
      fetchWalletData();
    } catch (err) {
      setError(err.message || 'Top-up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [100, 200, 500, 1000];

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="wallet-modal-title">
      <div className="modal-box wallet-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge wallet-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="2" y="4" width="20" height="16" rx="3"></rect>
                <path d="M16 12h.01"></path>
                <path d="M2 10h20"></path>
              </svg>
            </div>
            <div>
              <h2 id="wallet-modal-title" className="modal-title">Smart Mobility Digital Wallet</h2>
              <p className="modal-subtitle">Pre-pay parking tariffs & automated gate clearance • Ahmedabad</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={() => { playSound('click'); onClose(); }} aria-label="Close modal">✕</button>
        </div>

        {error && (
          <div className="modal-error-banner" role="alert" style={{ margin: '16px 24px 0' }}>
            <span>⚠️ {error}</span>
          </div>
        )}
        {successMsg && (
          <div className="modal-success-banner" role="status" style={{ margin: '16px 24px 0' }}>
            <span>{successMsg}</span>
          </div>
        )}

        {!currentUser ? (
          <div className="wallet-auth-prompt" style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div className="prompt-icon">🔐</div>
            <p className="prompt-title" style={{ fontSize: '18px', fontWeight: 600, color: '#F9FAFB', margin: '12px 0 6px' }}>
              Driver Sign In Required
            </p>
            <p className="prompt-desc" style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '20px' }}>
              Please sign in with your mobile number or vehicle plate to view and manage your Smart Parking Wallet.
            </p>
            <button
              type="button"
              className="primary-cta-btn"
              onClick={() => {
                onClose();
                if (onOpenLogin) onOpenLogin();
              }}
            >
              Sign In Driver
            </button>
          </div>
        ) : (
          <div className="wallet-body">
            {/* Balance Overview Card */}
            <div className="wallet-balance-card">
              <div className="balance-top">
                <div className="balance-info-left">
                  <span className="balance-label">AVAILABLE SMART WALLET BALANCE</span>
                  <div className="balance-figure">
                    <span className="currency-symbol">₹</span>
                    <span className="balance-num">{(walletBalance ?? 500).toFixed(2)}</span>
                  </div>
                </div>
                <div className="balance-badge-active">
                  <span className="pulse-indicator-green"></span>
                  <span>Auto-Debit Active</span>
                </div>
              </div>
              <div className="balance-footer">
                <div className="wallet-user-detail">
                  <span>Driver: <strong>{currentUser.name}</strong></span>
                  <span>Plate: <strong className="plate-tag">{currentUser.carNumber}</strong></span>
                </div>
                <div className="wallet-engine-detail">
                  <span>PostgreSQL ACID Ledger</span>
                </div>
              </div>
            </div>

            {/* Quick Recharge Form */}
            <form onSubmit={handleTopup} className="wallet-topup-form">
              <h3 className="section-subheading">Instant Wallet Recharge</h3>

              <div className="quick-amount-buttons" role="group" aria-label="Quick recharge amounts">
                {quickAmounts.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className={`quick-amt-pill ${amount === q ? 'active' : ''}`}
                    onClick={() => { playSound('click'); setAmount(q); }}
                  >
                    + ₹{q}
                  </button>
                ))}
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="custom-amount-input" className="form-label">Custom Recharge Amount (₹)</label>
                  <input
                    id="custom-amount-input"
                    type="number"
                    min="10"
                    max="10000"
                    step="10"
                    className="form-input"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="payment-method-select" className="form-label">Payment Gateway</label>
                  <select
                    id="payment-method-select"
                    className="form-select"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                    <option value="FASTAG">Gujarat FASTag Linked Auto-Refill</option>
                    <option value="NETBANKING">Net Banking (HDFC, SBI, ICICI)</option>
                    <option value="CARD">Debit / Credit Card</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="btn-confirm-park topup-submit-btn"
                disabled={loading}
              >
                {loading ? 'Processing Transaction in PostgreSQL...' : `Recharge ₹${amount} to Smart Wallet`}
              </button>
            </form>

            {/* Recent Wallet Transactions Ledger */}
            <div className="wallet-tx-section">
              <div className="tx-section-header">
                <h4 className="section-subheading">Recent Wallet Ledger Transactions</h4>
                <span className="tx-counter">{transactions.length} records</span>
              </div>

              {fetchingTx ? (
                <div className="tx-loading">Loading audit records from PostgreSQL...</div>
              ) : transactions.length === 0 ? (
                <div className="tx-empty-state">No previous transactions found for this vehicle.</div>
              ) : (
                <div className="tx-list">
                  {transactions.slice(0, 6).map((tx) => (
                    <div key={tx.id} className="tx-item">
                      <div className={`tx-icon ${tx.type === 'CREDIT' ? 'credit' : 'debit'}`}>
                        {tx.type === 'CREDIT' ? '↓' : '↑'}
                      </div>
                      <div className="tx-details">
                        <div className="tx-desc">{tx.description}</div>
                        <div className="tx-meta">
                          <span>Ref: {tx.reference_id || tx.id}</span>
                          <span>•</span>
                          <span>{new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                      <div className={`tx-amount ${tx.type === 'CREDIT' ? 'credit' : 'debit'}`}>
                        {tx.type === 'CREDIT' ? '+' : '-'}₹{parseFloat(tx.amount).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
