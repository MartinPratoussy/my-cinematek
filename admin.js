const loginPanel = document.getElementById("login-panel");
const loginForm = document.getElementById("login-form");
const loginPassword = document.getElementById("author-password");
const loginStatus = document.getElementById("login-status");
const editor = document.getElementById("editor");
const editorStatus = document.getElementById("editor-status");
const logoutButton = document.getElementById("logout");
const form = document.getElementById("review-form");
const filmSearch = document.getElementById("film-search");
const filmSearchButton = document.getElementById("film-search-button");
const filmSearchStatus = document.getElementById("film-search-status");
const filmResults = document.getElementById("film-results");
const selectedFilm = document.getElementById("selected-film");
const filmData = document.getElementById("film-data");
const cancelEdit = document.getElementById("cancel-edit");
const adminPostList = document.getElementById("admin-post-list");

let authorSecret = "";
let editingPostId = null;
let selectedFilmData = null;

function escapeHtml(value = "") {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}

function posterUrl(path) {
  return path ? `https://image.tmdb.org/t/p/w342${path}` : "";
}

async function loadPosts() {
  const response = await fetch("/api/posts");
  if (!response.ok) throw new Error("Critics could not be loaded.");
  return response.json();
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
}

function selectFilm(film) {
  selectedFilmData = { id: film.id, title: film.title || "", year: (film.release_date || "").slice(0, 4), overview: film.overview || "", poster: posterUrl(film.poster_path), backdrop: posterUrl(film.backdrop_path) };
  document.getElementById("movie-title").value = selectedFilmData.title;
  filmData.value = JSON.stringify(selectedFilmData);
  selectedFilm.innerHTML = `${selectedFilmData.poster ? `<img src="${escapeHtml(selectedFilmData.poster)}" alt="" />` : ""}<div><p class="eyebrow">selected film</p><h3>${escapeHtml(selectedFilmData.title)}</h3><p>${escapeHtml(selectedFilmData.year || "")}</p></div>`;
  selectedFilm.classList.remove("hidden");
  filmResults.innerHTML = "";
  filmSearchStatus.textContent = "Film selected.";
}

async function searchFilms() {
  const query = filmSearch.value.trim();
  if (!query) return;
  filmSearchStatus.textContent = "Searching...";
  try {
    const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Search unavailable.");
    filmResults.innerHTML = payload.results.slice(0, 6).map((film) => `<button type="button" class="film-result" data-film='${escapeHtml(JSON.stringify(film))}'>${film.poster_path ? `<img src="${escapeHtml(posterUrl(film.poster_path))}" alt="" />` : ""}<span><strong>${escapeHtml(film.title)}</strong><small>${escapeHtml((film.release_date || "").slice(0, 4))}</small></span></button>`).join("");
    filmResults.querySelectorAll(".film-result").forEach((button) => button.addEventListener("click", () => selectFilm(JSON.parse(button.dataset.film))));
    filmSearchStatus.textContent = payload.results.length ? "Choose the film you watched." : "No films found.";
  } catch (error) {
    filmSearchStatus.textContent = error.message;
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
  document.getElementById("review-body").value = post.body;
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

filmSearchButton.addEventListener("click", searchFilms);
filmSearch.addEventListener("keydown", (event) => { if (event.key === "Enter") searchFilms(); });
cancelEdit.addEventListener("click", resetForm);
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const savedFilm = selectedFilmData || (filmData.value ? JSON.parse(filmData.value) : null);
  const post = { title: document.getElementById("review-title").value.trim(), movieTitle: document.getElementById("movie-title").value.trim(), date: document.getElementById("watch-date").value, rating: Number(document.getElementById("rating").value), context: document.getElementById("context").value.trim(), tags: document.getElementById("tags").value.split(",").map((tag) => tag.trim()).filter(Boolean), body: document.getElementById("review-body").value.trim(), film: savedFilm };
  if (!post.title || !post.movieTitle || !post.date || !post.body || !savedFilm?.title) { editorStatus.textContent = "Choose a film and complete the critic first."; return; }
  const response = await fetch(editingPostId ? `/api/posts/${editingPostId}` : "/api/posts", { method: editingPostId ? "PUT" : "POST", headers: { "Content-Type": "application/json", "X-Author-Password": authorSecret }, body: JSON.stringify(post) });
  if (!response.ok) { editorStatus.textContent = "The critic could not be saved."; return; }
  resetForm();
  editorStatus.textContent = "Critic saved.";
  loadAdminPosts();
});
