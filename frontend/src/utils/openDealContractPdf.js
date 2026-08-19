import { jsPDF } from "jspdf";
import { formatMoney } from "./moneyUtils";

export function openDealContractPdf(deal) {
  if (!deal) {
    throw new Error("Deal is required to generate contract.");
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
  });

  const dealType = String(deal.deal_type || "").toLowerCase();

  if (dealType.includes("down")) {
    buildDownFinanceContract(doc, deal);
  } else if (dealType.includes("in-house") || dealType.includes("inhouse")) {
    buildInHouseFinanceContract(doc, deal);
  } else {
    buildGeneralContract(doc, deal);
  }

  const pdfUrl = doc.output("bloburl");
  const pdfWindow = window.open(pdfUrl, "_blank");

  if (!pdfWindow) {
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `RK-Contract-${deal.deal_tag || "deal"}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    throw new Error("Popup blocked. PDF was downloaded instead.");
  }
}

function buildDownFinanceContract(doc, deal) {
  const schedule = getScheduleFromDeal(deal);

  const customerName = deal.customers?.customer_name || "Customer";
  const companyName = deal.customers?.company_name || "";
  const buyerDisplayName = companyName
    ? `${customerName} and ${companyName}`
    : customerName;

  const truckText = `${deal.year || ""} ${deal.truck || ""}`.trim() || "truck";
  const vin = deal.vin || "-";
  const totalAmount = Number(deal.total_amount || 0);
  const firstPayment = schedule[0] || null;
  const termText = getTermText(deal, schedule);
  const contractDate = formatDisplayDate(new Date().toISOString().slice(0, 10));

  const page = createPageWriter(doc, {
    marginLeft: 58,
    marginRight: 58,
    marginTop: 62,
    marginBottom: 54,
    fontSize: 14,
    lineHeight: 20,
  });

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.text("RK TRUCK AND TRAILER SALES", page.pageWidth / 2, page.y, {
    align: "center",
  });
  
  page.move(18);
  
  doc.setFont("times", "normal");
  doc.text("2727 WILLOWBROOK RD", page.pageWidth / 2, page.y, {
    align: "center",
  });
  
  page.move(18);
  
  doc.text("DALLAS, TX 75220", page.pageWidth / 2, page.y, {
    align: "center",
  });

  page.move(30);

  doc.text(contractDate, page.pageWidth - page.marginRight, page.y, {
    align: "right",
  });

  page.move(30);

  page.paragraph(
    `This letter is to certify that ${buyerDisplayName} entered into a DOWN FINANCE agreement for ${truckText} truck with VIN # ${vin} for ${formatMoney(
      totalAmount
    )}. The customer opted for down financing at 0% interest rate, and it will be paid in ${termText}${
      firstPayment
        ? `, with payments starting on ${formatContractDate(
            firstPayment.dueDate
          )}.`
        : "."
    }`
  );

  page.move(4);

  if (schedule.length > 0) {
    schedule.forEach((item) => {
      page.line(
        `${formatDisplayDate(item.dueDate)} in the amount of ${formatMoney(
          item.amountDue
        )}`
      );
    });
  } else {
    page.line("No payment schedule is available. Please verify the deal schedule.");
  }

  page.move(16);

  page.paragraph(
    "If the payment is late after the scheduled date, there will be a late fee surcharge in the amount of $20 per day added to the scheduled payment date."
  );

  page.move(4);

  doc.setFont("times", "bold");
  page.paragraph(
    "IN CASE OF DEFAULT, RK TRUCK AND TRAILER SALES HAS THE RIGHT TO REPOSSESS THE TRUCK AND PUT IT ON THE MARKET FOR SALE."
  );

  page.move(26);

  doc.setFont("times", "normal");
  page.line("X__________________________");

  page.move(8);

  page.line(`${customerName} (BUYER)`);

  if (companyName) {
    page.line(companyName);
  }
}

function buildInHouseFinanceContract(doc, deal) {
  const schedule = getScheduleFromDeal(deal);

  const customerName = deal.customers?.customer_name || "Customer";
  const truckText = `${deal.year || ""} ${deal.truck || ""}`.trim() || "truck";
  const vin = deal.vin || "-";

  const contractDate = formatDisplayDate(new Date().toISOString().slice(0, 10));

  const totalCost = getInHouseTotalCost(deal);
  const downPayment = getInHouseDownPayment(deal);
  const financedBalance = getInHouseFinancedBalance(
    deal,
    totalCost,
    downPayment
  );

  const monthlyPayment =
    Number(deal.monthly_payment || 0) ||
    (schedule.length > 0 ? Number(schedule[0].amountDue || 0) : 0);

  const term = Number(deal.term || schedule.length || 0);
  const firstPayment = schedule[0] || null;

  const page = createPageWriter(doc, {
    marginLeft: 58,
    marginRight: 58,
    marginTop: 62,
    marginBottom: 54,
    fontSize: 14,
    lineHeight: 20,
  });

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.text("RK TRUCK AND TRAILER SALES", page.pageWidth / 2, page.y, {
    align: "center",
  });
  
  page.move(18);
  
  doc.setFont("times", "normal");
  doc.text("2727 WILLOWBROOK RD", page.pageWidth / 2, page.y, {
    align: "center",
  });
  
  page.move(18);
  
  doc.text("DALLAS, TX 75220", page.pageWidth / 2, page.y, {
    align: "center",
  });

  page.move(30);

  doc.text(contractDate, page.pageWidth - page.marginRight, page.y, {
    align: "right",
  });

  page.move(30);

  page.paragraph(
    `This letter is to certify that ${customerName} purchased a truck, ${truckText} VIN # ${vin} from RK Truck and Trailer Sales. The total cost of the truck is ${formatMoney(
      totalCost
    )}${
      downPayment > 0
        ? ` and the customer paid ${formatMoney(downPayment)} down`
        : ""
    }. The rest customer opted for in-house financing for ${
      term || schedule.length || "the agreed"
    } months at 0% interest rate. The amount is ${formatMoney(
      financedBalance
    )} the customer will pay ${formatMoney(monthlyPayment)} monthly${
      firstPayment ? ` from ${formatLongDate(firstPayment.dueDate)}.` : "."
    }`
  );

  page.line("Customer supposed to pay according to the schedule below:");

  page.line(`The following is the balance of ${formatMoney(financedBalance)} :`);

  page.move(6);

  if (schedule.length > 0) {
    schedule.forEach((item) => {
      page.line(
        `${formatDisplayDate(item.dueDate)} in the amount of ${formatMoney(
          item.amountDue
        )}`
      );
    });
  } else {
    page.line("No payment schedule is available. Please verify the deal schedule.");
  }

  page.move(12);

  page.paragraph(
    `If the amount of ${formatMoney(financedBalance)} is paid in ${String(
      term || schedule.length || ""
    ).padStart(2, "0")} months, then there will be no interest charged.`
  );

  page.paragraph(
    "There will be a lien on the truck until the truck is completely paid off. If the payment is late than the scheduled date, there will be a late fee surcharge in the amount of $20 per day added on the scheduled payment date."
  );

  page.move(4);

  doc.setFont("times", "bold");
  page.paragraph(
    "IN CASE OF DEFAULT, RK TRUCK AND TRAILER SALES HAVE THE RIGHT TO REPOSSESS THE TRUCK AND PUT IT ON THE MARKET FOR SALE."
  );

  page.move(24);

  doc.setFont("times", "normal");
  page.line("X_________________________");
  page.line("RK TRUCK AND TRAILER SALES (SELLER)");

  page.move(14);

  page.line("X__________________________");
  page.line(`${customerName} (BUYER)`);
}

function buildGeneralContract(doc, deal) {
  const schedule = getScheduleFromDeal(deal);
  const copy = getContractCopy(deal);

  const customerName = deal.customers?.customer_name || "Customer";
  const companyName = deal.customers?.company_name || "";
  const buyerDisplayName = companyName
    ? `${customerName} / ${companyName}`
    : customerName;

  const truckText = `${deal.year || ""} ${deal.truck || ""}`.trim() || "vehicle";
  const vin = deal.vin || "-";
  const totalAmount = Number(deal.total_amount || 0);
  const contractDate = formatDisplayDate(new Date().toISOString().slice(0, 10));
  const dealTag = deal.deal_tag || "-";

  const page = createPageWriter(doc, {
    marginLeft: 58,
    marginRight: 58,
    marginTop: 58,
    marginBottom: 54,
    fontSize: 12,
    lineHeight: 17,
  });

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.text("RK TRUCK AND TRAILER SALES", page.pageWidth / 2, page.y, {
    align: "center",
  });

  page.move(16);

  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.text("2727 WILLOWBROOK RD", page.pageWidth / 2, page.y, {
    align: "center",
  });

  page.move(14);

  doc.text("DALLAS, TX 75220", page.pageWidth / 2, page.y, {
    align: "center",
  });

  page.move(20);

  doc.line(page.marginLeft, page.y, page.pageWidth - page.marginRight, page.y);

  page.move(24);

  doc.text(`Date: ${contractDate}`, page.marginLeft, page.y);
  doc.text(`Deal #: ${dealTag}`, page.pageWidth - page.marginRight, page.y, {
    align: "right",
  });

  page.move(34);

  doc.setFont("times", "bold");
  doc.setFontSize(15);
  doc.text(copy.title, page.pageWidth / 2, page.y, {
    align: "center",
  });

  page.move(28);

  doc.setFont("times", "normal");
  doc.setFontSize(12);

  page.paragraph(
    `This agreement is made between RK Truck and Trailer Sales and ${buyerDisplayName}. The agreement relates to ${truckText}, VIN # ${vin}, in the total amount of ${formatMoney(
      totalAmount
    )}.`
  );

  page.paragraph(copy.mainClause);

  page.move(8);

  doc.setFont("times", "bold");
  page.line("Payment Schedule");

  page.move(8);

  drawScheduleTable(doc, page, schedule);

  page.move(18);

  doc.setFont("times", "bold");
  page.line("Terms and Conditions");

  page.move(8);

  doc.setFont("times", "normal");

  page.paragraph(
    "1. The buyer agrees to make each payment on or before the scheduled payment date listed above."
  );

  page.paragraph(
    "2. If any payment is late after the scheduled payment date, a late fee surcharge of $20 per day will be added to the scheduled payment amount."
  );

  page.paragraph(`3. ${copy.defaultClause}`);

  page.move(34);

  drawSignatureBlocks(doc, page, customerName, companyName);
}

