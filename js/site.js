(function () {
  const C = window.MC_CONFIG;
  const L = window.MC_LANG;
  const $ = (id) => document.getElementById(id);

  $("logo").src = C.images.logo;
  $("hero").style.backgroundImage = `url("${C.images.hero}")`;
  $("callBtn").href = C.shop.phoneHref;
  $("phoneText").textContent = C.shop.phone;
  $("phoneLink").href = C.shop.phoneHref;
  $("phoneLink").textContent = C.shop.phone;
  $("addr1").textContent = C.shop.address;
  $("addr2").textContent = C.shop.city;
  $("dirBtn").href = C.shop.mapsUrl;
  $("mapFrame").src = C.shop.mapsEmbed;
  $("igLink").href = C.shop.instagram;
  $("fbLink").href = C.shop.facebook;
  $("year").textContent = new Date().getFullYear();

  function duration(min) {
    const h = Math.floor(min / 60), m = min % 60;
    return h ? `${h} h${m ? " " + m : ""}` : `${m} min`;
  }

  function render() {
    const lang = L.get();
    const fmtRating = C.shop.rating.toLocaleString(lang === "en" ? "en-CA" : lang + "-CA");
    $("ratingVal").textContent = fmtRating;
    $("ratingCount").textContent = `(${C.shop.reviews}) ${L.t("hero.rating")}`;

    $("serviceList").innerHTML = C.services.map((s) => `
      <article class="svc">
        <img class="svc-img" src="images/services/${s.id}.jpg" alt="${L.t(`svc.${s.id}.name`)}" loading="lazy" />
        <div class="svc-body">
          <div class="svc-top">
            <h3>${L.t(`svc.${s.id}.name`)}${s.popular ? `<span class="badge">${L.t("services.popular")}</span>` : ""}</h3>
            <span class="price">${s.price === "var" ? L.t("services.priceVaries") : s.price}</span>
          </div>
          <p>${L.t(`svc.${s.id}.desc`)}</p>
          <div class="svc-foot">
            <span class="dur">${duration(s.min)}</span>
            <a class="btn btn-ghost btn-sm" href="book.html?service=${s.id}">${L.t("services.book")}</a>
          </div>
        </div>
      </article>`).join("");

    $("teamList").innerHTML = C.barbers.map((b) => `
      <article class="barber">
        <div class="barber-photo${b.photo ? "" : " no-photo"}">
          ${b.photo
            ? `<img src="${b.photo}" alt="${b.name}" loading="lazy" />`
            : `<img class="mark" src="${C.images.logo}" alt="" /><span class="initial" aria-hidden="true">${b.name.charAt(0)}</span>`}
        </div>
        <div class="barber-info">
          <h3>${b.name}</h3>
          <a class="btn btn-gold btn-sm" href="book.html?barber=${b.id}">${L.t("team.book")} ${b.name.split(" ")[0]}</a>
        </div>
      </article>`).join("");

    const today = new Date().getDay();
    $("hoursList").innerHTML = [1, 2, 3, 4, 5, 6, 0].map((d) => {
      const h = C.hours[d];
      return `<li class="${d === today ? "today" : ""}"><span>${L.t("day." + d)}</span><span>${h ? `${h[0]} – ${h[1]}` : L.t("book.closed")}</span></li>`;
    }).join("");
  }

  L.onChange(render);
  L.apply();
})();
