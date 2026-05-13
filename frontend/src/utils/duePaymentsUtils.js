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

export function getDealDueSchedule(deal) {
  if (!deal.start_date || !deal.due_day || !deal.term) {
    return [];
  }

  const term = Math.floor(Number(deal.term || 0));

  if (term <= 0) {
    return [];
  }

  const dueDates = [];

  for (let i = 1; i <= term; i++) {
    const dueDate = createDueDate(deal.start_date, deal.due_day, i);

    dueDates.push({
      installmentNumber: i,
      dueDate: formatDateLocal(dueDate),
      amountDue: Number(deal.monthly_payment || 0),
    });
  }

  return dueDates;
}

export function getDueDealsForDate(deals, payments, selectedDate) {
  return deals
    .filter((deal) => {
      if (deal.status !== "Active") return false;
      if (deal.deal_type === "Cash") return false;
      if (!deal.start_date) return false;
      if (!deal.due_day) return false;
      if (!deal.term) return false;
      if (!deal.monthly_payment) return false;

      return true;
    })
    .flatMap((deal) => {
      const schedule = getDealDueSchedule(deal);

      return schedule
        .filter((item) => item.dueDate === selectedDate)
        .map((scheduleItem) => {
          const paidForDueDate = payments
            .filter(
              (payment) =>
                payment.deal_id === deal.id &&
                payment.due_date === selectedDate &&
                payment.payment_status !== "Voided"
            )
            .reduce(
              (sum, payment) => sum + Number(payment.amount_paid || 0),
              0
            );

          const remainingForDueDate = Math.max(
            Number(scheduleItem.amountDue || 0) - paidForDueDate,
            0
          );

          let status = "Due";

          if (paidForDueDate >= scheduleItem.amountDue) {
            status = "Paid";
          } else if (
            paidForDueDate > 0 &&
            paidForDueDate < scheduleItem.amountDue
          ) {
            status = "Partial";
          }

          return {
            deal,
            installmentNumber: scheduleItem.installmentNumber,
            dueDate: scheduleItem.dueDate,
            amountDue: scheduleItem.amountDue,
            paidForDueDate,
            remainingForDueDate,
            status,
          };
        });
    });
}

export function getPastDueScheduledPayments(deals, payments, todayDate) {
  const today = new Date(`${todayDate}T00:00:00`);

  return deals
    .filter((deal) => {
      if (deal.status !== "Active") return false;
      if (deal.deal_type === "Cash") return false;
      if (!deal.start_date) return false;
      if (!deal.due_day) return false;
      if (!deal.term) return false;
      if (!deal.monthly_payment) return false;

      return true;
    })
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
                payment.deal_id === deal.id &&
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
          };
        })
        .filter(Boolean);
    })
    .sort((a, b) => b.daysLate - a.daysLate);
}