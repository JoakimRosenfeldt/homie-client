export function formatAge(age: number): string {
  return `${age}`;
}

export function formatBudget(amount: number, currency: string): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatMoveInDate(isoDate: string): string {
  const date = new Date(isoDate);

  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatNeighborhoods(neighborhoods: string[]): string {
  if (neighborhoods.length === 0) {
    return "Open to suggestions";
  }

  if (neighborhoods.length <= 2) {
    return neighborhoods.join(" · ");
  }

  return `${neighborhoods.slice(0, 2).join(" · ")} +${neighborhoods.length - 2}`;
}
