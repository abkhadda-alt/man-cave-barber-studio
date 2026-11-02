(function () {
  const C = window.MC_CONFIG;
  const L = window.MC_LANG;
  const $ = (id) => document.getElementById(id);
  const DEMO = !C.API_URL;
  const DAYS_AHEAD = 30;

  const params = new URLSearchParams(location.search);
  const state = {
    step: 1,
    service: C.services.find((s) => s.id === params.get("service")) || null,
    barber: params.get("barber") === "any" || C.barbers.some((b) => b.id === params.get("barber")) ? params.get("barber") : null,
    date: null,
    time: null,
    slots: null,      // null = not loaded, [] = none
    loading: false,
    sending: false,
  };
  if (state.service) state.step = state.barber ? 3 : 2;

  $("logo").src = C.images.logo;
  $("demoNote").hidden = !DEMO;

  // ---------- helpers ----------
  const locale = () => ({ fr: "fr-CA", en: "en-CA", es: "es" })[L.get()];
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseYmd = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const svcName = (s) => L.t(`svc.${s.id}.name`);
  const barberName = (id) => (id === "any" ? L.t("book.anyone") : C.barbers.find((b) => b.id === id).name);
  const fmtDate = (s) => parseYmd(s).toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" });
  const fmtTime = (t) => {
    if (L.get() !== "en") return t.replace(":", " h ");
    const [h, m] = t.split(":").map(Number);
    return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const duration = (min) => { const h = Math.floor(min / 60), m = min % 60; return h ? `${h} h${m ? " " + m : ""}` : `${m} min`; };

  function dayAllowed(d) {
    if (!C.hours[d.getDay()]) return false;
    if (state.service && state.service.days && !state.service.days.includes(d.getDay())) return false;
    return true;
  }

  // ---------- API ----------
  async function fetchSlots() {
    const { service, barber, date } = state;
    if (DEMO) return demoSlots(date, service.min);
    const url = `${C.API_URL}?action=slots&service=${encodeURIComponent(service.id)}&barber=${encodeURIComponent(barber)}&date=${date}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "error");
    return data.slots;
  }

  async function sendBooking(payload) {
    if (DEMO) {
      await new Promise((r) => setTimeout(r, 700));
      const b = payload.barber === "any" ? C.barbers[0] : C.barbers.find((x) => x.id === payload.barber);
      return { ok: true, barberName: b.name };
    }
    // text/plain body avoids a CORS preflight, which Apps Script does not answer.
    const res = await fetch(C.API_URL, { method: "POST", body: JSON.stringify(payload) });
    return res.json();
  }

  function demoSlots(date, min) {
    const d = parseYmd(date);
    const [open, close] = C.hours[d.getDay()];
    const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const now = new Date();
    const out = [];
    for (let m = toMin(open); m + min <= toMin(close); m += 15) {
      const t = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
      const at = new Date(d); at.setHours(Math.floor(m / 60), m % 60);
      if (at - now < 60 * 60000) continue;
      // Pseudo-random "booked" gaps so the demo looks real.
      if ((m * 7 + d.getDate() * 13) % 5 === 0) continue;
      out.push(t);
    }
    return new Promise((r) => setTimeout(() => r(out), 350));
  }

  // ---------- rendering ----------
  function renderSteps() {
    document.querySelectorAll(".step").forEach((el) => {
      const n = Number(el.dataset.step);
      el.classList.toggle("active", n === state.step);
      el.classList.toggle("done", n < state.step);
      const v = el.querySelector("[data-value]");
      if (!v) return;
      let text = "";
      if (n < state.step) {
        if (n === 1) text = svcName(state.service);
        if (n === 2) text = barberName(state.barber);
        if (n === 3) text = `${fmtDate(state.date)} · ${fmtTime(state.time)}`;
      }
      v.innerHTML = text ? `${esc(text)}<button class="step-edit" data-goto="${n}">${L.t("book.change")}</button>` : "";
    });
  }

  function renderServices() {
    $("serviceOpts").innerHTML = C.services.map((s) => `
      <button class="opt" data-service="${s.id}" aria-pressed="${state.service && state.service.id === s.id}">
        <span class="row"><span>${svcName(s)}</span><span class="p">${s.price === "var" ? L.t("services.priceVaries") : s.price}</span></span>
        <small>${duration(s.min)}${s.days ? " · " + L.t("book.onlyTue") : ""}</small>
      </button>`).join("");
  }

  function renderBarbers() {
    const opts = [{ id: "any", name: L.t("book.anyone"), sub: L.t("book.anyoneSub") }].concat(C.barbers);
    $("barberOpts").innerHTML = opts.map((b) => `
      <button class="opt" data-barber="${b.id}" aria-pressed="${state.barber === b.id}">
        <span class="row"><span>${esc(b.name)}</span></span>
        ${b.sub ? `<small>${b.sub}</small>` : ""}
      </button>`).join("");
  }

  function renderDays() {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    let html = "";
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const ok = dayAllowed(d);
      html += `<button class="day" data-date="${ymd(d)}" aria-pressed="${state.date === ymd(d)}" ${ok ? "" : "disabled"}>
        <span class="dw">${L.t("dayshort." + d.getDay())}</span>
        <span class="dn">${d.getDate()}</span>
        <span class="dm">${d.toLocaleDateString(locale(), { month: "short" }).replace(".", "")}</span>
      </button>`;
    }
    $("days").innerHTML = html;
  }

  function renderSlots() {
    const area = $("slotArea");
    if (!state.date) { area.innerHTML = ""; return; }
    if (state.loading) { area.innerHTML = `<p class="state">${L.t("book.loading")}</p>`; return; }
    if (state.slots === "error") { area.innerHTML = `<p class="state">${L.t("book.error")}</p>`; return; }
    if (!state.slots || !state.slots.length) { area.innerHTML = `<p class="state">${L.t("book.none")}</p>`; return; }
    area.innerHTML = `<div class="slots">${state.slots.map((t) =>
      `<button class="slot" data-time="${t}" aria-pressed="${state.time === t}">${fmtTime(t)}</button>`).join("")}</div>`;
  }

  function renderSummary() {
    const rows = [];
    if (state.service) {
      rows.push([L.t("book.step1"), svcName(state.service)]);
      rows.push([L.t("book.price"), state.service.price === "var" ? L.t("services.priceVaries") : state.service.price]);
    }
    if (state.barber) rows.push([L.t("book.step2"), barberName(state.barber)]);
    if (state.date) rows.push([L.t("book.step3"), fmtDate(state.date) + (state.time ? ` · ${fmtTime(state.time)}` : "")]);
    $("summary").innerHTML = rows.length
      ? rows.map(([k, v]) => `<div class="sum-row"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join("")
      : `<p class="state" style="padding:0">—</p>`;
  }

  function renderAll() {
    renderSteps(); renderServices(); renderBarbers(); renderDays(); renderSlots(); renderSummary();
  }

  async function loadSlots() {
    state.loading = true; state.slots = null; state.time = null;
    renderSlots(); renderSummary();
    const forDate = state.date;
    try {
      const slots = await fetchSlots();
      if (forDate !== state.date) return;
      state.slots = slots;
    } catch (e) {
      state.slots = "error";
    }
    state.loading = false;
    renderSlots();
  }

  function scrollToStep(n) {
    const el = document.querySelector(`.step[data-step="${n}"]`);
    if (el && el.getBoundingClientRect().top < 70) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else if (el && window.innerWidth < 900) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------- events ----------
  document.addEventListener("click", (e) => {
    const go = e.target.closest("[data-goto]");
    if (go) { state.step = Number(go.dataset.goto); renderAll(); return; }

    const s = e.target.closest("[data-service]");
    if (s) {
      state.service = C.services.find((x) => x.id === s.dataset.service);
      if (state.date && !dayAllowed(parseYmd(state.date))) { state.date = null; state.slots = null; }
      state.time = null;
      state.step = state.barber ? 3 : 2;
      renderAll();
      if (state.date && state.step === 3) loadSlots();
      scrollToStep(state.step);
      return;
    }

    const b = e.target.closest("[data-barber]");
    if (b) {
      state.barber = b.dataset.barber;
      state.time = null;
      state.step = 3;
      renderAll();
      if (state.date) loadSlots();
      scrollToStep(3);
      return;
    }

    const d = e.target.closest("[data-date]");
    if (d && !d.disabled) {
      state.date = d.dataset.date;
      renderDays();
      loadSlots();
      return;
    }

    const t = e.target.closest("[data-time]");
    if (t) {
      state.time = t.dataset.time;
      state.step = 4;
      renderAll();
      scrollToStep(4);
      setTimeout(() => $("name").focus({ preventScroll: true }), 300);
    }
  });

  $("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (state.sending) return;
    const f = e.target;
    const name = f.name.value.trim(), phone = f.phone.value.trim(), email = f.email.value.trim();
    if (!name || phone.replace(/\D/g, "").length < 10) { $("formErr").textContent = L.t("book.required"); return; }
    $("formErr").textContent = "";

    state.sending = true;
    const btn = $("submitBtn");
    btn.disabled = true; btn.textContent = L.t("book.sending");

    const payload = {
      service: state.service.id, barber: state.barber, date: state.date, time: state.time,
      name, phone, email, notes: f.notes.value.trim(), lang: L.get(), website: f.website.value,
    };
    let res;
    try { res = await sendBooking(payload); } catch (err) { res = { ok: false }; }

    state.sending = false;
    btn.disabled = false; btn.textContent = L.t("book.confirm");

    if (res && res.ok) return showSuccess(res, payload);
    if (res && res.error === "taken") {
      $("formErr").textContent = L.t("book.taken");
      state.step = 3; renderAll(); loadSlots(); scrollToStep(3);
      return;
    }
    $("formErr").textContent = `${L.t("book.error")} ${C.shop.phone}`;
  });

  function showSuccess(res, p) {
    $("shell").innerHTML = `
      <div class="step" style="grid-column:1/-1;max-width:640px;margin:0 auto;width:100%">
        <div class="success">
          <div class="check" aria-hidden="true">✓</div>
          <h2>${L.t("book.done")}</h2>
          <p>${L.t("book.doneSub")}</p>
          <p class="when">${esc(svcName(state.service))} ${L.t("book.with")} ${esc(res.barberName || barberName(p.barber))}<br>${esc(fmtDate(p.date))} · ${fmtTime(p.time)}</p>
          ${p.email && !DEMO ? `<p>${L.t("book.doneEmail")}</p>` : ""}
          <p style="margin-top:18px">${L.t("book.policy")} <a href="${C.shop.phoneHref}">${C.shop.phone}</a></p>
          <p style="margin-top:28px"><a class="btn btn-ghost" href="book.html">${L.t("book.again")}</a></p>
        </div>
      </div>`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  L.onChange(() => { if ($("flow")) renderAll(); });
  L.apply();
})();
