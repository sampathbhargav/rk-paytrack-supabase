export function formatMoney(value) {
    const number = Number(value || 0);
  
    return number.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  }