function drawScheduleTable(doc, page, schedule) {
  const x = page.marginLeft;
  const width = page.pageWidth - page.marginLeft - page.marginRight;
  const rowHeight = 24;
  const col1 = 90;
  const col2 = 170;
  const col3 = width - col1 - col2;

  page.ensureSpace(rowHeight * Math.min(schedule.length + 2, 10));

  doc.setFont("times", "bold");
  doc.setFontSize(11);

  doc.rect(x, page.y, width, rowHeight);
  doc.text("Payment #", x + 8, page.y + 16);
  doc.text("Due Date", x + col1 + 8, page.y + 16);
  doc.text("Amount Due", x + col1 + col2 + col3 - 8, page.y + 16, {
    align: "right",
  });

  doc.line(x + col1, page.y, x + col1, page.y + rowHeight);
  doc.line(x + col1 + col2, page.y, x + col1 + col2, page.y + rowHeight);

  page.move(rowHeight);

  doc.setFont("times", "normal");

  if (schedule.length === 0) {
    doc.rect(x, page.y, width, rowHeight);
    doc.text("No payment schedule available.", x + 8, page.y + 16);
    page.move(rowHeight);
    return;
  }

  schedule.forEach((item) => {
    page.ensureSpace(rowHeight);

    doc.rect(x, page.y, width, rowHeight);
    doc.text(String(item.installmentNumber || ""), x + 8, page.y + 16);
    doc.text(formatDisplayDate(item.dueDate), x + col1 + 8, page.y + 16);
    doc.text(formatMoney(item.amountDue), x + col1 + col2 + col3 - 8, page.y + 16, {
      align: "right",
    });

    doc.line(x + col1, page.y, x + col1, page.y + rowHeight);
    doc.line(x + col1 + col2, page.y, x + col1 + col2, page.y + rowHeight);

    page.move(rowHeight);
  });
}

