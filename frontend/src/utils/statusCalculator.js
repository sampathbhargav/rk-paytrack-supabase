export function calculatePaymentType({ amountDue, amountPaid, promisedDate }) {
    const due = Number(amountDue || 0);
    const paid = Number(amountPaid || 0);
  
    if (paid >= due) {
      return "Full Payment";
    }
  
    if (paid > 0 && paid < due && promisedDate) {
      return "Partial Payment - Promise Pending";
    }
  
    if (paid > 0 && paid < due && !promisedDate) {
      return "Partial Payment - No Promise Date";
    }
  
    if (paid === 0 && promisedDate) {
      return "Deferred Payment";
    }
  
    return "Unpaid";
  }