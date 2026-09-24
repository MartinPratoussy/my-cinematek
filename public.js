const postsList = document.getElementById("posts-list");
const loadMorePosts = document.getElementById("load-more-posts");
const watchedList = document.getElementById("watched-list");
const modal = document.getElementById("critic-modal");
const modalContent = document.getElementById("modal-content");

function escapeHtml(value = "") {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}
function money(value) { return value ? `${Number(value).toLocaleString("fr-FR")} $` : "Non renseigné"; }
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
async function loadWatched() {
  const response = await fetch(`/api/watched?fresh=${Date.now()}`, { cache: "no-store" });
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

function viewingContextMarkup(post) {
  const place = venueButton(post.venue) || escapeHtml(post.context || "Chez soi");
  return `<aside class="viewing-context"><p class="eyebrow">séance</p><div class="viewing-context-line"><span>${escapeHtml(post.date)}</span><span>${place}</span></div></aside>`;
}

function criticMarkup(post) {
  const film = post.film || {};
  return `<section class="film-information"><p class="eyebrow">le film</p><div class="modal-film-heading">${film.poster ? `<img class="critic-poster" src="${escapeHtml(film.poster)}" alt="Affiche de ${escapeHtml(post.movieTitle)}" />` : ""}<div><h2 id="modal-title">${escapeHtml(post.movieTitle)}</h2><p>${escapeHtml(film.year || "")}</p></div></div>${technicalFacts(film)}</section>${viewingContextMarkup(post)}<section class="critic-text"><p class="eyebrow">la critique</p><div class="post-body">${escapeHtml(post.body || "").replace(/\n/g, "<br><br>")}</div></section><section class="critic-conclusion"><p class="eyebrow">conclusion</p><div class="post-body">${escapeHtml(post.conclusion || "").replace(/\n/g, "<br><br>")}</div><strong class="rating">${Number(post.rating).toFixed(1)}<small>/10</small></strong></section>`;
}
function openModal(post) { modalContent.innerHTML = criticMarkup(post); modal.hidden = false; document.body.classList.add("modal-open"); modal.querySelector(".modal-close").focus(); }
function closeModal() { modal.hidden = true; document.body.classList.remove("modal-open"); }
function renderDiary(posts, append = false) {
  if (!posts.length) {
    if (!append) postsList.innerHTML = '<p class="empty-state">Le journal est vide.</p>';
    return;
  }
  const markup = posts.map((post, index) => `<button class="diary-row ${!append && index === 0 ? "diary-row-latest" : ""}" type="button" data-id="${post.id}"><span class="diary-date">${escapeHtml(post.date)}${!append && index === 0 ? "<small>dernière</small>" : ""}</span>${post.film?.poster ? `<img class="diary-poster" src="${escapeHtml(post.film.poster)}" alt="" />` : ""}<span class="diary-copy"><span class="film-kicker">${escapeHtml(post.movieTitle)}</span><strong>${escapeHtml(post.title)}</strong><span class="diary-venue">${venueLabel(post.venue) || escapeHtml(post.context || "")}</span></span><span class="diary-arrow" aria-hidden="true">&rarr;</span></button>`).join("");
  if (append) postsList.insertAdjacentHTML("beforeend", markup); else postsList.innerHTML = markup;
  postsList.querySelectorAll(".diary-row").forEach((row) => row.addEventListener("click", () => { const post = posts.find((item) => item.id === Number(row.dataset.id)); if (post) openModal(post); }));
}
function renderWatched(items) {
  watchedList.innerHTML = items.length ? items.map((item) => `<article class="recent-watch-row"><div class="recent-watch-copy"><strong>${escapeHtml(item.film?.title || "Film sans titre")}${item.rewatch ? ' <em>revu</em>' : ""}</strong><span>${escapeHtml(item.date)} · ${venueButton(item.venue) || "visionnage"}${item.rating !== null && item.rating !== undefined ? ` · ★ ${Number(item.rating).toFixed(1)}` : ""}</span>${item.note ? `<p class="recent-watch-note"><small>note rapide</small>${escapeHtml(item.note)}</p>` : ""}</div>${item.film?.poster ? `<img class="recent-watch-poster" src="${escapeHtml(item.film.poster)}" alt="" />` : ""}</article>`).join("") : '<p class="empty-state">Aucun visionnage sans critique.</p>';
}
document.querySelectorAll("[data-close-modal]").forEach((element) => element.addEventListener("click", closeModal));
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !modal.hidden) closeModal(); });
let postOffset = 0;
loadPosts().then((posts) => { postOffset = posts.length; renderDiary(posts); loadMorePosts.hidden = posts.length < 8; return loadWatched(); }).then(renderWatched).catch((error) => { postsList.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`; });
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
