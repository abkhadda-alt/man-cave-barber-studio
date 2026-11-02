// Loading screen: "MAN [photo] CAVE" with the shop's work photos flipping in the gap and a 000→100 counter.
// When the page has loaded, the last photo (the shop) opens up to fill the screen and the words slide away.
(function () {
  const L = document.getElementById("loader");
  // Coming back with the browser's Back button restores the old page from memory, without the loader;
  // reload it so the loading screen plays every time the homepage opens.
  window.addEventListener("pageshow", (e) => { if (e.persisted) location.reload(); });
  if (!L) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const photo = document.getElementById("ldPhoto");
  const slot = document.getElementById("ldSlot");
  const count = document.getElementById("ldCount");
  const imgs = [...photo.querySelectorAll("img")];
  const MIN_MS = reduce ? 800 : 1600;   // long enough to see the photos, short enough not to annoy
  const MAX_MS = 6000;                  // never hold the page longer than this
  document.body.classList.add("loading");

  function place() {
    const r = slot.getBoundingClientRect();
    Object.assign(photo.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
  }
  place();
  window.addEventListener("resize", place);

  // Flip through the work photos (the last image, the shop, is kept for the reveal).
  let i = 0;
  imgs[0].classList.add("on");
  const flip = setInterval(() => {
    imgs[i].classList.remove("on");
    i = (i + 1) % (imgs.length - 1);
    imgs[i].classList.add("on");
  }, reduce ? 700 : 280);

  let loaded = document.readyState === "complete";
  window.addEventListener("load", () => { loaded = true; });

  const start = performance.now();
  let finished = false;
  function tick(now) {
    if (finished) return;
    const t = Math.min(1, (now - start) / MIN_MS);
    const p = loaded ? t : Math.min(t, 0.9);
    if (count) count.textContent = String(Math.round(p * 100)).padStart(3, "0");
    if (p < 1 && now - start < MAX_MS) requestAnimationFrame(tick);
    else finish();
  }
  requestAnimationFrame(tick);
  L.addEventListener("click", finish);   // tap to skip

  function finish() {
    if (finished) return;
    finished = true;
    if (count) count.textContent = "100";
    clearInterval(flip);
    imgs.forEach((im) => im.classList.remove("on"));
    imgs[imgs.length - 1].classList.add("on");
    setTimeout(() => {
      window.removeEventListener("resize", place);
      photo.classList.add("expand");
      L.classList.add("reveal");
      Object.assign(photo.style, { left: "0px", top: "0px", width: "100vw", height: "100vh" });
      setTimeout(() => {
        L.classList.add("done");
        document.body.classList.remove("loading");
        setTimeout(() => L.remove(), 600);
      }, reduce ? 200 : 1000);
    }, 250);
  }
})();
