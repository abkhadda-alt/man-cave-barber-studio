// Shop configuration shared by the homepage and the booking page.
// After deploying the Google Apps Script (see README.md), paste its Web App URL here.
// While API_URL is empty, the booking page runs in DEMO mode (fake slots, nothing is saved).
window.MC_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbxTMopjtbCf32hb3SJ9u4xbArDJ8X-PJW_H8RvNsDB8eng6lBm5NAAOHVf0UqLoOFCR/exec",

  shop: {
    name: "Man Cave Barber Studio",
    phone: "+1 514-604-2040",
    phoneHref: "tel:+15146042040",
    address: "3678 Ch. de Chambly",
    city: "Longueuil (Saint-Hubert), QC J4L 1N8",
    mapsUrl: "https://www.google.com/maps/dir/?api=1&destination=3678+Chemin+de+Chambly+Longueuil+QC+J4L+1N8",
    mapsEmbed: "https://www.google.com/maps?q=Man+Cave+Barber+Studio+3678+Chemin+de+Chambly+Longueuil&output=embed",
    instagram: "https://www.instagram.com/mancavebarberstudio/",
    facebook: "https://www.facebook.com/mancavebarberstudio/",
    rating: 4.7,
    reviews: 91,
  },

  // Live Google reviews (see README "Google reviews"). Leave apiKey empty to show only the rating + work photos.
  google: {
    apiKey: "",
    placeQuery: "Man Cave Barber Studio, 3678 Chemin de Chambly, Longueuil, QC J4L 1N8",
    reviewsUrl: "https://www.google.com/maps/search/?api=1&query=Man+Cave+Barber+Studio+3678+Chemin+de+Chambly+Longueuil",
    // Reviews from the shop's Google page, shown even without an API key (live reviews are added after these).
    featured: [
      {
        name: "Cristian Navarro",
        rating: 5,
        text: "I had probably the best haircut that I ever had in my life with Jesus. He really takes his time and does not rush through things. The price is extremely fair and I am changing barbers from now on.\n\nAmazing place!",
      },
      {
        name: "Maxim Velisco",
        rating: 5,
        text: "Came in for a fresh haircut, left with a new outlook on life. Staff is very affectionate, professional and caring. The haircuts themselves are excellent, true craftsmanship created by artists, not barbers. Price is 100% fair for the quality of service, so much so that they might even be undercharging customers. Amidst so many barbershops, this one is truly an underrated hidden gem hiding in plain sight. Will 100% come back again.",
      },
      {
        name: "",
        rating: 5,
        text: "I received an excellent haircut at this barbershop.",
      },
    ],
    minStars: 4,
    max: 6,
  },

  // Photos of the barbers' work, shown between the reviews and in the loading screen.
  work: ["images/work/fade-mirror.jpg", "images/work/haircut-video.mp4", "images/work/profile.jpg", "images/work/fade-back.jpg"],

  // Opening hours, 0 = Sunday ... 6 = Saturday. Keep in sync with HOURS in apps-script/Code.gs.
  hours: {
    0: ["09:00", "15:00"],
    1: ["09:00", "21:00"],
    2: ["09:00", "21:00"],
    3: ["09:00", "21:00"],
    4: ["09:00", "21:00"],
    5: ["09:00", "21:00"],
    6: ["09:00", "19:00"],
  },

  // Service ids must match SERVICES in apps-script/Code.gs (the script is the source of truth for durations).
  // `days` limits a service to certain weekdays (Tuesday promo).
  services: [
    { id: "haircut", price: "35 $", min: 45 },
    { id: "beard", price: "30 $", min: 30 },
    { id: "combo", price: "50 $", min: 60, popular: true },
    { id: "tuesday", price: "25 $ / 40 $", min: 30, days: [2], promo: true },
    { id: "senior", price: "25 $", min: 30 },
    { id: "scissors", price: "50 $", min: 45 },
    { id: "deluxe", price: "100 $", min: 90 },
    { id: "curls", price: "120 $", min: 30 },
    { id: "color", price: "var", min: 45 },
  ],

  // Barber ids must match BARBERS in apps-script/Code.gs.
  // photo: portrait (4:5) in images/team/. Barbers without one show a branded card until a photo is added.
  barbers: [
    { id: "emiliano", name: "Emiliano Parra" },
    { id: "ivan", name: "Ivan Marte", photo: "images/team/ivan.jpg" },
    { id: "jesus", name: "Jesus" },
    { id: "moises", name: "Moises Ramírez" },
  ],

  images: {
    logo: "images/logo-mc-lime.png",
    hero: "images/work/shop.jpg",
  },
};
