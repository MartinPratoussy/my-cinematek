const loginPanel = document.getElementById("login-panel");
const loginForm = document.getElementById("login-form");
const loginPassword = document.getElementById("author-password");
const loginStatus = document.getElementById("login-status");
const editor = document.getElementById("editor");
const editorStatus = document.getElementById("editor-status");
const logoutButton = document.getElementById("logout");
const form = document.getElementById("review-form");
const filmSearch = document.getElementById("film-search");
const filmSearchStatus = document.getElementById("film-search-status");
const filmResults = document.getElementById("film-results");
const selectedFilm = document.getElementById("selected-film");
const filmData = document.getElementById("film-data");
const cancelEdit = document.getElementById("cancel-edit");
const adminPostList = document.getElementById("admin-post-list");
const watchedForm = document.getElementById("watched-form");
const watchedFilmSearch = document.getElementById("watched-film-search");
const watchedFilmResults = document.getElementById("watched-film-results");
const watchedFilmData = document.getElementById("watched-film-data");
const watchedDate = document.getElementById("watched-date");
const watchedRating = document.getElementById("watched-rating");
const watchedRewatch = document.getElementById("watched-rewatch");
const watchedNote = document.getElementById("watched-note");
const watchedVenueType = document.getElementById("watched-venue-type");
const watchedVenueName = document.getElementById("watched-venue-name");
const watchedVenueLocation = document.getElementById("watched-venue-location");
const watchedVenueResults = document.getElementById("watched-venue-results");
const watchedVenueField = document.getElementById("watched-venue-name-field");
const watchedStatus = document.getElementById("watched-status");
const presetTags = document.getElementById("preset-tags");
const venueType = document.getElementById("venue-type");
const venueName = document.getElementById("venue-name");
const venueLocation = document.getElementById("venue-location");
const venueNameField = document.getElementById("venue-name-field");
const venueResults = document.getElementById("venue-results");

const TAG_PRESETS = ["horror", "drama", "comedy", "thriller", "romance", "science fiction", "animation", "documentary", "rewatch", "classic"];

let authorSecret = "";
let editingPostId = null;
let selectedFilmData = null;
let watchedFilmTimer;
let filmSearchTimer;
let venueSearchTimer;
let editingWatchedId = null;
let watchedAdminCurrentItems = [];
let watchedAdminPage = 0;
const WATCHED_ADMIN_PAGE_SIZE = 20;
const watchedAdminList = document.getElementById("watched-admin-list");
const watchedAdminSearch = document.getElementById("watched-admin-search");
const watchedAdminPrev = document.getElementById("watched-admin-prev");
const watchedAdminNext = document.getElementById("watched-admin-next");
const watchedAdminPageLabel = document.getElementById("watched-admin-page-label");
const letterboxdUsername = document.getElementById("letterboxd-username");
const letterboxdSyncButton = document.getElementById("letterboxd-sync");
const letterboxdStatus = document.getElementById("letterboxd-status");

function renderPresetTags() {
  presetTags.innerHTML = TAG_PRESETS.map((tag) => `<button type="button" class="preset-tag" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`).join("");
  presetTags.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
    const tags = document.getElementById("tags");
    const current = tags.value.split(",").map((tag) => tag.trim()).filter(Boolean);
    if (!current.includes(button.dataset.tag)) current.push(button.dataset.tag);
    tags.value = current.join(", ");
    button.classList.toggle("selected", current.includes(button.dataset.tag));
  }));
}

function updateVenueFields() {
  const home = venueType.value === "home";
  venueNameField.classList.toggle("hidden", home);
  if (home) {
    venueName.value = "My TV";
    venueLocation.value = "";
  } else if (venueName.value === "My TV") {
    venueName.value = "";
  }
}

