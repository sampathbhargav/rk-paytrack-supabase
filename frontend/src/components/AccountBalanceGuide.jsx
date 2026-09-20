import { formatMoney } from "../utils/moneyUtils";
import "./AccountBalanceGuide.css";

export default function AccountBalanceGuide({ deal, collectionSummary }) {
  const active = deal.status === "Active";
  const available = active && collectionSummary.hasSchedule;
  const needsAttention = available && collectionSummary.dueNow > 0;
  const tone = !available ? "review" : needsAttention ? "attention" : "clear";
  const status = !active ? deal.status || "Review status" : !available
    ? "Schedule needs review" : needsAttention ? "Collection outstanding" : "Nothing due now";
  const guidance = !active
    ? "Review this deal’s status and payment history before collecting. The current-due summary is available for Active deals."
    : !available
      ? "Check the schedule details below before collecting. A current-due amount cannot be confirmed without a valid schedule."
      : needsAttention
        ? "Review the payment schedule and promise history below before recording a payment or following up with the customer."
        : "No open scheduled installments or active promises are due as of today. Future installments may still remain.";

  return (
    <section className={`account-attention account-attention--${tone}`} aria-label="What needs attention now?">
      <div className="account-attention-heading">
        <h3>What needs attention now?</h3>
        <span className="account-attention-status">{status}</span>
      </div>
      <div className="account-attention-content">
        <div className="account-attention-total">
          <span>Outstanding through today</span>
          <strong>{available ? formatMoney(collectionSummary.dueNow) : "Needs review"}</strong>
          <small>{available ? "Open scheduled amounts and active promises dated today or earlier." : "Amount unavailable"}</small>
        </div>
        <div className="account-attention-guidance">
          <strong>{needsAttention ? "Before you follow up" : available ? "Account is current on amounts due" : "Review needed"}</strong>
          <p>{guidance}</p>
        </div>
      </div>
      <p className="account-attention-note">
        <strong>Reading this amount:</strong> Future installments are included in Total Deal Balance, not this current-due amount.
        Promises are part of existing debt and are counted only once. Voided payments do not reduce what is owed.
      </p>
    </section>
  );
}
