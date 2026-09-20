import { formatMoney } from '../utils/moneyUtils';
import './PaymentReviewPanel.css';

export default function PaymentReviewPanel({ customer, dealTag, date, method, amount,
  balanceBefore, balanceAfter, installmentAfter, promisedDate, valid, allocations }) {
  return <section className="payment-review" aria-label="Review payment before saving">
    <header><span className="payment-review-eyebrow">Before you save</span>
      <h3>Review this payment</h3>
      <p>Confirm the account, date and method. Final balances are confirmed after the payment is saved.</p>
    </header>
    <dl className="payment-review-details">
      <div><dt>Customer / deal</dt><dd>{customer} · #{dealTag || '—'}</dd></div>
      <div><dt>Payment date</dt><dd>{date || 'Not selected'}</dd></div>
      <div><dt>Method</dt><dd>{method || 'Not selected'}</dd></div>
      <div><dt>{method === 'Referral Credit' ? 'Credit to apply' : 'Payment to record'}</dt><dd>{formatMoney(amount)}</dd></div>
    </dl>
    <div className="payment-review-balances">
      <div><span>Total deal balance before</span><strong>{formatMoney(balanceBefore)}</strong><small>Includes future installments.</small></div>
      <div><span>Estimated deal balance after</span><strong>{valid ? formatMoney(balanceAfter) : 'Check payment details'}</strong><small>Based on the currently loaded account.</small></div>
      <div><span>Selected installment after</span><strong>{valid ? formatMoney(installmentAfter) : '—'}</strong><small>{valid && installmentAfter > 0 ? `Promise date: ${promisedDate || 'Required'}` : 'Other unpaid installments may remain.'}</small></div>
    </div>
    <p className="payment-review-note">{allocations > 1 ? `This payment is split across ${allocations} installments. Review the allocation table above.` : 'Review the selected installment and allocation above.'} Promised amounts are part of the balance, not extra debt.</p>
  </section>;
}
