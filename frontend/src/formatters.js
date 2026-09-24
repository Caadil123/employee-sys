// Small helpers to show money and months in a friendly way (used by Employees and Payroll).

// Show money like "$1,500.50"
const moneyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatMoney(amount) {
  return moneyFormatter.format(amount);
}

// Show a month like "2026-09" as "September 2026"
export function formatMonth(payMonth) {
  const [yearText, monthText] = payMonth.split("-");

  // new Date(year, monthIndex): monthIndex starts at 0 (January = 0), so we subtract 1
  const firstDayOfMonth = new Date(Number(yearText), Number(monthText) - 1, 1);

  return firstDayOfMonth.toLocaleString("en-US", { month: "long", year: "numeric" });
}
