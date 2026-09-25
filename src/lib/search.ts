import { categories, defaultSearch, durations, endFor, libraries, slots, validDate } from './rooms';

export const minutes = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

export const clockTime = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;

export const validWindow = (from: string, to: string) =>
  slots().includes(from) && minutes(to) <= 22 * 60 && minutes(to) > minutes(from) &&
  durations.includes((minutes(to) - minutes(from)) / 60);

export function readSearch(params: URLSearchParams) {
  const defaults = defaultSearch();
  const date = params.get('date') || defaults.date;
  const library = params.get('library') || 'All';
  const category = params.get('category') || 'Study rooms';
  const requestedDuration = Number(params.get('duration'));
  const fallbackDuration = durations.includes(requestedDuration) ? requestedDuration : 2;
  const selectedDate = validDate(date) ? date : defaults.date;
  const defaultFrom = selectedDate === defaults.date ? defaults.time : '08:00';
  const from = params.get('from') || defaultFrom;
  const to = params.get('to') || endFor(selectedDate, from, fallbackDuration).slice(11);
  const rangeValid = validWindow(from, to);
  const searched = params.get('search') === '1';
  const people = Number(params.get('people'));
  return {
    date: selectedDate,
    library: [...libraries, 'All'].some((value) => value === library) ? library : 'All',
    category: [...categories, 'All'].some((value) => value === category) ? category : 'Study rooms',
    duration: searched && rangeValid ? (minutes(to) - minutes(from)) / 60 : fallbackDuration,
    from, to, searched, rangeValid,
    people: Number.isInteger(people) && people >= 1 && people <= 8 ? people : 1,
    accessible: params.get('accessible') === 'yes',
  };
}

export function searchQuery(search: ReturnType<typeof readSearch>, changes: Record<string, string> = {}) {
  const keepWindow = search.searched && !('duration' in changes);
  return new URLSearchParams({ date: search.date, library: search.library, category: search.category,
    duration: String(search.duration), people: String(search.people), ...(search.accessible ? { accessible: 'yes' } : {}),
    ...(keepWindow ? { from: search.from, to: search.to, search: '1' } : {}), ...changes }).toString();
}