async function readJson(response) {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(`Le serveur a renvoyé une réponse vide (${response.status}).`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Le serveur a renvoyé des données invalides (${response.status}).`);
  }
}

function escapeHtml(value = "") {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}

function posterUrl(path) {
  return path ? `https://image.tmdb.org/t/p/w342${path}` : "";
}

async function loadPosts() {
  const response = await fetch("/api/posts");
  if (!response.ok) throw new Error("Les critiques n’ont pas pu être chargées.");
  return readJson(response);
}

async function authenticate(password) {
  const response = await fetch("/api/auth", { method: "POST", headers: { "X-Author-Password": password } });
  return response.ok;
}

function showEditor() {
  loginPanel.classList.add("hidden");
  editor.classList.remove("hidden");
  editorStatus.textContent = "Éditeur déverrouillé.";
  loadAdminPosts();
  loadWatchedAdmin();
}

function resetForm() {
  editingPostId = null;
  selectedFilmData = null;
  form.reset();
  filmData.value = "";
  selectedFilm.innerHTML = "";
  selectedFilm.classList.add("hidden");
  document.getElementById("rating").value = 8;
  document.getElementById("publish-button").textContent = "Publier la critique";
  cancelEdit.classList.add("hidden");
  updateVenueFields();
}

async function selectFilm(film) {
  filmSearchStatus.textContent = "Chargement des informations du film…";
  try {
    const response = await fetch(`/api/movie?id=${film.id}`);
    const details = await readJson(response);
    if (!response.ok) throw new Error(details.error || "Informations du film indisponibles.");
    selectedFilmData = details;
  } catch (error) {
    filmSearchStatus.textContent = error.message;
    return;
  }
  document.getElementById("movie-title").value = selectedFilmData.title;
  filmData.value = JSON.stringify(selectedFilmData);
  selectedFilm.innerHTML = `${selectedFilmData.poster ? `<img src="${escapeHtml(selectedFilmData.poster)}" alt="" />` : ""}<div><p class="eyebrow">film sélectionné</p><h3>${escapeHtml(selectedFilmData.title)}</h3><p>${escapeHtml(selectedFilmData.year || "")}</p></div>`;
  selectedFilm.classList.remove("hidden");
  filmResults.innerHTML = "";
  filmSearchStatus.textContent = "Film sélectionné avec ses informations techniques.";
}

function selectVenue(place) {
  venueName.value = place.name;
  venueLocation.value = place.location;
  venueResults.innerHTML = "";
  venueNameField.classList.remove("has-selection");
  venueNameField.classList.add("has-selection");
}

async function searchFilms() {
  const query = filmSearch.value.trim();
  if (!query) return;
  filmSearchStatus.textContent = "Recherche…";
  try {
    const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
    const payload = await readJson(response);
    if (!response.ok) throw new Error(payload.error || "Recherche indisponible.");
    filmResults.innerHTML = payload.results.slice(0, 6).map((film) => `<button type="button" class="film-result" data-film='${escapeHtml(JSON.stringify(film))}'>${film.poster_path ? `<img src="${escapeHtml(posterUrl(film.poster_path))}" alt="" />` : ""}<span><strong>${escapeHtml(film.title)}</strong><small>${escapeHtml((film.release_date || "").slice(0, 4))}</small></span></button>`).join("");
    filmResults.querySelectorAll(".film-result").forEach((button) => button.addEventListener("click", () => selectFilm(JSON.parse(button.dataset.film))));
    filmSearchStatus.textContent = payload.results.length ? "Choisissez le film vu." : "Aucun film trouvé.";
  } catch (error) {
    filmSearchStatus.textContent = error.message;
  }
}

async function searchWatchedFilms() {
  const query = watchedFilmSearch.value.trim();
  if (!query) return;
  try {
    const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
    const payload = await readJson(response);
    if (!response.ok) throw new Error(payload.error || "Recherche indisponible.");
    watchedFilmResults.innerHTML = payload.results.slice(0, 6).map((film) => `<button type="button" class="film-result" data-film='${escapeHtml(JSON.stringify(film))}'>${film.poster_path ? `<img src="${escapeHtml(posterUrl(film.poster_path))}" alt="" />` : ""}<span><strong>${escapeHtml(film.title)}</strong><small>${escapeHtml((film.release_date || "").slice(0, 4))}</small></span></button>`).join("");
    watchedFilmResults.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => { watchedFilmData.value = JSON.stringify(JSON.parse(button.dataset.film)); watchedFilmSearch.value = JSON.parse(button.dataset.film).title; watchedFilmResults.innerHTML = ""; }));
  } catch (error) { watchedStatus.textContent = error.message; }
}

async function searchVenues() {
  const query = venueName.value.trim();
  if (query.length < 3 || venueType.value === "home") return;
  try {
    const response = await fetch(`/api/places?query=${encodeURIComponent(query)}`);
    const payload = await readJson(response);
    if (!response.ok) throw new Error(payload.error || "Recherche de cinéma indisponible.");
    venueResults.innerHTML = payload.results.map((place) => `<button type="button" class="venue-result" data-place='${escapeHtml(JSON.stringify(place))}'><strong>${escapeHtml(place.name)}</strong><small>${escapeHtml(place.displayName)}</small></button>`).join("");
    venueResults.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => selectVenue(JSON.parse(button.dataset.place))));
  } catch (error) {
    venueResults.innerHTML = `<span class="field-hint">${escapeHtml(error.message)}</span>`;
  }
}

