/**
 * Man Cave Barber Studio — booking backend (Google Apps Script).
 *
 * Runs as the shop owner's Google account. It reads each barber's Google Calendar to find
 * free times, and creates the appointment as an event on that barber's calendar.
 * Anything already on a barber's calendar (another client, lunch, a day off) blocks that time.
 *
 * Deploy: Deploy > New deployment > Web app, Execute as "Me", Who has access "Anyone".
 * Paste the Web App URL into js/config.js (API_URL). Full steps in README.md.
 */

// ---------------- CONFIG ----------------

const TIMEZONE = 'America/Toronto'; // Montreal time
const SLOT_STEP_MIN = 15;            // offer a start time every 15 minutes
const MIN_NOTICE_MIN = 60;           // no bookings less than 1 h from now
const MAX_DAYS_AHEAD = 30;

// Calendar id for each barber: Google Calendar > Settings > (calendar) > "Integrate calendar" > Calendar ID.
// TESTING: all four use 'primary' (the calendar of whoever runs the script). Before launch, replace each with
// that barber's Calendar ID. Use 'primary' for the owner's own calendar. The owner's account must have
// "Make changes to events" access to every calendar listed here.
const BARBERS = {
  emiliano: { name: 'Emiliano Parra', calendarId: 'primary' },
  ivan:     { name: 'Ivan Marte',     calendarId: 'primary' },
  jesus:    { name: 'Jesus',          calendarId: 'primary' },
  moises:   { name: 'Moises Ramírez', calendarId: 'primary' },
};

// Durations in minutes. `days`: weekdays allowed (0 = Sunday ... 6 = Saturday).
const SERVICES = {
  haircut:  { name: 'Coupe de cheveux',      min: 45 },
  beard:    { name: 'Taille de barbe',       min: 30 },
  combo:    { name: 'Coupe + barbe',         min: 60 },
  tuesday:  { name: 'Promo du mardi',        min: 30, days: [2] },
  senior:   { name: 'Coupe aînés',           min: 30 },
  scissors: { name: 'Coupe aux ciseaux',     min: 45 },
  deluxe:   { name: 'Coupe + barbe Deluxe',  min: 90 },
  curls:    { name: 'Boucles',               min: 30 },
  color:    { name: 'Couleur',               min: 45 },
};

// Opening hours per weekday, 0 = Sunday. Use null for closed.
const HOURS = {
  0: ['09:00', '15:00'],
  1: ['09:00', '21:00'],
  2: ['09:00', '21:00'],
  3: ['09:00', '21:00'],
  4: ['09:00', '21:00'],
  5: ['09:00', '21:00'],
  6: ['09:00', '19:00'],
};

// Optional: an email that gets a copy of every booking (leave '' to disable).
const NOTIFY_EMAIL = '';

// ---------------- EMAILS TO CLIENTS ----------------
// Emails are sent from the Google account that runs this script (free; Gmail allows ~100 per day).

const SEND_CONFIRMATION = true;     // email the client as soon as they book
const SEND_REMINDER = true;         // email the client ~24 h before (run setupReminders() once)
const SEND_CALENDAR_INVITE = false; // also send a Google Calendar invite (duplicates the confirmation)

// Public address of the website, used for the logo in emails (e.g. 'https://mancavebarberstudio.ca').
const SITE_URL = 'https://man-cave-barber-studio.vercel.app';

const SHOP = {
  name: 'Man Cave Barber Studio',
  phone: '514 604-2040',
  phoneHref: 'tel:+15146042040',
  address: '3678 Ch. de Chambly, Longueuil, QC J4L 1N8',
  mapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=3678+Chemin+de+Chambly+Longueuil+QC+J4L+1N8',
};

// Service names in English and Spanish (French names are in SERVICES).
const SERVICE_NAMES = {
  en: { haircut: 'Haircut', beard: 'Beard trim', combo: 'Haircut + beard', tuesday: 'Tuesday promo',
        senior: 'Senior cut', scissors: 'Scissor cut', deluxe: 'Haircut + beard Deluxe', curls: 'Curls', color: 'Color' },
  es: { haircut: 'Corte de cabello', beard: 'Corte de barba', combo: 'Corte + barba', tuesday: 'Promo del martes',
        senior: 'Corte para mayores', scissors: 'Corte con tijera', deluxe: 'Corte + barba Deluxe', curls: 'Rizos', color: 'Color' },
};

