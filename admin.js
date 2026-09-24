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
const watchedAdminList = document.getElementById("watched-admin-list");

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
    throw new Error(`Server returned an empty response (${response.status}).`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Server returned invalid data (${response.status}).`);
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
  if (!response.ok) throw new Error("Critics could not be loaded.");
  return readJson(response);
}

async function authenticate(password) {
  const response = await fetch("/api/auth", { method: "POST", headers: { "X-Author-Password": password } });
  return response.ok;
}

function showEditor() {
  loginPanel.classList.add("hidden");
  editor.classList.remove("hidden");
  editorStatus.textContent = "Editor unlocked.";
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
  document.getElementById("publish-button").textContent = "Publish critic";
  cancelEdit.classList.add("hidden");
  updateVenueFields();
}

async function selectFilm(film) {
  filmSearchStatus.textContent = "Loading film details...";
  try {
    const response = await fetch(`/api/movie?id=${film.id}`);
    const details = await readJson(response);
    if (!response.ok) throw new Error(details.error || "Film details unavailable.");
    selectedFilmData = details;
  } catch (error) {
    filmSearchStatus.textContent = error.message;
    return;
  }
  document.getElementById("movie-title").value = selectedFilmData.title;
  filmData.value = JSON.stringify(selectedFilmData);
  selectedFilm.innerHTML = `${selectedFilmData.poster ? `<img src="${escapeHtml(selectedFilmData.poster)}" alt="" />` : ""}<div><p class="eyebrow">selected film</p><h3>${escapeHtml(selectedFilmData.title)}</h3><p>${escapeHtml(selectedFilmData.year || "")}</p></div>`;
  selectedFilm.classList.remove("hidden");
  filmResults.innerHTML = "";
  filmSearchStatus.textContent = "Film selected with technical details.";
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
  filmSearchStatus.textContent = "Searching...";
  try {
    const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
    const payload = await readJson(response);
    if (!response.ok) throw new Error(payload.error || "Search unavailable.");
    filmResults.innerHTML = payload.results.slice(0, 6).map((film) => `<button type="button" class="film-result" data-film='${escapeHtml(JSON.stringify(film))}'>${film.poster_path ? `<img src="${escapeHtml(posterUrl(film.poster_path))}" alt="" />` : ""}<span><strong>${escapeHtml(film.title)}</strong><small>${escapeHtml((film.release_date || "").slice(0, 4))}</small></span></button>`).join("");
    filmResults.querySelectorAll(".film-result").forEach((button) => button.addEventListener("click", () => selectFilm(JSON.parse(button.dataset.film))));
    filmSearchStatus.textContent = payload.results.length ? "Choose the film you watched." : "No films found.";
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
    if (!response.ok) throw new Error(payload.error || "Search unavailable.");
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
    if (!response.ok) throw new Error(payload.error || "Cinema search unavailable.");
    venueResults.innerHTML = payload.results.map((place) => `<button type="button" class="venue-result" data-place='${escapeHtml(JSON.stringify(place))}'><strong>${escapeHtml(place.name)}</strong><small>${escapeHtml(place.displayName)}</small></button>`).join("");
    venueResults.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => selectVenue(JSON.parse(button.dataset.place))));
  } catch (error) {
    venueResults.innerHTML = `<span class="field-hint">${escapeHtml(error.message)}</span>`;
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
  selectedFilm.innerHTML = `${selectedFilmData.poster ? `<img src="${escapeHtml(selectedFilmData.poster)}" alt="" />` : ""}<div><p class="eyebrow">selected film</p><h3>${escapeHtml(post.movieTitle)}</h3><p>${escapeHtml(selectedFilmData.year || "")}</p></div>`;
  selectedFilm.classList.remove("hidden");
  document.getElementById("publish-button").textContent = "Save changes";
  cancelEdit.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loadAdminPosts() {
  const posts = await loadPosts();
  adminPostList.innerHTML = posts.length ? posts.map((post) => `<article class="admin-post"><div><p class="eyebrow">${escapeHtml(post.date)}</p><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.movieTitle)}</p></div><button type="button" class="secondary-btn" data-id="${post.id}">Edit</button></article>`).join("") : '<p class="empty-state">No critics published yet.</p>';
  adminPostList.querySelectorAll("button").forEach((button) => button.addEventListener("click", async () => editPost((await loadPosts()).find((post) => post.id === Number(button.dataset.id)))));
}

async function loadWatchedAdmin() {
  const response = await fetch("/api/watched");
  const items = await readJson(response);
  watchedAdminList.innerHTML = items.length ? items.map((item) => `<article class="admin-post"><div><p class="eyebrow">${escapeHtml(item.date)}${item.rewatch ? " · rewatch" : ""}</p><h3>${escapeHtml(item.film?.title || "Untitled film")}</h3><p>${item.rating == null ? "No rating" : `★ ${Number(item.rating).toFixed(1)}`} ${item.note ? `· ${escapeHtml(item.note)}` : ""}</p></div><button type="button" class="secondary-btn" data-watched-id="${item.id}">Edit</button></article>`).join("") : '<p class="empty-state">No unwritten screenings yet.</p>';
  watchedAdminList.querySelectorAll("button").forEach((button) => button.addEventListener("click", async () => {
    const item = (await (await fetch("/api/watched")).json()).find((entry) => entry.id === Number(button.dataset.watchedId));
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
    watchedVenueField.classList.toggle("hidden", watchedVenueType.value === "home");
    watchedStatus.textContent = "Editing this watch.";
    watchedForm.querySelector("button[type='submit']").textContent = "Save watch";
    window.scrollTo({ top: watchedForm.offsetTop - 20, behavior: "smooth" });
  }));
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = loginPassword.value.trim();
  if (await authenticate(password)) {
    authorSecret = password;
    showEditor();
  } else {
    loginStatus.textContent = "That password was not accepted.";
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
cancelEdit.addEventListener("click", resetForm);
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const savedFilm = selectedFilmData || (filmData.value ? JSON.parse(filmData.value) : null);
  const post = { title: document.getElementById("review-title").value.trim(), movieTitle: document.getElementById("movie-title").value.trim(), date: document.getElementById("watch-date").value, rating: Number(document.getElementById("rating").value), context: document.getElementById("context").value.trim(), venue: { type: venueType.value, name: venueType.value === "home" ? "My TV" : venueName.value.trim(), location: venueType.value === "home" ? "" : venueLocation.value.trim() }, tags: document.getElementById("tags").value.split(",").map((tag) => tag.trim()).filter(Boolean), body: document.getElementById("review-body").value.trim(), conclusion: document.getElementById("conclusion").value.trim(), film: savedFilm };
  if (!post.title || !post.movieTitle || !post.date || !post.body || !post.conclusion || !savedFilm?.title) { editorStatus.textContent = "Choose a film and complete the critic first."; return; }
  const response = await fetch(editingPostId ? `/api/posts/${editingPostId}` : "/api/posts", { method: editingPostId ? "PUT" : "POST", headers: { "Content-Type": "application/json", "X-Author-Password": authorSecret }, body: JSON.stringify(post) });
  if (!response.ok) { editorStatus.textContent = "The critic could not be saved."; return; }
  resetForm();
  editorStatus.textContent = "Critic saved.";
  loadAdminPosts();
});

venueType.addEventListener("change", updateVenueFields);
watchedFilmSearch.addEventListener("input", () => { clearTimeout(watchedFilmTimer); watchedFilmTimer = setTimeout(searchWatchedFilms, 300); });
watchedVenueType.addEventListener("change", () => watchedVenueField.classList.toggle("hidden", watchedVenueType.value === "home"));
watchedForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const film = watchedFilmData.value ? JSON.parse(watchedFilmData.value) : null;
  if (!film?.id || !watchedDate.value) { watchedStatus.textContent = "Choose a film and date first."; return; }
  const watchedPayload = { date: watchedDate.value, rating: watchedRating.value ? Number(watchedRating.value) : null, note: watchedNote.value.trim(), rewatch: watchedRewatch.checked, film: { id: film.id, title: film.title, year: (film.release_date || "").slice(0, 4), poster: posterUrl(film.poster_path) }, venue: { type: watchedVenueType.value, name: watchedVenueType.value === "home" ? "My TV" : watchedVenueName.value.trim(), location: "" } };
  const response = await fetch(editingWatchedId ? `/api/watched/${editingWatchedId}` : "/api/watched", { method: editingWatchedId ? "PUT" : "POST", headers: { "Content-Type": "application/json", "X-Author-Password": authorSecret }, body: JSON.stringify(watchedPayload) });
  if (!response.ok) { watchedStatus.textContent = "The watch could not be saved."; return; }
  watchedForm.reset(); watchedFilmData.value = ""; editingWatchedId = null; watchedForm.querySelector("button[type='submit']").textContent = "Add to recent watches"; watchedStatus.textContent = "Watch saved."; loadWatchedAdmin();
});
renderPresetTags();
updateVenueFields();