async function searchWatchedVenues() {
  const query = watchedVenueName.value.trim();
  if (query.length < 3 || watchedVenueType.value === "home") return;
  try {
    const response = await fetch(`/api/places?query=${encodeURIComponent(query)}`);
    const payload = await readJson(response);
    if (!response.ok) throw new Error(payload.error || "Recherche de cinéma indisponible.");
    watchedVenueResults.innerHTML = payload.results.map((place) => `<button type="button" class="venue-result" data-place='${escapeHtml(JSON.stringify(place))}'><strong>${escapeHtml(place.name)}</strong><small>${escapeHtml(place.displayName)}</small></button>`).join("");
    watchedVenueResults.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
      const place = JSON.parse(button.dataset.place);
      watchedVenueName.value = place.name;
      watchedVenueLocation.value = place.location;
      watchedVenueResults.innerHTML = "";
    }));
  } catch (error) {
    watchedVenueResults.innerHTML = `<span class="field-hint">${escapeHtml(error.message)}</span>`;
  }
}

function editPost(post) {
  editingPostId = post.id;
  selectedFilmData = post.film || { title: post.movieTitle };
  filmData.value = JSON.stringify(selectedFilmData);
  document.getElementById("movie-title").value = post.movieTitle;
  document.getElementById("review-title").value = post.title;
  document.getElementById("watch-date").value = post.date;
  document.getElementById("rating").value = post.rating;
  document.getElementById("tags").value = (post.tags || []).join(", ");
  document.getElementById("context").value = post.context || "";
  venueType.value = post.venue?.type || "cinema";
  venueName.value = post.venue?.name || "";
  venueLocation.value = post.venue?.location || "";
  updateVenueFields();
  document.getElementById("review-body").value = post.body;
  document.getElementById("conclusion").value = post.conclusion || "";
  selectedFilm.innerHTML = `${selectedFilmData.poster ? `<img src="${escapeHtml(selectedFilmData.poster)}" alt="" />` : ""}<div><p class="eyebrow">film sélectionné</p><h3>${escapeHtml(post.movieTitle)}</h3><p>${escapeHtml(selectedFilmData.year || "")}</p></div>`;
  selectedFilm.classList.remove("hidden");
  document.getElementById("publish-button").textContent = "Enregistrer les modifications";
  cancelEdit.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loadAdminPosts() {
  const posts = await loadPosts();
  adminPostList.innerHTML = posts.length ? posts.map((post) => `<article class="admin-post"><div><p class="eyebrow">${escapeHtml(post.date)}</p><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.movieTitle)}</p></div><div class="admin-entry-actions"><button type="button" class="secondary-btn" data-action="edit" data-id="${post.id}">Modifier</button><button type="button" class="danger-btn" data-action="delete" data-id="${post.id}">Supprimer</button></div></article>`).join("") : '<p class="empty-state">Aucune critique publiée.</p>';
  adminPostList.querySelectorAll("button").forEach((button) => button.addEventListener("click", async () => {
    if (button.dataset.action === "delete") return deleteEntry(`/api/posts/${button.dataset.id}`, `Supprimer la critique « ${button.closest(".admin-post").querySelector("h3").textContent} » ?`, loadAdminPosts);
    editPost((await loadPosts()).find((post) => post.id === Number(button.dataset.id)));
  }));
}

function renderWatchedAdmin(items) {
  const query = watchedAdminSearch.value.trim().toLowerCase();
  const filteredItems = !query ? items : items.filter((item) => {
    const haystack = [item.film?.title, item.date, item.note, item.rating, item.venue?.name].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(query);
  });

  watchedAdminList.innerHTML = filteredItems.length ? filteredItems.map((item) => `<article class="admin-post"><div><p class="eyebrow">${escapeHtml(item.date)}${item.rewatch ? " · revu" : ""}</p><h3>${escapeHtml(item.film?.title || "Film sans titre")}</h3><p>${item.rating == null ? "Sans note" : `★ ${Number(item.rating).toFixed(1)}`} ${item.note ? `· ${escapeHtml(item.note)}` : ""}</p></div><div class="admin-entry-actions"><button type="button" class="secondary-btn" data-action="edit" data-watched-id="${item.id}">Modifier</button><button type="button" class="danger-btn" data-action="delete" data-watched-id="${item.id}">Supprimer</button></div></article>`).join("") : '<p class="empty-state">Aucun visionnage trouvé dans cette page.</p>';

  watchedAdminList.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.action === "delete") return deleteEntry(`/api/watched/${button.dataset.watchedId}`, `Supprimer « ${button.closest(".admin-post").querySelector("h3").textContent} » ?`, () => loadWatchedAdmin(watchedAdminPage));
    const item = watchedAdminCurrentItems.find((entry) => entry.id === Number(button.dataset.watchedId));
    if (!item) return;
    editingWatchedId = item.id;
    watchedFilmData.value = JSON.stringify(item.film);
    watchedFilmSearch.value = item.film?.title || "";
    watchedDate.value = item.date;
    watchedRating.value = item.rating ?? "";
    watchedRewatch.checked = item.rewatch;
    watchedNote.value = item.note || "";
    watchedVenueType.value = item.venue?.type || "cinema";
    watchedVenueName.value = item.venue?.name || "";
    watchedVenueLocation.value = item.venue?.location || "";
    watchedVenueField.classList.toggle("hidden", watchedVenueType.value === "home");
    watchedStatus.textContent = "Modification de ce visionnage.";
    watchedForm.querySelector("button[type='submit']").textContent = "Enregistrer le visionnage";
    window.scrollTo({ top: watchedForm.offsetTop - 20, behavior: "smooth" });
  }));
}