const EMAIL_TEXT = {
  fr: {
    confirmSubject: 'Rendez-vous confirmé — Man Cave',
    reminderSubject: 'Rappel : votre rendez-vous demain — Man Cave',
    confirmTitle: "C'est réservé!",
    reminderTitle: 'À demain!',
    hello: 'Bonjour',
    confirmIntro: 'Votre rendez-vous est confirmé. Voici les détails :',
    reminderIntro: 'Petit rappel de votre rendez-vous demain :',
    service: 'Service', barber: 'Barbier', when: 'Date', where: 'Adresse',
    addCal: 'Ajouter à mon calendrier', directions: 'Itinéraire',
    cancel: "Besoin d'annuler ou de changer l'heure? Appelez-nous au moins 2 h à l'avance :",
    thanks: 'À bientôt au Man Cave!',
    days: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
    months: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
    date: (d, m, day, mon, h) => `${d} ${day} ${mon}, ${h.replace(':', ' h ')}`,
  },
  en: {
    confirmSubject: 'Appointment confirmed — Man Cave',
    reminderSubject: 'Reminder: your appointment tomorrow — Man Cave',
    confirmTitle: "You're booked!",
    reminderTitle: 'See you tomorrow!',
    hello: 'Hi',
    confirmIntro: 'Your appointment is confirmed. Here are the details:',
    reminderIntro: 'A quick reminder of your appointment tomorrow:',
    service: 'Service', barber: 'Barber', when: 'When', where: 'Address',
    addCal: 'Add to my calendar', directions: 'Directions',
    cancel: 'Need to cancel or change the time? Call us at least 2 hours ahead:',
    thanks: 'See you at the Man Cave!',
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    date: (d, m, day, mon, h) => {
      const [hh, mm] = h.split(':').map(Number);
      return `${d}, ${mon} ${day} at ${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
    },
  },
  es: {
    confirmSubject: 'Cita confirmada — Man Cave',
    reminderSubject: 'Recordatorio: tu cita es mañana — Man Cave',
    confirmTitle: '¡Cita reservada!',
    reminderTitle: '¡Nos vemos mañana!',
    hello: 'Hola',
    confirmIntro: 'Tu cita está confirmada. Estos son los detalles:',
    reminderIntro: 'Un recordatorio de tu cita de mañana:',
    service: 'Servicio', barber: 'Barbero', when: 'Fecha', where: 'Dirección',
    addCal: 'Agregar a mi calendario', directions: 'Cómo llegar',
    cancel: '¿Necesitas cancelar o cambiar la hora? Llámanos al menos 2 h antes:',
    thanks: '¡Nos vemos en el Man Cave!',
    days: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    months: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
    date: (d, m, day, mon, h) => `${d} ${day} de ${mon}, ${h}`,
  },
};

// ---------------- WEB ENDPOINTS ----------------

function doGet(e) {
  try {
    const p = e.parameter || {};
    if (p.action === 'slots') {
      return json({ ok: true, slots: availableSlots(p.date, p.service, p.barber).map(s => s.time) });
    }
    return json({ ok: true, service: 'Man Cave booking API' });
  } catch (err) {
    return json({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: 'bad_request' });
  }
  if (body.website) return json({ ok: true, barberName: '' }); // honeypot: silently drop bots

  const name = clean(body.name, 80);
  const phone = clean(body.phone, 30);
  const email = clean(body.email, 120);
  const notes = clean(body.notes, 500);
  if (!name || phone.replace(/\D/g, '').length < 10) return json({ ok: false, error: 'missing_fields' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: 'bad_email' });

  // One booking at a time, so two clients can't grab the same slot.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return json({ ok: false, error: 'busy' });
  try {
    const slot = availableSlots(body.date, body.service, body.barber).find(s => s.time === body.time);
    if (!slot) return json({ ok: false, error: 'taken' });

    const barberId = slot.barbers[0];
    const barber = BARBERS[barberId];
    const service = SERVICES[body.service];
    const start = toDate(body.date, body.time);
    const end = new Date(start.getTime() + service.min * 60000);

    const description = [
      'Client: ' + name,
      'Tél: ' + phone,
      email ? 'Courriel: ' + email : '',
      notes ? 'Note: ' + notes : '',
      'Langue: ' + (body.lang || 'fr'),
      '',
      'Réservé en ligne.',
    ].filter(Boolean).join('\n');

    const options = { description: description, location: 'Man Cave Barber Studio, 3678 Ch. de Chambly, Longueuil, QC' };
    if (email && SEND_CALENDAR_INVITE) {
      options.guests = email;
      options.sendInvites = true;
    }
    const event = calendarFor(barberId).createEvent('✂ ' + service.name + ' — ' + name, start, end, options);
    event.addPopupReminder(30);

    // Remember who to email, for the confirmation now and the reminder the day before.
    const lang = EMAIL_TEXT[body.lang] ? body.lang : 'fr';
    event.setTag('mc_name', name);
    event.setTag('mc_email', email);
    event.setTag('mc_lang', lang);
    event.setTag('mc_service', body.service);
    event.setTag('mc_barber', barberId);
    if (email && SEND_CONFIRMATION) {
      try {
        sendClientEmail('confirm', { name, email, lang, serviceId: body.service, barberId, start, end });
      } catch (mailErr) {
        console.warn('Confirmation email failed: ' + mailErr);   // the booking itself still stands
      }
    }

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail(NOTIFY_EMAIL, 'Nouvelle réservation: ' + name + ' (' + barber.name + ')',
        Utilities.formatDate(start, TIMEZONE, 'EEEE d MMMM yyyy HH:mm') + '\n' + service.name + '\n\n' + description);
    }

    return json({ ok: true, barber: barberId, barberName: barber.name, start: start.toISOString() });
  } catch (err) {
    return json({ ok: false, error: String(err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

// ---------------- AVAILABILITY ----------------

/** Returns [{ time: 'HH:mm', barbers: [ids free at that time] }] for one day. */
function availableSlots(dateStr, serviceId, barberId) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) throw new Error('bad_date');
  const service = SERVICES[serviceId];
  if (!service) throw new Error('bad_service');
  const ids = barberId === 'any' ? Object.keys(BARBERS) : [barberId];
  if (!ids.every(id => BARBERS[id])) throw new Error('bad_barber');

  const dayStart = toDate(dateStr, '00:00');
  const weekday = Number(Utilities.formatDate(dayStart, TIMEZONE, 'u')) % 7; // 'u': 1 = Mon ... 7 = Sun
  const hours = HOURS[weekday];
  if (!hours) return [];
  if (service.days && service.days.indexOf(weekday) === -1) return [];

  const now = Date.now();
  if (dayStart.getTime() > now + MAX_DAYS_AHEAD * 86400000) return [];

  const open = toDate(dateStr, hours[0]);
  const close = toDate(dateStr, hours[1]);

  // Per barber: the windows they can be booked in ("Busy" events) and the times already taken.
  const busy = {}, windows = {}, byCalendar = {};
  const span = ev => [ev.getStartTime().getTime(), ev.getEndTime().getTime()];
  ids.forEach(id => {
    const calId = BARBERS[id].calendarId;
    const events = byCalendar[calId] || (byCalendar[calId] =
      calendarFor(id).getEvents(dayStart, new Date(dayStart.getTime() + 86400000)));
    windows[id] = events.filter(ev => isWindow(ev) && windowIsFor(ev, id)).map(span);
    busy[id] = events
      .filter(ev => !isWindow(ev) && eventBlocks(ev, id))
      .filter(ev => ev.getTransparency ? String(ev.getTransparency()) !== 'TRANSPARENT' : true)
      .map(span);
  });

  const out = [];
  const len = service.min * 60000;
  for (let t = open.getTime(); t + len <= close.getTime(); t += SLOT_STEP_MIN * 60000) {
    if (t < now + MIN_NOTICE_MIN * 60000) continue;
    const free = ids.filter(id =>
      windows[id].some(([s, e]) => s <= t && t + len <= e) &&      // inside one of the barber's "Busy" windows
      busy[id].every(([s, e]) => e <= t || s >= t + len));          // and not already taken
    if (free.length) {
      // With "any barber", give the slot to whoever has the fewest bookings that day.
      free.sort((a, b) => busy[a].length - busy[b].length);
      out.push({ time: Utilities.formatDate(new Date(t), TIMEZONE, 'HH:mm'), barbers: free });
    }
  }
  return out;
}

// ---------------- BARBER SCHEDULES ----------------
// A barber can ONLY be booked inside calendar events whose title contains one of these words,
// e.g. "Busy" from 17:00 to 21:00. No such event that day = no bookings for that barber that day.
// Add the barber's first name to the title ("Busy Ivan") to make it apply to that barber only;
// without a name it applies to every barber who uses that calendar.
const AVAILABILITY_WORDS = ['busy', 'disponible', 'available'];

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const barberFirst = id => norm(BARBERS[id].name.split(' ')[0]);
const barbersNamedIn = title => Object.keys(BARBERS).filter(id => new RegExp('\\b' + barberFirst(id) + '\\b').test(norm(title)));

/** True for a barber's availability window (not a client booking). */
function isWindow(ev) {
  if (ev.getTag('mc_barber')) return false;
  const title = norm(ev.getTitle());
  return AVAILABILITY_WORDS.some(w => new RegExp('\\b' + w + '\\b').test(title));
}

/** Does this availability window belong to this barber? */
function windowIsFor(ev, id) {
  const named = barbersNamedIn(ev.getTitle());
  return named.length === 0 || named.indexOf(id) !== -1;
}

/** Does this event (a booking, lunch, appointment...) take time away from this barber? */
function eventBlocks(ev, id) {
  const bookedFor = ev.getTag('mc_barber');
  if (bookedFor) return bookedFor === id;               // a client booking blocks only its barber
  const named = barbersNamedIn(ev.getTitle());
  return named.length === 0 || named.indexOf(id) !== -1; // "Lunch Ivan" blocks Ivan; "Lunch" blocks everyone
}

// ---------------- CLIENT EMAILS ----------------

/** kind: 'confirm' | 'reminder'. info: { name, email, lang, serviceId, barberId, start, end } */
function sendClientEmail(kind, info) {
  const t = EMAIL_TEXT[info.lang] || EMAIL_TEXT.fr;
  const serviceName = info.lang === 'fr' || !SERVICE_NAMES[info.lang]
    ? SERVICES[info.serviceId].name
    : SERVICE_NAMES[info.lang][info.serviceId];
  const barberName = BARBERS[info.barberId].name;
  const when = formatWhen(info.start, t);
  const subject = kind === 'confirm' ? t.confirmSubject : t.reminderSubject;
  const title = kind === 'confirm' ? t.confirmTitle : t.reminderTitle;
  const intro = kind === 'confirm' ? t.confirmIntro : t.reminderIntro;
  const firstName = String(info.name).split(' ')[0];
  const calLink = calendarLink('Man Cave — ' + serviceName, info.start, info.end, SHOP.address,
    barberName + ' · ' + SHOP.phone);

  const plain = [
    `${t.hello} ${firstName},`, '', intro, '',
    `${t.service}: ${serviceName}`, `${t.barber}: ${barberName}`, `${t.when}: ${when}`, `${t.where}: ${SHOP.address}`, '',
    `${t.addCal}: ${calLink}`, '', `${t.cancel} ${SHOP.phone}`, '', t.thanks, SHOP.name,
  ].join('\n');

  MailApp.sendEmail({
    to: info.email,
    subject: subject,
    body: plain,
    htmlBody: emailHtml({ t, title, intro, firstName, serviceName, barberName, when, calLink }),
    name: SHOP.name,
  });
}

function emailHtml(p) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const logo = SITE_URL
    ? `<img src="${SITE_URL}/images/logo-mancave-mc-letters.png" alt="MAN CAVE" width="260" style="display:block;width:260px;max-width:80%;height:auto;margin:0 auto">`
    : `<div style="font:700 34px Impact,'Arial Black',Arial,sans-serif;letter-spacing:3px;color:#ffffff">MAN CAVE</div>`;
  const row = (k, v) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e6e6dc;color:#77776a;font-size:14px;width:90px">${esc(k)}</td>
    <td style="padding:10px 0;border-bottom:1px solid #e6e6dc;color:#1d1d19;font-size:15px;font-weight:600">${esc(v)}</td></tr>`;
  return `<!doctype html><html><body style="margin:0;background:#f1f1ea;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f1ea;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden">
  <tr><td align="center" style="background:#1d1d19;padding:28px 20px;border-bottom:5px solid #B9D532">${logo}
    <div style="color:#B9D532;font-size:12px;letter-spacing:4px;margin-top:10px">BARBER STUDIO</div></td></tr>
  <tr><td style="padding:28px 28px 8px">
    <h1 style="margin:0 0 6px;font-size:26px;color:#1d1d19">${esc(p.title)}</h1>
    <p style="margin:0 0 18px;color:#4a4a40;font-size:15px">${esc(p.t.hello)} ${esc(p.firstName)},<br>${esc(p.intro)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${row(p.t.service, p.serviceName)}${row(p.t.barber, p.barberName)}${row(p.t.when, p.when)}${row(p.t.where, SHOP.address)}
    </table>
  </td></tr>
  <tr><td style="padding:18px 28px 6px">
    <a href="${p.calLink}" style="display:inline-block;background:#B9D532;color:#17170f;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:999px;margin:0 8px 8px 0">${esc(p.t.addCal)}</a>
    <a href="${SHOP.mapsUrl}" style="display:inline-block;background:#1d1d19;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:999px;margin:0 0 8px">${esc(p.t.directions)}</a>
  </td></tr>
  <tr><td style="padding:12px 28px 28px;color:#4a4a40;font-size:14px">
    ${esc(p.t.cancel)} <a href="${SHOP.phoneHref}" style="color:#1d1d19;font-weight:700;white-space:nowrap">${esc(SHOP.phone)}</a>
    <p style="margin:16px 0 0;font-weight:700;color:#1d1d19">${esc(p.t.thanks)}</p>
  </td></tr>
</table>
<p style="color:#9a9a8c;font-size:12px;margin:14px 0 0">${esc(SHOP.name)} · ${esc(SHOP.address)}</p>
</td></tr></table></body></html>`;
}

function formatWhen(date, t) {
  const day = Number(Utilities.formatDate(date, TIMEZONE, 'd'));
  const dow = Number(Utilities.formatDate(date, TIMEZONE, 'u')) % 7;      // 0 = Sunday
  const month = Number(Utilities.formatDate(date, TIMEZONE, 'M')) - 1;
  const hm = Utilities.formatDate(date, TIMEZONE, 'HH:mm');
  return t.date(t.days[dow], month, day, t.months[month], hm);
}

/** "Add to Google Calendar" link with the appointment pre-filled. */
function calendarLink(title, start, end, location, details) {
  const f = (d) => Utilities.formatDate(d, 'UTC', "yyyyMMdd'T'HHmmss'Z'");
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + '&text=' + encodeURIComponent(title)
    + '&dates=' + f(start) + '/' + f(end)
    + '&location=' + encodeURIComponent(location)
    + '&details=' + encodeURIComponent(details);
}

/** Runs every hour (see setupReminders): emails clients whose appointment starts in about 24 hours. */
function sendReminders() {
  if (!SEND_REMINDER) return;
  const now = Date.now();
  const from = new Date(now + 22 * 3600000), to = new Date(now + 26 * 3600000);
  Object.keys(BARBERS).forEach((id) => {
    calendarFor(id).getEvents(from, to).forEach((ev) => {
      const email = ev.getTag('mc_email');
      if (!email || ev.getTag('mc_reminded')) return;
      try {
        sendClientEmail('reminder', {
          name: ev.getTag('mc_name') || '', email, lang: ev.getTag('mc_lang') || 'fr',
          serviceId: ev.getTag('mc_service'), barberId: ev.getTag('mc_barber') || id,
          start: ev.getStartTime(), end: ev.getEndTime(),
        });
        ev.setTag('mc_reminded', '1');   // never remind the same appointment twice
      } catch (err) {
        console.warn('Reminder failed for ' + email + ': ' + err);
      }
    });
  });
}

/** Run this ONCE from the editor to start the hourly reminder check. Safe to run again. */
function setupReminders() {
  ScriptApp.getProjectTriggers()
    .filter((tr) => tr.getHandlerFunction() === 'sendReminders')
    .forEach((tr) => ScriptApp.deleteTrigger(tr));
  ScriptApp.newTrigger('sendReminders').timeBased().everyHours(1).create();
  Logger.log('Hourly reminder check is on.');
}

/** Run from the editor to see both emails in your own inbox (no booking is created). */
function testEmails() {
  const me = Session.getEffectiveUser().getEmail();
  const start = new Date(Date.now() + 24 * 3600000), end = new Date(start.getTime() + 45 * 60000);
  ['confirm', 'reminder'].forEach((kind) =>
    sendClientEmail(kind, { name: 'Test Client', email: me, lang: 'fr', serviceId: 'haircut', barberId: Object.keys(BARBERS)[0], start, end }));
  Logger.log('Sent 2 test emails to ' + me);
}

// ---------------- HELPERS ----------------

function calendarFor(id) {
  const cal = BARBERS[id].calendarId === 'primary'
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(BARBERS[id].calendarId);
  if (!cal) throw new Error('Calendar not found for ' + id + ' — check calendarId and sharing.');
  return cal;
}

function toDate(dateStr, timeStr) {
  return Utilities.parseDate(dateStr + ' ' + timeStr, TIMEZONE, 'yyyy-MM-dd HH:mm');
}

function clean(v, max) {
  return String(v || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Run this once from the editor to grant permissions and check every calendar is reachable. */
function testSetup() {
  Object.keys(BARBERS).forEach(id => Logger.log(id + ' → ' + calendarFor(id).getName()));
  const tomorrow = Utilities.formatDate(new Date(Date.now() + 86400000), TIMEZONE, 'yyyy-MM-dd');
  Logger.log('Slots tomorrow (haircut, any barber): ' + availableSlots(tomorrow, 'haircut', 'any').map(s => s.time).join(', '));
}
