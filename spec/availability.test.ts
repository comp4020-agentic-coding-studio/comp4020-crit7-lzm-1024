import { JSDOM } from 'jsdom';
import { describe, expect, inject, it } from 'vitest';

const baseUrl = inject('baseUrl');
const date = '2030-10-02';
const room = 'Hancock Study Room 3.27';
const selection = new URLSearchParams({ room, date, time: '12:00', duration: '1', people: '4' });
const post = (body: URLSearchParams, cookie = '') => {
  const requestBody = new URLSearchParams(body);
  if (requestBody.get('action') !== 'cancel') {
    if (!requestBody.has('email')) requestBody.set('email', 'u2222222@anu.edu.au');
    if (!requestBody.has('confirmEmail')) requestBody.set('confirmEmail', requestBody.get('email')!);
  }
  return fetch(new URL('/api/bookings', baseUrl), {
    method: 'POST', headers: { origin: baseUrl, cookie }, body: requestBody, redirect: 'manual',
  });
};
const login = async (email: string) => {
  const response = await fetch(new URL('/api/session', baseUrl), {
    method: 'POST', headers: { origin: baseUrl }, body: new URLSearchParams({ email }), redirect: 'manual',
  });
  return response.headers.getSetCookie().find((value) => value.startsWith('studyspace_demo_session='))?.split(';')[0] || '';
};
const schedule = async (library: string, cookie = '') => {
  const response = await fetch(new URL(`/?library=${library}&date=${date}`, baseUrl), { headers: { cookie } });
  expect(response.status).toBe(200);
  return new JSDOM(await response.text()).window.document;
};
const roomDetail = async (cookie = '') => {
  const url = new URL(`/rooms/${encodeURIComponent(room)}?date=${date}&time=12%3A00&duration=1`, baseUrl);
  const response = await fetch(url, { headers: { cookie } });
  expect(response.status).toBe(200);
  return new JSDOM(await response.text()).window.document;
};