function drawSignatureBlocks(doc, page, customerName, companyName) {
  const startX = page.marginLeft;
  const availableWidth = page.pageWidth - page.marginLeft - page.marginRight;
  const blockWidth = (availableWidth - 48) / 2;
  const rightX = startX + blockWidth + 48;

  doc.setFont("times", "normal");
  doc.line(startX, page.y, startX + blockWidth, page.y);
  doc.line(rightX, page.y, rightX + blockWidth, page.y);

  page.move(16);

  doc.setFont("times", "bold");
  doc.text(customerName, startX, page.y);
  doc.text("RK Truck and Trailer Sales", rightX, page.y);

  page.move(14);

  doc.setFont("times", "normal");
  doc.text("Buyer Signature", startX, page.y);
  doc.text("Authorized Representative", rightX, page.y);

  if (companyName) {
    page.move(14);
    doc.text(companyName, startX, page.y);
  }
}

function createPageWriter(doc, options) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  return {
    marginLeft: options.marginLeft,
    marginRight: options.marginRight,
    marginTop: options.marginTop,
    marginBottom: options.marginBottom,
    fontSize: options.fontSize,
    lineHeight: options.lineHeight,
    pageWidth,
    pageHeight,
    y: options.marginTop,

    move(amount) {
      this.y += amount;
    },

    ensureSpace(height) {
      if (this.y + height > this.pageHeight - this.marginBottom) {
        doc.addPage();
        this.y = this.marginTop;
      }
    },

    line(text) {
      this.ensureSpace(this.lineHeight);
      doc.setFontSize(this.fontSize);
      doc.text(String(text || ""), this.marginLeft, this.y);
      this.y += this.lineHeight;
    },

    paragraph(text) {
      const maxWidth = this.pageWidth - this.marginLeft - this.marginRight;
      const lines = doc.splitTextToSize(String(text || ""), maxWidth);
      const height = lines.length * this.lineHeight;

      this.ensureSpace(height);
      doc.setFontSize(this.fontSize);
      doc.text(lines, this.marginLeft, this.y);
      this.y += height + 8;
    },
  };
}

