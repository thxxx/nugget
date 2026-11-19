/** Per-day route colors: Rausch first, then Airbnb's classic secondary hues. */
export const DAY_COLORS = [
  "#ff385c",
  "#00a699",
  "#fc642d",
  "#6d5dd3",
  "#2e86de",
  "#c2891a",
  "#d63384",
];

export function dayColor(index: number) {
  return DAY_COLORS[index % DAY_COLORS.length];
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function dayDate(startDate: string | null, index: number) {
  if (!startDate) return null;
  const [y, m, d] = startDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d + index);
  return {
    short: `${date.getMonth() + 1}.${date.getDate()} (${WEEKDAYS[date.getDay()]})`,
    long: `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`,
  };
}
