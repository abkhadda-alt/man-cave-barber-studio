// Google reviews band: the shop's rating, then live Google reviews alternating with photos of the barbers' work.
// Reviews are loaded from Google's Places API at view time (never copied into the site), with Google attribution.
// With no API key configured, the band shows the rating summary and the work photos only.
(function () {
  const C = window.MC_CONFIG;
  const L = window.MC_LANG;
  const row = document.getElementById("reviewsRow");
  if (!row) return;
  const G = C.google || {};
  document.getElementById("reviewsAll").href = G.reviewsUrl;

  const featured = (G.featured || []).map((r) => ({ ...r, photo: null, uri: null, when: "" }));
  let reviews = featured.slice();   // [{name, photo, uri, rating, text, when}]
  let rating = C.shop.rating, total = C.shop.reviews;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const stars = (n) => "★★★★★".slice(0, Math.round(n)) + "☆☆☆☆☆".slice(0, 5 - Math.round(n));
  const locale = () => ({ fr: "fr-CA", en: "en-CA", es: "es" })[L.get()];

  function photoCard(src) {
    if (/\.mp4$/i.test(src)) {
      // Silent looping clip; the poster frame shows until it starts playing.
      const poster = src.replace(/\.mp4$/i, "-poster.jpg");
      return `<figure class="rv-photo"><video src="${esc(src)}" poster="${esc(poster)}" muted autoplay loop playsinline preload="metadata"></video></figure>`;
    }
    return `<figure class="rv-photo"><img src="${esc(src)}" alt="" loading="lazy" /></figure>`;
  }

  function reviewCard(r) {
    const name = r.name || L.t("reviews.anon");
    const avatar = r.photo
      ? `<img class="rv-avatar" src="${esc(r.photo)}" alt="" referrerpolicy="no-referrer" loading="lazy" />`
      : `<span class="rv-avatar rv-avatar-letter">${esc(r.name ? r.name.charAt(0) : "G")}</span>`;
    return `
      <article class="rv-card rv-review${r.text.length > 280 ? " rv-long" : ""}">
        <header>
          ${avatar}
          <div><a class="rv-name" href="${esc(r.uri || G.reviewsUrl)}" target="_blank" rel="noopener">${esc(name)}</a>
          <span class="rv-when">${esc(r.when || "")}</span></div>
        </header>
        <div class="rv-stars" aria-label="${r.rating} / 5">${stars(r.rating)}</div>
        <p class="rv-text">${esc(r.text)}</p>
        <footer class="rv-source">${L.t("reviews.source")}</footer>
      </article>`;
  }

  function render() {
    const work = C.work || [];
    let html = "";
    const n = Math.max(reviews.length, work.length);
    for (let i = 0; i < n; i++) {
      if (work[i]) html += photoCard(work[i]);
      if (reviews[i]) html += reviewCard(reviews[i]);
    }
    row.innerHTML = html;
  }

  // ---------- live reviews via Google Maps JavaScript API (Places) ----------
  async function loadReviews() {
    if (!G.apiKey) return;
    try {
      await new Promise((resolve, reject) => {
        window.__mcMapsReady = resolve;
        const s = document.createElement("script");
        s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(G.apiKey)}&v=weekly&loading=async&callback=__mcMapsReady`;
        s.async = true;
        s.onerror = reject;
        document.head.appendChild(s);
      });
      const { Place } = await google.maps.importLibrary("places");
      const { places } = await Place.searchByText({ textQuery: G.placeQuery, fields: ["id"], maxResultCount: 1 });
      if (!places || !places.length) return;
      const place = new Place({ id: places[0].id, requestedLanguage: L.get() });
      await place.fetchFields({ fields: ["rating", "userRatingCount", "reviews", "googleMapsURI"] });
      if (place.rating) rating = place.rating;
      if (place.userRatingCount) total = place.userRatingCount;
      if (place.googleMapsURI) { G.reviewsUrl = place.googleMapsURI; document.getElementById("reviewsAll").href = G.reviewsUrl; }
      const known = new Set(featured.map((r) => r.name));
      const live = (place.reviews || [])
        .filter((r) => (r.rating || 0) >= (G.minStars || 4) && r.text)
        .map((r) => ({
          name: (r.authorAttribution && r.authorAttribution.displayName) || "Google",
          photo: r.authorAttribution && r.authorAttribution.photoURI,
          uri: r.authorAttribution && r.authorAttribution.uri,
          rating: r.rating,
          text: r.text,
          when: r.relativePublishTimeDescription,
        }));
      // Live reviews replace the matching featured ones (they carry photos), the rest follow.
      reviews = featured.map((f) => live.find((l) => l.name === f.name) || f)
        .concat(live.filter((l) => !known.has(l.name)))
        .slice(0, G.max || 6);
      render();
    } catch (e) {
      // Keep the summary + photos if Google can't be reached or the key is misconfigured.
      console.warn("Google reviews unavailable:", e && e.message);
    }
  }

  L.onChange(render);
  render();
  loadReviews();
})();
