import "./CustomerAccountLoading.css";

export default function CustomerAccountLoading({ onBack }) {
  return (
    <div className="account-loading">
      <button type="button" className="account-loading-back" onClick={onBack}>← Back</button>
      <div className="account-loading-status" role="status" aria-live="polite">
        <span className="account-loading-icon" aria-hidden="true">
          <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="5" y="3" width="14" height="18" rx="3" />
            <path d="M9 8h6M9 12h6M9 16h3" />
          </svg>
        </span>
        <div className="account-loading-status-copy">
          <span className="account-loading-eyebrow">RK PayTrack · Deal overview</span>
          <strong>Opening a customer deal</strong>
          <p>Getting the details, payment history and promises ready.</p>
        </div>
        <span className="account-loading-spinner" aria-hidden="true" />
      </div>
      <div className="account-loading-layout" aria-hidden="true">
        <div className="account-loading-card account-loading-sidebar">
          <div className="account-loading-placeholder account-loading-avatar" />
          <div className="account-loading-placeholder account-loading-title" />
          <div className="account-loading-placeholder account-loading-short" />
          <div className="account-loading-placeholder account-loading-balance" />
          {Array.from({ length: 4 }, (_, index) => <div className="account-loading-field" key={index}>
            <div className="account-loading-placeholder account-loading-short" />
            <div className="account-loading-placeholder" />
          </div>)}
        </div>
        <div className="account-loading-main">
          <div className="account-loading-card">
            <div className="account-loading-placeholder account-loading-short" />
            <div className="account-loading-placeholder account-loading-title" />
            <div className="account-loading-placeholder account-loading-progress" />
            <div className="account-loading-metrics">
              {Array.from({ length: 6 }, (_, index) => <div className="account-loading-placeholder account-loading-metric" key={index} />)}
            </div>
          </div>
          <div className="account-loading-card">
            <div className="account-loading-placeholder account-loading-title" />
            {Array.from({ length: 4 }, (_, index) => <div className="account-loading-placeholder account-loading-row" key={index} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
