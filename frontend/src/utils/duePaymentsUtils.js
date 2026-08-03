function formatDateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getLastDayOfMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function createDueDate(startDate, dueDay, monthOffset) {
  const start = new Date(`${startDate}T00:00:00`);

  const targetYear = start.getFullYear();
  const targetMonth = start.getMonth() + monthOffset;

  const calculatedDate = new Date(targetYear, targetMonth, 1);

  const year = calculatedDate.getFullYear();
  const month = calculatedDate.getMonth();

  const lastDay = getLastDayOfMonth(year, month);
  const safeDueDay = Math.min(Number(dueDay), lastDay);

  return new Date(year, month, safeDueDay);
}

function createBiweeklyDueDate(firstPaymentDate, installmentIndex) {
  const firstDate = new Date(`${firstPaymentDate}T00:00:00`);
  const dueDate = new Date(firstDate);

  dueDate.setDate(firstDate.getDate() + installmentIndex * 14);

  return dueDate;
}

function normalizePaymentFrequency(deal) {
  if (deal?.deal_type === "Cash") return "Cash";

  if (deal?.deal_type === "Registration Money") {
    return "One-Time";
  }

  return deal?.payment_frequency || deal?.paymentFrequency || "Monthly";
}

function getPaymentAmount(deal) {
  return Number(deal?.monthly_payment || deal?.monthlyPayment || 0);
}

function isCashDeal(deal) {
  return deal?.deal_type === "Cash" || normalizePaymentFrequency(deal) === "Cash";
}

function isRegistrationMoneyDeal(deal) {
  return (
    deal?.deal_type === "Registration Money" ||
    normalizePaymentFrequency(deal) === "One-Time"
  );
}

function isBiweeklyDeal(deal) {
  return normalizePaymentFrequency(deal) === "Biweekly";
}

function isMonthlyDeal(deal) {
  return normalizePaymentFrequency(deal) === "Monthly";
}

function getFirstPaymentDate(deal) {
  return deal?.first_payment_date || deal?.firstPaymentDate || deal?.start_date || "";
}

function isScheduledDealReady(deal) {
  if (!deal) return false;
  if (deal.status !== "Active") return false;
  if (isCashDeal(deal)) return false;

  const paymentAmount = getPaymentAmount(deal);

  if (paymentAmount <= 0) return false;

  if (isRegistrationMoneyDeal(deal)) {
    return Boolean(deal.start_date || deal.first_payment_date);
  }

  if (!deal.term || Number(deal.term) <= 0) return false;

  if (isBiweeklyDeal(deal)) {
    return Boolean(getFirstPaymentDate(deal));
  }

  if (isMonthlyDeal(deal)) {
    return Boolean(deal.start_date && deal.due_day);
  }

  return Boolean(deal.start_date && deal.due_day);
}

export function getDealDueSchedule(deal) {
  if (!deal || isCashDeal(deal)) {
    return [];
  }

  const paymentAmount = getPaymentAmount(deal);

  if (paymentAmount <= 0) {
    return [];
  }

  if (isRegistrationMoneyDeal(deal)) {
    const oneTimeDate = deal.first_payment_date || deal.start_date;

    if (!oneTimeDate) {
      return [];
    }

    return [
      {
        installmentNumber: 1,
        dueDate: oneTimeDate,
        amountDue: paymentAmount,
        paymentFrequency: "One-Time",
      },
    ];
  }

  const term = Math.floor(Number(deal.term || 0));

  if (term <= 0) {
    return [];
  }

  if (isBiweeklyDeal(deal)) {
    const firstPaymentDate = getFirstPaymentDate(deal);

    if (!firstPaymentDate) {
      return [];
    }

    const dueDates = [];

    for (let i = 0; i < term; i++) {
      const dueDate = createBiweeklyDueDate(firstPaymentDate, i);

      dueDates.push({
        installmentNumber: i + 1,
        dueDate: formatDateLocal(dueDate),
        amountDue: paymentAmount,
        paymentFrequency: "Biweekly",
      });
    }

    return dueDates;
  }

  if (!deal.start_date || !deal.due_day) {
    return [];
  }

  const dueDates = [];

  for (let i = 1; i <= term; i++) {
    const dueDate = createDueDate(deal.start_date, deal.due_day, i);

    dueDates.push({
      installmentNumber: i,
      dueDate: formatDateLocal(dueDate),
      amountDue: paymentAmount,
      paymentFrequency: "Monthly",
    });
  }

  return dueDates;
}

export function getDueDealsForDate(deals, payments, selectedDate) {
  return deals
    .filter(isScheduledDealReady)
    .flatMap((deal) => {
      const schedule = getDealDueSchedule(deal);

      return schedule
        .filter((item) => item.dueDate === selectedDate)
        .map((scheduleItem) => {
          const paidForDueDate = payments
            .filter(
              (payment) =>
                String(payment.deal_id) === String(deal.id) &&
                payment.due_date === selectedDate &&
                payment.payment_status !== "Voided"
            )
            .reduce(
              (sum, payment) => sum + Number(payment.amount_paid || 0),
              0
            );

          const amountDue = Number(scheduleItem.amountDue || 0);

          const remainingForDueDate = Math.max(
            amountDue - paidForDueDate,
            0
          );

          let status = "Due";

          if (paidForDueDate >= amountDue) {
            status = "Paid";
          } else if (paidForDueDate > 0 && paidForDueDate < amountDue) {
            status = "Partial";
          }

          return {
            deal,
            installmentNumber: scheduleItem.installmentNumber,
            dueDate: scheduleItem.dueDate,
            amountDue,
            paidForDueDate,
            remainingForDueDate,
            status,
            paymentFrequency: scheduleItem.paymentFrequency,
          };
        });
    });
}

export function getPastDueScheduledPayments(deals, payments, todayDate) {
  const today = new Date(`${todayDate}T00:00:00`);

  return deals
    .filter(isScheduledDealReady)
    .flatMap((deal) => {
      const schedule = getDealDueSchedule(deal);

      return schedule
        .filter((installment) => {
          const dueDate = new Date(`${installment.dueDate}T00:00:00`);
          return dueDate < today;
        })
        .map((installment) => {
          const paidForDueDate = payments
            .filter(
              (payment) =>
                String(payment.deal_id) === String(deal.id) &&
                payment.due_date === installment.dueDate &&
                payment.payment_status !== "Voided"
            )
            .reduce(
              (sum, payment) => sum + Number(payment.amount_paid || 0),
              0
            );

          const amountDue = Number(installment.amountDue || 0);

          const remainingForDueDate = Math.max(
            amountDue - paidForDueDate,
            0
          );

          if (remainingForDueDate <= 0) {
            return null;
          }

          const dueDate = new Date(`${installment.dueDate}T00:00:00`);
          const diffMs = today - dueDate;
          const daysLate = Math.floor(diffMs / (1000 * 60 * 60 * 24));

          let status = "Past Due";

          if (paidForDueDate > 0) {
            status = "Past Due - Partial";
          }

          return {
            deal,
            installmentNumber: installment.installmentNumber,
            dueDate: installment.dueDate,
            amountDue,
            paidForDueDate,
            remainingForDueDate,
            daysLate,
            status,
            paymentFrequency: installment.paymentFrequency,
          };
        })
        .filter(Boolean);
    })
    .sort((a, b) => b.daysLate - a.daysLate);
}