async function deleteEntry(url, message, refresh) {
  if (!window.confirm(message)) return;
  const response = await fetch(url, { method: "DELETE", headers: { "X-Author-Password": authorSecret } });
  if (!response.ok) {
    editorStatus.textContent = "L’entrée n’a pas pu être supprimée.";
    return;
  }
  await refresh();
  editorStatus.textContent = "Entrée supprimée.";
}

async function loadWatchedAdmin(page = 0) {
  watchedAdminPage = page;
  const offset = page * WATCHED_ADMIN_PAGE_SIZE;
  const response = await fetch(`/api/watched?limit=${WATCHED_ADMIN_PAGE_SIZE}&offset=${offset}`);
  const items = await readJson(response);
  watchedAdminCurrentItems = items;
  watchedAdminPageLabel.textContent = `Page ${page + 1}`;
  watchedAdminPrev.disabled = page === 0;
  watchedAdminNext.disabled = items.length < WATCHED_ADMIN_PAGE_SIZE;
  renderWatchedAdmin(items);
}

async function syncLetterboxd() {
  const username = letterboxdUsername.value.trim();
  if (!username) {
    letterboxdStatus.textContent = "Indiquez votre nom d’utilisateur Letterboxd.";
    return;
  }
  letterboxdSyncButton.disabled = true;
  letterboxdStatus.textContent = "Lecture du journal Letterboxd…";
  try {
    const response = await fetch("/api/letterboxd/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Author-Password": authorSecret },
      body: JSON.stringify({ username })
    });
    const payload = await readJson(response);
    if (!response.ok) throw new Error(payload.error || "La synchronisation a échoué.");
    letterboxdStatus.textContent = `${payload.imported} nouveau${payload.imported === 1 ? "" : "x"} film${payload.imported === 1 ? "" : "s"} importé${payload.imported === 1 ? "" : "s"}. ${payload.skipped} déjà présent${payload.skipped === 1 ? "" : "s"}.`;
    loadWatchedAdmin();
  } catch (error) {
    letterboxdStatus.textContent = error.message;
  } finally {
    letterboxdSyncButton.disabled = false;
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = loginPassword.value.trim();
  if (await authenticate(password)) {
    authorSecret = password;
    showEditor();
  } else {
    loginStatus.textContent = "Mot de passe incorrect.";
    loginPassword.value = "";
  }
});

logoutButton.addEventListener("click", () => {
  authorSecret = "";
  editor.classList.add("hidden");
  loginPanel.classList.remove("hidden");
  resetForm();
});

