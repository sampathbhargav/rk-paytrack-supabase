export function getDueDayFromStartDate(startDate) {
    if (!startDate) return "";
  
    const date = new Date(`${startDate}T00:00:00`);
    return date.getDate();
  }
  
  export function calculateMaturityDate(startDate, dueDay, term) {
    if (!startDate || !dueDay || !term) return "";
  
    const start = new Date(`${startDate}T00:00:00`);
    const termNumber = Math.floor(Number(term || 0));
  
    if (termNumber <= 0) return "";
  
    const targetMonth = start.getMonth() + termNumber;
    const targetDate = new Date(start.getFullYear(), targetMonth, 1);
  
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
  
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const safeDueDay = Math.min(Number(dueDay), lastDayOfMonth);
  
    const finalDate = new Date(year, month, safeDueDay);
  
    return formatDateLocal(finalDate);
  }
  
  function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
  
    return `${year}-${month}-${day}`;
  }