function getScheduleFromDeal(deal) {
  const term = Math.min(Math.max(Number(deal?.term || 0), 0), 120);
  const totalAmount = Number(deal?.total_amount || 0);
  const paymentAmount =
    Number(deal?.monthly_payment || 0) ||
    (term > 0 ? Number((totalAmount / term).toFixed(2)) : totalAmount);

  if (!term || !paymentAmount) return [];

  const frequency = getPaymentFrequencyLabel(deal);
  const firstDueDate = getFirstDueDate(deal, frequency);

  if (!firstDueDate) return [];

  const schedule = [];

  for (let index = 0; index < term; index += 1) {
    const dueDate =
      frequency === "Biweekly"
        ? addDays(firstDueDate, index * 14)
        : addMonths(firstDueDate, index);

    schedule.push({
      installmentNumber: index + 1,
      dueDate,
      amountDue: paymentAmount,
    });
  }

  return schedule;
}

function getFirstDueDate(deal, frequency) {
  if (deal?.first_payment_date) return deal.first_payment_date;

  if (frequency === "Biweekly" && deal?.start_date) {
    return deal.start_date;
  }

  if (deal?.start_date && deal?.due_day) {
    const start = parseDateParts(deal.start_date);
    const dueDay = Number(deal.due_day || 1);

    if (!start) return "";

    return makeDateString(start.year, start.month + 1, dueDay);
  }

  return deal?.start_date || "";
}

function addDays(dateString, daysToAdd) {
  const parts = parseDateParts(dateString);
  if (!parts) return dateString;

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  date.setUTCDate(date.getUTCDate() + daysToAdd);

  return toDateString(date);
}

function addMonths(dateString, monthsToAdd) {
  const parts = parseDateParts(dateString);
  if (!parts) return dateString;

  return makeDateString(parts.year, parts.month + monthsToAdd, parts.day);
}

function makeDateString(year, month, day) {
  const normalized = new Date(Date.UTC(year, month - 1, 1));
  const normalizedYear = normalized.getUTCFullYear();
  const normalizedMonth = normalized.getUTCMonth() + 1;
  const lastDay = new Date(
    Date.UTC(normalizedYear, normalizedMonth, 0)
  ).getUTCDate();

  const safeDay = Math.min(Math.max(Number(day || 1), 1), lastDay);

  return `${normalizedYear}-${String(normalizedMonth).padStart(2, "0")}-${String(
    safeDay
  ).padStart(2, "0")}`;
}

function parseDateParts(dateString) {
  const [year, month, day] = String(dateString || "").split("-").map(Number);

  if (!year || !month || !day) return null;

  return { year, month, day };
}

