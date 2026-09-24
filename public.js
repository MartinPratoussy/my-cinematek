const postsList = document.getElementById("posts-list");
const loadMorePosts = document.getElementById("load-more-posts");
const watchedList = document.getElementById("watched-list");
const modal = document.getElementById("critic-modal");
const modalContent = document.getElementById("modal-content");
const filmModal = document.getElementById("film-modal");
const filmModalContent = document.getElementById("film-modal-content");
const watchedSentinel = document.getElementById("watched-sentinel");
const featuredReview = document.getElementById("featured-review");

let watchedItems = [];
let watchedOffset = 0;
let watchedLoading = false;
let hasMoreWatched = true;

function escapeHtml(value = "") {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}
function money(value) { return value ? `${Number(value).toLocaleString("fr-FR")} $` : "Non renseigné"; }
function formatDate(value) {
  const parts = String(value || "").split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value || "";
}
function venueLabel(venue) {
  if (!venue || !venue.name) return "";
  const label = escapeHtml(venue.name);
  return venue.location && /^https?:\/\//i.test(venue.location) ? `<a href="${escapeHtml(venue.location)}" target="_blank" rel="noreferrer">${label}</a>` : label;
}

function venueButton(venue) {
  if (!venue || !venue.name) return "";
  const label = escapeHtml(venue.name);
  return venue.location && /^https?:\/\//i.test(venue.location)
    ? `<a class="venue-map-button" href="${escapeHtml(venue.location)}" target="_blank" rel="noreferrer"><span aria-hidden="true">⌖</span>${label}</a>`
    : label;
}
function sortPosts(posts) { return [...posts].sort((a, b) => new Date(b.date) - new Date(a.date)); }
async function loadPosts(offset = 0) {
  const response = await fetch(`/api/posts?limit=8&offset=${offset}&fresh=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Les critiques n’ont pas pu être chargées.");
  const text = await response.text();
  if (!text.trim()) throw new Error("L’archive des critiques a renvoyé une réponse vide.");
  return JSON.parse(text);
}
async function loadWatched(offset = 0, limit = 8) {
  const response = await fetch(`/api/watched?limit=${limit}&offset=${offset}&fresh=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Les visionnages récents n’ont pas pu être chargés.");
  const items = await response.json();
  return Promise.all(items.map(async (item) => {
    if (item.film?.poster || !item.film?.id) return item;
    try {
      const detailsResponse = await fetch(`/api/movie?id=${item.film.id}`);
      if (!detailsResponse.ok) return item;
      const details = await detailsResponse.json();
      return { ...item, film: { ...item.film, ...details } };
    } catch {
      return item;
    }
  }));
}
function technicalFacts(film) {
  return `<div class="technical-grid"><span>Réalisation<strong>${escapeHtml(film.director || "Non renseignée")}</strong></span><span>Distribution<strong>${escapeHtml((film.cast || []).join(", ") || "Non renseignée")}</strong></span><span>Durée<strong>${film.runtime ? `${film.runtime} min` : "Non renseignée"}</strong></span><span>Budget<strong>${money(film.budget)}</strong></span><span>Genres<strong>${escapeHtml((film.genres || []).join(", ") || "Non renseignés")}</strong></span><span>Pays<strong>${escapeHtml((film.countries || []).join(", ") || "Non renseigné")}</strong></span></div>`;
}
function filmDetailsMarkup(film) {
  return `<div class="film-details"><div class="film-details-heading">${film.poster ? `<img class="film-details-poster" src="${escapeHtml(film.poster)}" alt="Affiche de ${escapeHtml(film.title)}" />` : ""}<div><p class="eyebrow">détails du film</p><h2 id="film-modal-title">${escapeHtml(film.title || "Film")}</h2>${film.tagline ? `<p class="film-tagline">${escapeHtml(film.tagline)}</p>` : ""}</div></div>${technicalFacts(film)}${film.overview ? `<section class="film-overview-block"><p class="eyebrow">synopsis</p><p>${escapeHtml(film.overview)}</p></section>` : ""}${film.homepage ? `<a class="venue-map-button film-homepage" href="${escapeHtml(film.homepage)}" target="_blank" rel="noreferrer">Voir la fiche officielle</a>` : ""}</div>`;
}
async function openFilmModal(film) {
  let details = film;
  if (film?.id) {
    try {
      const response = await fetch(`/api/movie?id=${film.id}`);
      if (response.ok) details = { ...film, ...(await response.json()) };
    } catch { /* Keep the stored film data as a fallback. */ }
  }
  filmModalContent.innerHTML = filmDetailsMarkup(details || {});
  filmModal.hidden = false;
  document.body.classList.add("modal-open");
  filmModal.querySelector(".modal-close").focus();
}
function closeFilmModal() { filmModal.hidden = true; if (modal.hidden) document.body.classList.remove("modal-open"); }

function viewingContextMarkup(post) {
  const place = venueButton(post.venue) || escapeHtml(post.context || "Chez soi");
  const context = post.context ? `<span class="viewing-context-note"><strong>contexte</strong> ${escapeHtml(post.context)}</span>` : "";
  return `<aside class="viewing-context"><p class="eyebrow">séance</p><div class="viewing-context-line"><span>${escapeHtml(formatDate(post.date))}</span><span>${place}</span>${context}</div></aside>`;
}

function criticMarkup(post) {
  const film = post.film || {};
  return `<section class="film-information"><p class="eyebrow">le film</p><div class="modal-film-heading">${film.poster ? `<button class="poster-button" type="button" aria-label="Voir les détails du film"><img class="critic-poster" src="${escapeHtml(film.poster)}" alt="Affiche de ${escapeHtml(post.movieTitle)}" /></button>` : ""}<div><h2 id="modal-title">${escapeHtml(post.movieTitle)}</h2><p>${escapeHtml(film.year || "")}</p></div></div>${technicalFacts(film)}</section>${viewingContextMarkup(post)}<section class="critic-text"><p class="eyebrow">la critique</p><div class="post-body">${escapeHtml(post.body || "").replace(/\n/g, "<br><br>")}</div></section><section class="critic-conclusion"><p class="eyebrow">conclusion</p><div class="post-body">${escapeHtml(post.conclusion || "").replace(/\n/g, "<br><br>")}</div><strong class="rating">${Number(post.rating).toFixed(1)}<small>/10</small></strong></section>`;
}
function openModal(post) { modalContent.innerHTML = criticMarkup(post); modal.hidden = false; document.body.classList.add("modal-open"); modal.querySelector(".modal-close").focus(); modalContent.querySelector(".poster-button")?.addEventListener("click", () => openFilmModal(post.film || { title: post.movieTitle })); }
function closeModal() { modal.hidden = true; document.body.classList.remove("modal-open"); }
function truncateText(value = "", maxLength = 180) {
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}…` : text;
}
function renderFeaturedReview(post) {
  if (!featuredReview || !post) return;
  const film = post.film || {};
  const teaser = truncateText(post.body || "", 170);
  featuredReview.innerHTML = `
    <div class="featured-review-copy">
      <p class="eyebrow">dernière critique</p>
      <h2>${escapeHtml(post.title)}</h2>
      <p class="featured-review-title">${escapeHtml(post.movieTitle)}</p>
      <p class="featured-review-teaser">${escapeHtml(teaser)}</p>
      <div class="featured-review-meta"><span>${escapeHtml(formatDate(post.date))}</span></div>
    </div>
    <div class="featured-review-cover">${film.poster ? `<img src="${escapeHtml(film.poster)}" alt="Affiche de ${escapeHtml(post.movieTitle)}" />` : ""}</div>
  `;
  featuredReview.setAttribute("role", "button");
  featuredReview.setAttribute("tabindex", "0");
  featuredReview.onclick = () => openModal(post);
  featuredReview.onkeydown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openModal(post);
    }
  };
}
function renderDiary(posts, append = false) {
  if (!posts.length) {
    if (!append) postsList.innerHTML = '<p class="empty-state">Le journal est vide.</p>';
    return;
  }
  const markup = posts.map((post) => `<button class="diary-row" type="button" data-id="${post.id}"><span class="diary-date">${escapeHtml(formatDate(post.date))}</span>${post.film?.poster ? `<img class="diary-poster" src="${escapeHtml(post.film.poster)}" alt="" />` : ""}<span class="diary-copy"><span class="film-kicker">${escapeHtml(post.movieTitle)}</span><strong>${escapeHtml(post.title)}</strong><span class="diary-venue">${venueButton(post.venue) || escapeHtml(post.context || "")}</span></span><span class="diary-arrow" aria-hidden="true">&rarr;</span></button>`).join("");
  if (append) postsList.insertAdjacentHTML("beforeend", markup); else postsList.innerHTML = markup;
  postsList.querySelectorAll(".diary-row").forEach((row) => row.addEventListener("click", () => { const post = posts.find((item) => item.id === Number(row.dataset.id)); if (post) openModal(post); }));
}
function renderWatched(items, append = false) {
  const mergedItems = append ? [...watchedItems, ...items] : items;
  watchedItems = mergedItems;
  watchedList.innerHTML = mergedItems.length ? mergedItems.map((item, index) => `<article class="recent-watch-row"><div class="recent-watch-copy"><strong>${escapeHtml(item.film?.title || "Film sans titre")}${item.rewatch ? ' <em>revu</em>' : ""}</strong><span>${escapeHtml(formatDate(item.date))} · ${venueButton(item.venue) || "visionnage"}${item.rating !== null && item.rating !== undefined ? ` · ★ ${Number(item.rating).toFixed(1)}` : ""}</span>${item.note ? `<p class="recent-watch-note"><small>note rapide</small>${escapeHtml(item.note)}</p>` : ""}</div>${item.film?.poster ? `<button class="poster-button recent-watch-poster-button" type="button" data-watched-index="${index}" aria-label="Voir les détails du film"><img class="recent-watch-poster" src="${escapeHtml(item.film.poster)}" alt="" /></button>` : ""}</article>`).join("") : '<p class="empty-state">Aucun visionnage sans critique.</p>';
  watchedList.querySelectorAll(".recent-watch-poster-button").forEach((button) => button.addEventListener("click", () => openFilmModal(mergedItems[Number(button.dataset.watchedIndex)].film)));
  if (watchedSentinel) watchedSentinel.hidden = !hasMoreWatched;
}

async function loadMoreWatched() {
  if (watchedLoading || !hasMoreWatched) return;
  watchedLoading = true;
  try {
    const items = await loadWatched(watchedOffset, 8);
    if (!items.length) {
      hasMoreWatched = false;
      if (watchedSentinel) watchedSentinel.hidden = true;
      return;
    }
    watchedOffset += items.length;
    renderWatched(items, true);
    hasMoreWatched = items.length === 8;
  } finally {
    watchedLoading = false;
    if (watchedSentinel) watchedSentinel.hidden = !hasMoreWatched;
  }
}
document.querySelectorAll("[data-close-modal]").forEach((element) => element.addEventListener("click", closeModal));
document.querySelectorAll("[data-close-film-modal]").forEach((element) => element.addEventListener("click", closeFilmModal));
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !modal.hidden) closeModal(); });
let postOffset = 0;
loadPosts().then((posts) => {
  postOffset = posts.length;
  const featuredPost = posts[0];
  const diaryPosts = posts.length > 1 ? posts.slice(1) : posts;
  if (featuredPost) renderFeaturedReview(featuredPost);
  renderDiary(diaryPosts);
  loadMorePosts.hidden = posts.length < 8;
  return loadWatched(0, 8);
}).then((items) => {
  watchedOffset = items.length;
  renderWatched(items);
  hasMoreWatched = items.length === 8;
  if (watchedSentinel) watchedSentinel.hidden = !hasMoreWatched;
  if (watchedSentinel && typeof IntersectionObserver !== "undefined") {
    const sentinelObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMoreWatched();
    }, { root: null, threshold: 0.2 });
    sentinelObserver.observe(watchedSentinel);
  }
}).catch((error) => { postsList.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`; });
loadMorePosts.addEventListener("click", async () => {
  if (loadMorePosts.disabled) return;
  loadMorePosts.disabled = true;
  loadMorePosts.textContent = "Chargement…";
  try {
    const posts = await loadPosts(postOffset);
    if (posts.length) {
      postOffset += posts.length;
      renderDiary(posts, true);
    }
    loadMorePosts.hidden = posts.length < 8;
  } catch (error) {
    loadMorePosts.textContent = "Réessayer";
    loadMorePosts.title = error.message;
    loadMorePosts.disabled = false;
    return;
  }
  loadMorePosts.disabled = false;
  loadMorePosts.textContent = "Charger plus de critiques";
});
