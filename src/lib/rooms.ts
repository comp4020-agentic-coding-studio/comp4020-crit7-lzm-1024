export const libraries = ["Chifley", "Hancock", "Menzies", "Law"] as const;
export const categories = ["Study rooms", "Study booths", "Computers", "Equipment"] as const;
export type Library = typeof libraries[number];
export interface Room {
  id: string; name: string; library: Library; floor: string; capacity: number;
  category: typeof categories[number]; features: string[]; accessible: boolean;
}

// Names and capacities are transcribed from the supplied LibCal screenshots.
// This is a prototype catalogue, not a live feed from ANU Library.
const chifleyRooms = ["1.01", "1.02", "1.03", "1.04", "1.05", "1.06", "2.02G", "3.04", "3.05", "3.06", "3.07", "4.02", "4.03", "4.04", "4.05", "4.06", "4.07"];
export const rooms: Room[] = [
  ...chifleyRooms.map((number): Room => ({
    id: `Study Room ${number}`, name: `Study Room ${number}`, library: "Chifley",
    floor: `Level ${number[0]}`, capacity: number.startsWith("4.") ? 2 : 4,
    category: "Study rooms", features: ["Power points"], accessible: true,
  })),
  { id: "The Deck", name: "The Deck", library: "Chifley", floor: "Chifley Library", capacity: 8, category: "Study rooms", features: ["Power points"], accessible: true },
  { id: "Study Booth 3.10", name: "Study Booth 3.10", library: "Chifley", floor: "Level 3", capacity: 4, category: "Study booths", features: ["Power points"], accessible: false },
  { id: "Study Booth 3.11", name: "Study Booth 3.11", library: "Chifley", floor: "Level 3", capacity: 2, category: "Study booths", features: ["Power points"], accessible: true },
  { id: "Accessibility Computer", name: "Accessibility Computer", library: "Chifley", floor: "Chifley Library", capacity: 1, category: "Computers", features: ["Computer"], accessible: true },
  ...["3.27", "3.28", "3.29", "3.33", "3.34", "3.36", "3.37", "3.38", "3.39"].map((number): Room => ({
    id: `Hancock Study Room ${number}`, name: `Study Room ${number}`, library: "Hancock", floor: "Level 3",
    capacity: number === "3.37" ? 3 : 4, category: "Study rooms", features: ["Power points"], accessible: true,
  })),
  ...[["115A", 7], ["115C", 3], ["115E", 3]].map(([number, capacity]): Room => ({
    id: `Menzies Study Room ${number}`, name: `Study Room ${number}`, library: "Menzies", floor: "Menzies Library",
    capacity: Number(capacity), category: "Study rooms", features: ["Power points"], accessible: false,
  })),
  { id: "Menzies Microfilm Scanner", name: "Microfilm Scanner", library: "Menzies", floor: "Menzies Library", capacity: 1, category: "Equipment", features: ["Microfilm scanner"], accessible: false },
  ...[1, 2, 3, 4].map((number): Room => ({
    id: `Law Study Room ${number}`, name: `Study Room ${number}`, library: "Law", floor: "Law Library",
    capacity: 4, category: "Study rooms", features: ["Power points"], accessible: true,
  })),
];

export function sydneyToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
export function sydneyNowTime(): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Australia/Sydney", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
}
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function shiftDay(date: string, amount: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}
export function defaultSearch(): { date: string; time: string } {
  const date = sydneyToday();
  const [hour, minute] = sydneyNowTime().split(":").map(Number);
  const rounded = Math.ceil(Math.max(8 * 60, hour * 60 + minute + 1) / 30) * 30;
  if (rounded > 20 * 60) return { date: shiftDay(date, 1), time: "09:00" };
  return { date, time: `${String(Math.floor(rounded / 60)).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}` };
}
export function slots(): string[] {
  return Array.from({ length: 29 }, (_, i) => {
    const minutes = 8 * 60 + i * 30;
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  });
}
export function endFor(date: string, time: string, duration: number): string {
  const [hours, minutes] = time.split(":").map(Number);
  const end = hours * 60 + minutes + duration * 60;
  return `${date}T${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
}
export const durations = [0.5, 1, 1.5, 2];
