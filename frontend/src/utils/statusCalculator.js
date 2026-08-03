export function calculatePaymentType({
  amountDue,
  amountPaid,
  promisedDate,
  paymentFrequency,
}) {
  const due = Number(amountDue || 0);
  const paid = Number(amountPaid || 0);
  const frequency = paymentFrequency || "Monthly";

  if (due <= 0) {
    return "Invalid Payment";
  }

  if (paid >= due) {
    return getFullPaymentLabel(frequency);
  }

  if (paid > 0 && paid < due && promisedDate) {
    return getPartialPromiseLabel(frequency);
  }

  if (paid > 0 && paid < due && !promisedDate) {
    return getPartialNoPromiseLabel(frequency);
  }

  if (paid === 0 && promisedDate) {
    return getDeferredPaymentLabel(frequency);
  }

  return "Unpaid";
}

function getFullPaymentLabel(paymentFrequency) {
  if (paymentFrequency === "Biweekly") {
    return "Full Biweekly Payment";
  }

  if (paymentFrequency === "One-Time") {
    return "Full One-Time Payment";
  }

  return "Full Payment";
}

function getPartialPromiseLabel(paymentFrequency) {
  if (paymentFrequency === "Biweekly") {
    return "Partial Biweekly Payment - Promise Pending";
  }

  if (paymentFrequency === "One-Time") {
    return "Partial One-Time Payment - Promise Pending";
  }

  return "Partial Payment - Promise Pending";
}

function getPartialNoPromiseLabel(paymentFrequency) {
  if (paymentFrequency === "Biweekly") {
    return "Partial Biweekly Payment - No Promise Date";
  }

  if (paymentFrequency === "One-Time") {
    return "Partial One-Time Payment - No Promise Date";
  }

  return "Partial Payment - No Promise Date";
}

function getDeferredPaymentLabel(paymentFrequency) {
  if (paymentFrequency === "Biweekly") {
    return "Deferred Biweekly Payment";
  }

  if (paymentFrequency === "One-Time") {
    return "Deferred One-Time Payment";
  }

  return "Deferred Payment";
}