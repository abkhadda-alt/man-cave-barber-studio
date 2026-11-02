# Man Cave Barber Studio — website + online booking

**Live site:** https://man-cave-barber-studio.vercel.app

Website created for a barbershop allowing customers to see the owners work and book an appointment with preferred barber. Once the clients book, the appointment info is then sent to the client and onto the preferred barber's google calender.

```
index.html          Homepage: hero, Tuesday promo, services & prices, team, hours, map
book.html           Booking: service → barber → date & time → contact info
css/styles.css
js/config.js        Shop info, hours, services, barbers, and API_URL  ← edit this
js/i18n.js          All text in French, English, Spanish
js/site.js          Homepage logic
js/book.js          Booking logic (runs in DEMO mode until API_URL is set)
apps-script/Code.gs Google Apps Script backend (availability + creating calendar events)
```

## How booking works

1. The client picks a service, a barber, a day and a time.
2. The script reads the barber's Google Calendar:
   - **A barber can only be booked inside events titled "Busy"** (or "Disponible" / "Available").
   - **Any other event inside that window takes the time away**: other clients, lunch, a dentist appointment.
   - While barbers share one calendar knowing each and every shift as well as any appointment they will be taking throughout their day.
   - The words are set in `AVAILABILITY_WORDS` in `Code.gs`.
3. On confirm, the script re-checks the slot and creates the event on that barber's calendar with the client's name, phone and notes. If the client gave an email, they get a Google Calendar invite.

### 2. Apps Script

1. Signed in as the owner account, go to <https://script.google.com> → **New project**, name it "Man Cave Booking".
2. Delete what's in `Code.gs` and paste the contents of `apps-script/Code.gs`.
3. In `BARBERS`, replace each `REPLACE_WITH_CALENDAR_ID` with that barber's Calendar ID.
4. Optional: set `NOTIFY_EMAIL` to get an email for every booking.
5. Select the `testSetup` function in the toolbar and click **Run**. Approve the permissions (Calendar, and Gmail only if `NOTIFY_EMAIL` is set). The log should list the 4 calendar names and tomorrow's free times.
6. **Deploy → New deployment** → type **Web app** → *Execute as*: **Me** → *Who has access*: **Anyone** → **Deploy**. Copy the **Web app URL** (ends with `/exec`).

### 2b. Client emails (confirmation + reminder)

Still in the Apps Script editor:

1. Set `SITE_URL` to the website's address (e.g. `'https://mancavebarberstudio.ca'`) so the emails show the MAN CAVE logo. Optional: set `NOTIFY_EMAIL` to get an email for every new booking.
2. Select **`testEmails`** → **Run**. You'll get the confirmation and the reminder in your own inbox, to see what clients receive. (Approve the Gmail permission the first time.)
3. Select **`setupReminders`** → **Run**, once. This turns on an hourly check that emails each client about 24 h before their appointment. Nobody is reminded twice.

Clients get the confirmation as soon as they book, in the language they used on the site (FR / EN / ES), with an "Add to my calendar" button. Emails come from the owner's Gmail (Gmail allows about 100 a day, plenty for a barbershop). Bookings made less than ~22 h ahead get the confirmation only. To also send a Google Calendar invite, set `SEND_CALENDAR_INVITE = true`.

> After editing `Code.gs`, redeploy: **Deploy → Manage deployments → Edit → Version: New version**.

### 3. Connect the site

Open `js/config.js` and paste the URL:

```js
API_URL: "https://script.google.com/macros/s/XXXXXXXX/exec",
```

The yellow "Demo mode" note on the booking page disappears once this is set.

> If you edit `Code.gs` later, use **Deploy → Manage deployments → Edit → Version: New version** so the URL stays the same.

### 4. Put it online

Drag the whole folder (without `apps-script/`) onto <https://app.netlify.com/drop>, or push it to Vercel / GitHub Pages. Then:

- Point their domain at it, if they have one.
- Update the link in Instagram bio, Facebook and the **Google Business Profile** ("Book" / website link) to the new `book.html`.
- Turn off online booking in Square Appointments so clients can't double-book through both.

## Google reviews (optional, ~10 minutes)

The homepage shows the rating and photos of the barbers' work right away. To also show the **latest real Google reviews** (name, profile photo, stars, text) between the photos, give the site a Google Maps API key. Reviews are loaded live from Google, so they stay up to date and nothing is copied.

1. Go to <https://console.cloud.google.com>, create a project, and add billing (Google gives a free monthly credit that a barbershop site won't come close to using).
2. **APIs & Services → Library** → enable **Maps JavaScript API** and **Places API (New)**.
3. **APIs & Services → Credentials → Create credentials → API key**.
4. Click the key → **Application restrictions: Websites** → add the site's domain (e.g. `mancavebarberstudio.ca/*`). → **API restrictions**: Maps JavaScript API + Places API (New). This makes the key useless anywhere else.
5. Paste it into `js/config.js` → `google.apiKey`.

Only 4★ and 5★ reviews with text are shown (change `minStars` / `max` in `js/config.js`). Google returns up to 5 recent reviews.

## Saving and publishing changes

- **Code & history:** https://github.com/abkhadda-alt/man-cave-barber-studio (public: anyone can view, only the owner can change it).
- **Live site:** https://man-cave-barber-studio.vercel.app, published straight from this folder.

After editing, from this folder:

```bash
git add -A
git commit -m "Describe the change"
git push
npx vercel deploy --prod
```

`.vercelignore` keeps `apps-script/`, `business-card/`, this README and logo drafts off the website. `.gitignore` keeps local settings and the Vercel token file (`.env.local`) out of GitHub. Changes to `apps-script/Code.gs` must also be pasted into the Apps Script editor and deployed as a new version (see above).

## Changing things later

| To change | Edit |
|---|---|
| Prices, services, hours, phone, address | `js/config.js` **and** the matching `SERVICES` / `HOURS` in `Code.gs` (then redeploy a new version) |
| Wording / translations | `js/i18n.js` |
| Add or remove a barber | `barbers` in `js/config.js` and `BARBERS` in `Code.gs` |
| When a barber works | Add a **"Busy"** event (e.g. 17:00–21:00, repeating) in their Google Calendar |
| Barber lunch / appointment inside a shift | Add any other event (e.g. "Lunch") in their calendar |

## To do before launch

- [ ] Confirm hours: the old site says Monday 9 h, Google says 10 h.
- [ ] The logo and hero photo are loaded from their current Square site. Download them into an `images/` folder and update `images` in `js/config.js`, so they keep working after the Square site is closed.
- [ ] Add real photos of each barber (replace the letter avatars) and a few haircut photos from Instagram.
- [ ] "Curls" is listed at 120 $ for 30 min on the old site — confirm the price and duration.
