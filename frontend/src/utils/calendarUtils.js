function formatCalendarDate(dateString, timeString = "09:00") {
    if (!dateString) return "";
  
    const [year, month, day] = dateString.split("-");
    const [hour, minute] = timeString.split(":");
  
    return `${year}${month}${day}T${hour}${minute}00`;
  }
  
  function escapeIcsText(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;")
      .replace(/\n/g, "\\n");
  }
  
  function buildReminderTitle(reminder) {
    return `Collect Payment - ${reminder.customerName || "Customer"} - ${
      reminder.dealTag || ""
    }`;
  }
  
  function buildReminderDetails(reminder) {
    return [
      `Customer: ${reminder.customerName || ""}`,
      `Phone: ${reminder.phone || ""}`,
      `Deal Tag: ${reminder.dealTag || ""}`,
      `Truck: ${reminder.truck || ""}`,
      `Installment: ${reminder.installmentNumber || ""}`,
      `Due Date: ${reminder.dueDate || ""}`,
      `Amount Due: $${Number(reminder.amountDue || 0).toFixed(2)}`,
      `Paid: $${Number(reminder.paidAmount || 0).toFixed(2)}`,
      `Remaining: $${Number(reminder.remainingAmount || 0).toFixed(2)}`,
      reminder.notes ? `Notes: ${reminder.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
  
  function buildIcsEvent(reminder, index = 0) {
    const title = buildReminderTitle(reminder);
    const description = buildReminderDetails(reminder);
  
    const startDate = formatCalendarDate(reminder.dueDate, "09:00");
    const endDate = formatCalendarDate(reminder.dueDate, "09:30");
  
    return [
      "BEGIN:VEVENT",
      `UID:${Date.now()}-${index}-${reminder.dealTag || "rk-paytrack"}-${
        reminder.installmentNumber || "installment"
      }@rkpaytrack`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `SUMMARY:${escapeIcsText(title)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT1H",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcsText(title)}`,
      "END:VALARM",
      "END:VEVENT",
    ].join("\r\n");
  }
  
  function downloadIcsFile(filename, events) {
    if (!events || events.length === 0) {
      alert("No unpaid due dates available for calendar reminders.");
      return;
    }
  
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//RK PayTrack//Collection Reminder//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      ...events,
      "END:VCALENDAR",
    ].join("\r\n");
  
    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8;",
    });
  
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
  
    link.href = url;
    link.download = filename;
    link.click();
  
    URL.revokeObjectURL(url);
  }
  
  export function createIcsCollectionReminder(reminder) {
    if (!reminder?.dueDate) {
      alert("Due date is required to create a calendar reminder.");
      return;
    }
  
    downloadIcsFile(
      `collection-reminder-${reminder.dealTag || "customer"}-${
        reminder.dueDate || "due"
      }.ics`,
      [buildIcsEvent(reminder)]
    );
  }
  
  export function createGoogleCollectionReminder(reminder) {
    if (!reminder?.dueDate) {
      alert("Due date is required to create a Google Calendar reminder.");
      return;
    }
  
    const startDate = formatCalendarDate(reminder.dueDate, "09:00");
    const endDate = formatCalendarDate(reminder.dueDate, "09:30");
  
    const googleCalendarUrl =
      "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      `&text=${encodeURIComponent(buildReminderTitle(reminder))}` +
      `&dates=${startDate}/${endDate}` +
      `&details=${encodeURIComponent(buildReminderDetails(reminder))}` +
      `&location=${encodeURIComponent("RK Truck & Trailer Sales")}`;
  
    window.open(googleCalendarUrl, "_blank", "noopener,noreferrer");
  }
  
  export function createIcsCollectionReminderBatch(reminders, dealTag = "customer") {
    const validReminders = reminders.filter((reminder) => reminder?.dueDate);
  
    if (validReminders.length === 0) {
      alert("No unpaid due dates available for calendar reminders.");
      return;
    }
  
    const events = validReminders.map((reminder, index) =>
      buildIcsEvent(reminder, index)
    );
  
    downloadIcsFile(`all-collection-reminders-${dealTag}.ics`, events);
  }
  
  export function createGoogleCollectionReminderBatch(
    reminders,
    dealTag = "customer"
  ) {
    const validReminders = reminders.filter((reminder) => reminder?.dueDate);
  
    if (validReminders.length === 0) {
      alert("No unpaid due dates available for Google Calendar reminders.");
      return;
    }
  
    const events = validReminders.map((reminder, index) =>
      buildIcsEvent(reminder, index)
    );
  
    downloadIcsFile(`google-calendar-import-${dealTag}.ics`, events);
  
    alert(
      "Google Calendar does not allow adding many events from one URL. A multi-event .ics file was downloaded. Import this file into Google Calendar."
    );
  
    window.open(
      "https://calendar.google.com/calendar/u/0/r/settings/export",
      "_blank",
      "noopener,noreferrer"
    );
  }
  
  // Keeps old CustomerDetail import from breaking
  export const createCollectionReminder = createIcsCollectionReminder;