function toDateString(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function getInHouseTotalCost(deal) {
  const possibleTotalCost =
    Number(deal.sales_price || 0) ||
    Number(deal.sale_price || 0) ||
    Number(deal.vehicle_price || 0) ||
    Number(deal.truck_price || 0) ||
    Number(deal.total_cost || 0);

  if (possibleTotalCost > 0) return possibleTotalCost;

  const financedBalance = Number(deal.total_amount || 0);
  const downPayment = getInHouseDownPayment(deal);

  return financedBalance + downPayment;
}

function getInHouseDownPayment(deal) {
  return (
    Number(deal.down_payment || 0) ||
    Number(deal.down_payment_amount || 0) ||
    Number(deal.down_amount || 0) ||
    Number(deal.amount_down || 0) ||
    Number(deal.cash_down || 0) ||
    0
  );
}

function getInHouseFinancedBalance(deal, totalCost, downPayment) {
  const financedBalance = Number(deal.total_amount || 0);

  if (financedBalance > 0) return financedBalance;

  return Math.max(Number(totalCost || 0) - Number(downPayment || 0), 0);
}

function getContractCopy(deal) {
  const dealType = String(deal?.deal_type || "").trim().toLowerCase();

  if (dealType.includes("borrow")) {
    return {
      title: "BORROWED MONEY REPAYMENT AGREEMENT",
      mainClause:
        "The buyer acknowledges a borrowed money balance owed to RK Truck and Trailer Sales. The buyer agrees to repay the amount according to the payment schedule listed in this agreement.",
      defaultClause:
        "In case of default, RK Truck and Trailer Sales may pursue collection of the unpaid balance.",
    };
  }

  if (dealType.includes("motor")) {
    return {
      title: "MOTOR FINANCE AGREEMENT",
      mainClause:
        "The buyer has elected motor finance payment terms. The buyer agrees to pay the balance according to the payment schedule listed in this agreement.",
      defaultClause:
        "In case of default, RK Truck and Trailer Sales may take appropriate collection action for the unpaid balance.",
    };
  }

  if (dealType.includes("registration")) {
    return {
      title: "REGISTRATION MONEY AGREEMENT",
      mainClause:
        "The buyer acknowledges that registration money is owed to RK Truck and Trailer Sales. The buyer agrees to pay the amount by the scheduled due date listed in this agreement.",
      defaultClause:
        "In case of default, RK Truck and Trailer Sales may pursue collection of the unpaid registration balance.",
    };
  }

  if (dealType.includes("cash")) {
    return {
      title: "CASH SALE ACKNOWLEDGMENT",
      mainClause:
        "The buyer acknowledges the cash sale amount for the vehicle listed in this agreement.",
      defaultClause:
        "Any unpaid balance, if applicable, remains due according to the dealership records.",
    };
  }

  return {
    title: "PAYMENT AGREEMENT",
    mainClause:
      "The buyer agrees to pay the balance according to the payment schedule listed in this agreement.",
    defaultClause:
      "In case of default, RK Truck and Trailer Sales may pursue collection of the unpaid balance.",
  };
}

function getPaymentFrequencyLabel(deal) {
  if (deal?.deal_type === "Cash") return "Cash";
  if (deal?.deal_type === "Registration Money") return "One-Time";
  if (deal?.payment_frequency === "Biweekly") return "Biweekly";

  return "Monthly";
}

function getTermText(deal, schedule) {
  const frequency = getPaymentFrequencyLabel(deal);
  const term = Number(deal?.term || schedule.length || 0);

  if (deal?.deal_type === "Registration Money") return "one payment";
  if (!term) return "the agreed schedule";

  if (frequency === "Biweekly") {
    return `${term} biweekly payments`;
  }

  if (frequency === "Monthly") {
    return `${term} ${term === 1 ? "month" : "months"}`;
  }

  return `${term} payments`;
}

function formatDisplayDate(dateString) {
  if (!dateString) return "-";

  const [year, month, day] = String(dateString).split("-");
  if (!year || !month || !day) return dateString;

  return `${month}/${day}/${year}`;
}

function formatContractDate(dateString) {
  if (!dateString) return "-";

  const [year, month, day] = String(dateString).split("-");
  if (!year || !month || !day) return dateString;

  const date = new Date(`${dateString}T00:00:00`);

  const monthLabel = date
    .toLocaleString("en-US", { month: "short" })
    .toUpperCase();

  return `${monthLabel} ${Number(day)}${getOrdinalSuffix(Number(day))} /${year}`;
}

function formatLongDate(dateString) {
  if (!dateString) return "-";

  const [year, month, day] = String(dateString).split("-");
  if (!year || !month || !day) return dateString;

  const date = new Date(`${dateString}T00:00:00`);

  const monthLabel = date.toLocaleString("en-US", {
    month: "long",
  });

  return `${monthLabel} ${Number(day)}${getOrdinalSuffix(Number(day))} ${year}`;
}

function getOrdinalSuffix(day) {
  if (day >= 11 && day <= 13) return "TH";

  const lastDigit = day % 10;

  if (lastDigit === 1) return "ST";
  if (lastDigit === 2) return "ND";
  if (lastDigit === 3) return "RD";

  return "TH";
}