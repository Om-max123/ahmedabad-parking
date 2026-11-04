import React from 'react';

export default function ReceiptModal({ isOpen, onClose, receipt }) {
  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box digital-receipt-modal" onClick={(e) => e.stopPropagation()}>
        {/* Apple Wallet / Google Pay Digital Receipt Card */}
        <div className="digital-receipt-card" id="printable-receipt">
          {/* Top Verification Header */}
          <div className="receipt-status-header">
            <div className="verified-icon-circle">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div className="receipt-brand-text">
              <h3>Ahmedabad Municipal Corporation</h3>
              <p>Urban Smart Parking & Mobility Authority</p>
            </div>
          </div>

          {/* Amount Paid Display */}
          <div className="receipt-amount-display">
            <span className="amount-label">TOTAL AMOUNT PAID</span>
            <div className="amount-value">₹{receipt.totalAmount?.toFixed(2) || '0.00'}</div>
            <div className="amount-pill">
              <span className="dot-green"></span>
              <span>PAID VIA {receipt.paymentMethod || 'UPI'} • TRANSACTION COMPLETE</span>
            </div>
          </div>

          <div className="receipt-divider"></div>

          {/* Key Transaction Meta */}
          <div className="receipt-details-list">
            <div className="receipt-row">
              <span className="r-label">Receipt Reference</span>
              <span className="r-val mono">{receipt.receiptId}</span>
            </div>

            <div className="receipt-row">
              <span className="r-label">Parking Facility</span>
              <span className="r-val">{receipt.locationName || 'Ahmedabad Smart Parking'}</span>
            </div>

            <div className="receipt-row">
              <span className="r-label">Parking Bay</span>
              <span className="r-val font-semibold">Bay {receipt.slotId} (Zone {receipt.zone})</span>
            </div>

            <div className="receipt-row">
              <span className="r-label">Vehicle Registration</span>
              <span className="r-val mono font-semibold">{receipt.plate}</span>
            </div>

            <div className="receipt-row">
              <span className="r-label">Driver Name</span>
              <span className="r-val">{receipt.driver || 'Registered Driver'}</span>
            </div>

            <div className="receipt-row">
              <span className="r-label">Entry Timestamp</span>
              <span className="r-val">{receipt.entryTime}</span>
            </div>

            <div className="receipt-row">
              <span className="r-label">Exit Timestamp</span>
              <span className="r-val">{receipt.exitTime}</span>
            </div>

            <div className="receipt-row">
              <span className="r-label">Total Duration</span>
              <span className="r-val font-semibold">{receipt.durationText}</span>
            </div>
          </div>

          <div className="receipt-divider"></div>

          {/* Tariff Breakdown & GST */}
          <div className="receipt-charges-breakdown">
            <div className="charge-row">
              <span>Base Parking Tariff</span>
              <span className="mono">₹{receipt.subtotal?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="charge-row">
              <span>Municipal GST (5.0%)</span>
              <span className="mono">₹{receipt.tax?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="charge-row total-row">
              <span>Net Invoiced Amount</span>
              <span className="mono bold">₹{receipt.totalAmount?.toFixed(2) || '0.00'}</span>
            </div>
          </div>

          {/* Exit Gate Barcode */}
          <div className="receipt-gate-barcode">
            <div className="barcode-visual"></div>
            <span className="barcode-subtext mono">{receipt.receiptId}</span>
            <p className="barcode-instruction">
              Scan this digital gate pass at the exit barrier sensor for automatic gate release.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="receipt-modal-actions">
          <button className="btn-print-action" onClick={handlePrint}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            <span>Print / Save Tax Invoice</span>
          </button>
          <button className="btn-done-action" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