filmSearch.addEventListener("input", () => {
  clearTimeout(filmSearchTimer);
  filmSearchTimer = setTimeout(searchFilms, 300);
});
venueName.addEventListener("input", () => {
  venueLocation.value = "";
  clearTimeout(venueSearchTimer);
  venueSearchTimer = setTimeout(searchVenues, 350);
});
watchedVenueName.addEventListener("input", () => {
  watchedVenueLocation.value = "";
  clearTimeout(venueSearchTimer);
  venueSearchTimer = setTimeout(searchWatchedVenues, 350);
});
cancelEdit.addEventListener("click", resetForm);
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const savedFilm = selectedFilmData || (filmData.value ? JSON.parse(filmData.value) : null);
  const post = { title: document.getElementById("review-title").value.trim(), movieTitle: document.getElementById("movie-title").value.trim(), date: document.getElementById("watch-date").value, rating: Number(document.getElementById("rating").value), context: document.getElementById("context").value.trim(), venue: { type: venueType.value, name: venueType.value === "home" ? "My TV" : venueName.value.trim(), location: venueType.value === "home" ? "" : venueLocation.value.trim() }, tags: document.getElementById("tags").value.split(",").map((tag) => tag.trim()).filter(Boolean), body: document.getElementById("review-body").value.trim(), conclusion: document.getElementById("conclusion").value.trim(), film: savedFilm };
  if (!post.title || !post.movieTitle || !post.date || !post.body || !post.conclusion || !savedFilm?.title) { editorStatus.textContent = "Choisissez un film et complétez la critique."; return; }
  const response = await fetch(editingPostId ? `/api/posts/${editingPostId}` : "/api/posts", { method: editingPostId ? "PUT" : "POST", headers: { "Content-Type": "application/json", "X-Author-Password": authorSecret }, body: JSON.stringify(post) });
  if (!response.ok) { editorStatus.textContent = "La critique n’a pas pu être enregistrée."; return; }
  resetForm();
  editorStatus.textContent = "Critique enregistrée.";
  loadAdminPosts();
});

venueType.addEventListener("change", updateVenueFields);
watchedAdminSearch.addEventListener("input", () => renderWatchedAdmin(watchedAdminCurrentItems));
watchedAdminPrev.addEventListener("click", () => {
  if (watchedAdminPage > 0) loadWatchedAdmin(watchedAdminPage - 1);
});
watchedAdminNext.addEventListener("click", () => {
  if (watchedAdminCurrentItems.length === WATCHED_ADMIN_PAGE_SIZE) loadWatchedAdmin(watchedAdminPage + 1);
});
watchedFilmSearch.addEventListener("input", () => { clearTimeout(watchedFilmTimer); watchedFilmTimer = setTimeout(searchWatchedFilms, 300); });
letterboxdSyncButton.addEventListener("click", syncLetterboxd);
watchedVenueType.addEventListener("change", () => {
  const home = watchedVenueType.value === "home";
  watchedVenueField.classList.toggle("hidden", home);
  if (home) {
    watchedVenueName.value = "My TV";
    watchedVenueLocation.value = "";
    watchedVenueResults.innerHTML = "";
  } else if (watchedVenueName.value === "My TV") {
    watchedVenueName.value = "";
  }
});
watchedForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const film = watchedFilmData.value ? JSON.parse(watchedFilmData.value) : null;
  if (!film?.id || !watchedDate.value) { watchedStatus.textContent = "Choisissez un film et une date."; return; }
  const watchedPayload = { date: watchedDate.value, rating: watchedRating.value ? Number(watchedRating.value) : null, note: watchedNote.value.trim(), rewatch: watchedRewatch.checked, film: { id: film.id, title: film.title, year: (film.release_date || "").slice(0, 4), poster: posterUrl(film.poster_path) }, venue: { type: watchedVenueType.value, name: watchedVenueType.value === "home" ? "My TV" : watchedVenueName.value.trim(), location: watchedVenueType.value === "home" ? "" : watchedVenueLocation.value.trim() } };
  const response = await fetch(editingWatchedId ? `/api/watched/${editingWatchedId}` : "/api/watched", { method: editingWatchedId ? "PUT" : "POST", headers: { "Content-Type": "application/json", "X-Author-Password": authorSecret }, body: JSON.stringify(watchedPayload) });
  if (!response.ok) { watchedStatus.textContent = "Le visionnage n’a pas pu être enregistré."; return; }
  watchedForm.reset(); watchedFilmData.value = ""; editingWatchedId = null; watchedForm.querySelector("button[type='submit']").textContent = "Ajouter aux visionnages"; watchedStatus.textContent = "Visionnage enregistré."; loadWatchedAdmin();
});
renderPresetTags();
updateVenueFields();