describe('multi-library availability', () => {
  it('shows the selected library catalogue without hiding occupied rooms', async () => {
    for (const library of ['Chifley', 'Hancock', 'Menzies', 'Law']) {
      const doc = await schedule(library);
      const rows = [...doc.querySelectorAll('.schedule-table tbody tr')];
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => row.querySelector('.room-column span')?.textContent?.includes(library))).toBe(true);
    }
  });

  it('shows private ownership correctly and releases cancelled slots', async () => {
    const created = await post(selection);
    expect(created.headers.get('location')).toBe('/bookings?notice=booked-mail-pending');
    const cookie = created.headers.get('set-cookie')!.split(';')[0];

    const own = await schedule('Hancock', cookie);
    expect(own.querySelectorAll(`.time-slot.mine[data-room="${room}"]`).length).toBeGreaterThan(0);
    const visitor = await schedule('Hancock');
    expect(visitor.querySelectorAll(`.time-slot.booked[data-room="${room}"]`).length).toBeGreaterThan(0);
    expect(visitor.querySelectorAll('.time-slot.mine').length).toBe(0);
    const ownDetail = await roomDetail(cookie);
    expect(ownDetail.querySelectorAll('.room-time-grid .time-slot')).toHaveLength(28);
    expect(ownDetail.querySelector('.room-time-grid .time-slot.mine[data-time="12:00"]')).not.toBeNull();
    expect(ownDetail.querySelector('.room-time-grid a.time-slot.free[data-time="13:00"]')).not.toBeNull();
    const visitorDetail = await roomDetail();
    expect(visitorDetail.querySelector('.room-time-grid .time-slot.booked[data-time="12:00"]')).not.toBeNull();
    expect(visitorDetail.querySelector('.room-time-grid .time-slot.mine')).toBeNull();

    const accountCookie = await login('u2222222@anu.edu.au');
    const page = await fetch(new URL('/bookings', baseUrl), { headers: { cookie: accountCookie } });
    const doc = new JSDOM(await page.text()).window.document;
    const id = doc.querySelector('input[name="id"]')!.getAttribute('value')!;
    await post(new URLSearchParams({ action: 'cancel', id }));
    expect((await post(selection)).headers.get('location')).toContain('notice=conflict');

    await post(new URLSearchParams({ action: 'cancel', id }), accountCookie);
    const released = await schedule('Hancock', cookie);
    expect(released.querySelector(`a.time-slot.free[data-room="${room}"][data-time="12:00"]`)).not.toBeNull();
    const releasedDetail = await roomDetail(cookie);
    expect(releasedDetail.querySelector('.room-time-grid a.time-slot.free[data-time="12:00"]')).not.toBeNull();
    const other = await schedule('Law');
    expect(other.querySelectorAll('.time-slot.booked').length).toBe(0);
  });

  it('lets a student switch from two hours to a 30-minute booking', async () => {
    const selectedRoom = 'Law Study Room 1';
    const selectedDate = '2030-10-04';
    const initial = await fetch(new URL(`/?library=Law&date=${selectedDate}&duration=2`, baseUrl));
    const initialDoc = new JSDOM(await initial.text()).window.document;
    const shorter = initialDoc.querySelector('.duration-picker a[href*="duration=0.5"]');
    expect(shorter?.textContent).toContain('30 min');

    const calendar = await fetch(new URL(shorter!.getAttribute('href')!, baseUrl));
    const calendarDoc = new JSDOM(await calendar.text()).window.document;
    expect(calendarDoc.querySelector('.duration-picker a[aria-current="true"]')?.textContent).toContain('30 min');
    const slot = calendarDoc.querySelector(`a.time-slot[data-room="${selectedRoom}"][data-time="12:00"]`);
    expect(slot?.getAttribute('data-can-book')).toBe('true');

    const detail = await fetch(new URL(slot!.getAttribute('href')!, baseUrl));
    const detailDoc = new JSDOM(await detail.text()).window.document;
    expect(detailDoc.querySelectorAll('.room-time-grid .is-selected')).toHaveLength(0);
    const halfHour = detailDoc.querySelector('.room-time-grid a.time-slot[data-time="12:00"]');
    expect(halfHour?.getAttribute('href')).toContain('pickDuration=0.5');
    const selectedDetail = await fetch(new URL(halfHour!.getAttribute('href')!, baseUrl));
    const selectedDoc = new JSDOM(await selectedDetail.text()).window.document;
    expect(selectedDoc.querySelectorAll('.room-time-grid .is-selected')).toHaveLength(1);
    expect(selectedDoc.querySelector('#summary-duration')?.textContent).toContain('30 minutes');
    expect(selectedDoc.querySelector('input[name="duration"]')?.getAttribute('value')).toBe('0.5');

    const booked = await post(new URLSearchParams({ room: selectedRoom, date: selectedDate, time: '12:00', duration: '0.5', people: '1' }));
    expect(booked.headers.get('location')).toBe('/bookings?notice=booked-mail-pending');
    const cookie = booked.headers.get('set-cookie')!.split(';')[0];
    const own = await fetch(new URL(`/?library=Law&date=${selectedDate}&duration=0.5`, baseUrl), { headers: { cookie } });
    const ownDoc = new JSDOM(await own.text()).window.document;
    expect(ownDoc.querySelectorAll(`.schedule-table .time-slot.mine[data-room="${selectedRoom}"]`)).toHaveLength(1);
    expect(ownDoc.querySelector(`.schedule-table a.time-slot.free[data-room="${selectedRoom}"][data-time="12:30"]`)).not.toBeNull();
  });

  it('finds rooms free for an exact range and suggests a nearby shorter range when none fit', async () => {
    const selectedDate = '2030-10-06';
    const selectedRoom = 'Menzies Study Room 115A';
    const query = `/?library=Menzies&date=${selectedDate}&category=Study+rooms&people=7&from=08%3A00&to=10%3A00&search=1`;
    const before = await fetch(new URL(query, baseUrl));
    const beforeDoc = new JSDOM(await before.text()).window.document;
    expect(beforeDoc.querySelectorAll('.result-card')).toHaveLength(1);
    expect(beforeDoc.querySelector('.result-card')?.textContent).toContain('08:00–10:00');
    expect(beforeDoc.querySelector('.result-card a')?.getAttribute('href')).toContain('time=08%3A00');

    for (const [time, duration, email] of [['08:00', '1.5', 'u2222222@anu.edu.au'], ['10:30', '2', 'u3333333@anu.edu.au']]) {
      expect((await post(new URLSearchParams({ room: selectedRoom, date: selectedDate, time, duration, people: '7', email }))).headers.get('location')).toBe('/bookings?notice=booked-mail-pending');
    }

    const after = await fetch(new URL(query, baseUrl));
    const afterDoc = new JSDOM(await after.text()).window.document;
    expect(afterDoc.querySelectorAll('.result-card')).toHaveLength(0);
    expect(afterDoc.querySelector('.no-exact-match')?.textContent).toContain('08:00–10:00');
    const recommendation = afterDoc.querySelector('.recommendation-list a');
    expect(recommendation?.textContent).toContain('09:30–10:30');
    const suggested = await fetch(new URL(recommendation!.getAttribute('href')!, baseUrl));
    const suggestedDoc = new JSDOM(await suggested.text()).window.document;
    expect(suggestedDoc.querySelector('.result-card')?.textContent).toContain('09:30–10:30');
    expect(suggestedDoc.querySelector('.result-card a')?.getAttribute('href')).toContain('time=09%3A30');
  });

  it('requires a confirmed ANU email and limits it to two hours per date across browsers and rooms', async () => {
    const selectedDate = '2030-10-08';
    const email = 'u4444444@anu.edu.au';
    const request = (room: string, time: string, duration: string) => new URLSearchParams({ room, date: selectedDate, time, duration, people: '1', email });
    const invalid = await post(new URLSearchParams({ room: 'Study Room 1.01', date: selectedDate, time: '09:00', duration: '0.5', people: '1', email: 'student@anu.edu.au' }));
    expect(invalid.headers.get('location')).toContain('notice=email-invalid');
    const mismatchedDetails = request('Study Room 1.01', '09:00', '0.5');
    mismatchedDetails.set('confirmEmail', 'u5555555@anu.edu.au');
    const mismatch = await post(mismatchedDetails);
    expect(mismatch.headers.get('location')).toContain('notice=email-mismatch');

    const first = await post(request('Study Room 1.01', '09:00', '1.5'));
    expect(first.headers.get('location')).toBe('/bookings?notice=booked-mail-pending');
    const second = await post(request('Study Room 1.02', '11:00', '0.5'));
    expect(second.headers.get('location')).toBe('/bookings?notice=booked-mail-pending');
    const blocked = await post(request('Law Study Room 1', '12:00', '0.5'));
    expect(blocked.headers.get('location')).toContain('notice=daily-limit');

    const accountCookie = await login(email);
    const page = await fetch(new URL('/bookings', baseUrl), { headers: { cookie: accountCookie } });
    const secondDoc = new JSDOM(await page.text()).window.document;
    const id = secondDoc.querySelector('input[name="id"]')!.getAttribute('value')!;
    await post(new URLSearchParams({ action: 'cancel', id }), accountCookie);
    expect((await post(request('Law Study Room 1', '12:00', '0.5'))).headers.get('location')).toBe('/bookings?notice=booked-mail-pending');
  });
});
