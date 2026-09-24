const postsList = document.getElementById("posts-list");
const archiveList = document.getElementById("archive-list");
const tagsList = document.getElementById("tags-list");
const featuredPost = document.getElementById("latest");
const form = document.getElementById("review-form");
const authorGate = document.getElementById("author-gate");
const authorAccess = document.getElementById("author-access");
const authorLogin = document.getElementById("author-login");
const authorPassword = document.getElementById("author-password");
const editorStatus = document.getElementById("editor-status");
const cancelEdit = document.getElementById("cancel-edit");
const composer = document.querySelector(".composer");
const filmSearch = document.getElementById("film-search");
const filmSearchButton = document.getElementById("film-search-button");
const filmSearchStatus = document.getElementById("film-search-status");
const filmResults = document.getElementById("film-results");
const selectedFilm = document.getElementById("selected-film");
const filmData = document.getElementById("film-data");

let isAuthorMode = false;
let editingPostId = null;
let selectedFilmData = null;
let authorSecret = "";

function setEditorState(enabled) {
  isAuthorMode = enabled;
  composer.classList.toggle("editor-enabled", enabled);
  composer.classList.toggle("hidden", !enabled);
  authorGate.classList.toggle("hidden", enabled);
  if (enabled) {
    authorPassword.value = "";
  }
  editorStatus.textContent = enabled
    ? "Editor unlocked. You can publish or edit reviews here."
    : "Reader view: the site is a public vitrine only.";

  if (!enabled) {
    authorSecret = "";
    editingPostId = null;
    cancelEdit.classList.add("hidden");
    form.reset();
    document.getElementById("rating").value = 8;
    document.getElementById("review-form").querySelector("button[type='submit']").textContent = "Publish review";
  }
}

async function unlockAuthorMode() {
  const password = authorPassword.value.trim();
  if (!password) return;

  const response = await fetch("/api/auth", {
    method: "POST",
    headers: { "X-Author-Password": password }
  });
  if (response.ok) {
    authorSecret = password;
    setEditorState(true);
    return;
  }

  authorSecret = "";
  editorStatus.textContent = "Access denied. This is a private author-only space.";
  authorPassword.value = "";
}

async function loadPosts() {
  const response = await fetch("/api/posts");
  if (!response.ok) throw new Error("Reviews could not be loaded.");
  return response.json();
}

function posterUrl(path) {
  return path ? `https://image.tmdb.org/t/p/w342${path}` : "";
}

function selectFilm(film) {
  selectedFilmData = {
    id: film.id,
    title: film.title || film.name || "",
    year: (film.release_date || "").slice(0, 4),
    overview: film.overview || "",
    poster: posterUrl(film.poster_path),
    backdrop: posterUrl(film.backdrop_path)
  };

  document.getElementById("movie-title").value = selectedFilmData.title;
  filmData.value = JSON.stringify(selectedFilmData);
  selectedFilm.innerHTML = `
    ${selectedFilmData.poster ? `<img src="${escapeHtml(selectedFilmData.poster)}" alt="" />` : ""}
    <div>
      <p class="eyebrow">selected film</p>
      <h3>${escapeHtml(selectedFilmData.title)}</h3>
      <p>${escapeHtml(selectedFilmData.year || "Release year unavailable")}</p>
    </div>
  `;
  selectedFilm.classList.remove("hidden");
  filmResults.innerHTML = "";
  filmSearchStatus.textContent = "Film selected. Add your critic below.";
}

async function searchFilms() {
  const query = filmSearch.value.trim();
  if (!query) return;

  filmSearchStatus.textContent = "Searching the film catalogue...";
  filmResults.innerHTML = "";

  try {
    const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Search is unavailable.");

    if (!payload.results?.length) {
      filmSearchStatus.textContent = "No films found. Try another title.";
      return;
    }

    filmSearchStatus.textContent = "Choose the film you watched.";
    filmResults.innerHTML = payload.results.slice(0, 6).map((film) => `
      <button type="button" class="film-result" data-film='${escapeHtml(JSON.stringify(film))}'>
        ${film.poster_path ? `<img src="${escapeHtml(posterUrl(film.poster_path))}" alt="" />` : `<span class="poster-placeholder">No poster</span>`}
        <span><strong>${escapeHtml(film.title || "Untitled")}</strong><small>${escapeHtml((film.release_date || "").slice(0, 4) || "Year unknown")}</small></span>
      </button>
    `).join("");

    filmResults.querySelectorAll(".film-result").forEach((button) => {
      button.addEventListener("click", () => selectFilm(JSON.parse(button.dataset.film)));
    });
  } catch (error) {
    filmSearchStatus.textContent = error.message;
  }
}

function escapeHtml(value = "") {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sortPosts(posts) {
  return [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderPosts(posts) {
  if (!posts.length) {
    postsList.innerHTML = '<p class="empty-state">No reviews yet. Start by publishing your first one.</p>';
    return;
  }

  postsList.innerHTML = posts
    .map(
      (post) => `
        <details class="post-card" data-id="${post.id}">
          <summary>
            <div class="meta-row"><span>${escapeHtml(post.date)}</span><span>${escapeHtml(post.context || "review")}</span></div>
            <h3>${escapeHtml(post.title)}</h3>
            <div class="meta-row"><span>${escapeHtml(post.movieTitle)}</span><span>★ ${Number(post.rating).toFixed(1)}</span></div>
            <p>${escapeHtml((post.body || "").split("\n")[0]).slice(0, 140)}${(post.body || "").length > 140 ? "..." : ""}</p>
          </summary>
          <div class="diary-entry">${escapeHtml(post.body || "").replace(/\n/g, "<br><br>")}</div>
        </details>
      `
    )
    .join("");

  postsList.querySelectorAll(".post-card").forEach((card) => {
    const id = Number(card.dataset.id);
    card.addEventListener("toggle", () => {
      if (card.open) selectPost(id);
    });
    card.addEventListener("dblclick", () => {
      if (!isAuthorMode) return;
      editPost(id);
    });
  });
}

function renderArchive(posts) {
  archiveList.innerHTML = posts
    .map(
      (post) => `
        <li>
          <button type="button" data-id="${post.id}">
            ${escapeHtml(post.movieTitle)}
            <small>${escapeHtml(post.date)}</small>
          </button>
        </li>
      `
    )
    .join("");

  archiveList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => selectPost(Number(button.dataset.id)));
    button.addEventListener("dblclick", () => {
      if (!isAuthorMode) return;
      editPost(Number(button.dataset.id));
    });
  });
}

async function editPost(postId) {
  const posts = await loadPosts();
  const post = posts.find((item) => item.id === postId);
  if (!post) return;

  editingPostId = postId;
  document.getElementById("movie-title").value = post.movieTitle || "";
  selectedFilmData = post.film || { title: post.movieTitle || "" };
  filmData.value = JSON.stringify(selectedFilmData);
  selectedFilm.innerHTML = `
    ${selectedFilmData.poster ? `<img src="${escapeHtml(selectedFilmData.poster)}" alt="" />` : ""}
    <div><p class="eyebrow">selected film</p><h3>${escapeHtml(selectedFilmData.title)}</h3><p>${escapeHtml(selectedFilmData.year || "")}</p></div>
  `;
  selectedFilm.classList.remove("hidden");
  document.getElementById("review-title").value = post.title || "";
  document.getElementById("watch-date").value = post.date || "";
  document.getElementById("rating").value = post.rating ?? 8;
  document.getElementById("tags").value = (post.tags || []).join(", ");
  document.getElementById("context").value = post.context || "";
  document.getElementById("review-body").value = post.body || "";

  form.querySelector("button[type='submit']").textContent = "Save changes";
  cancelEdit.classList.remove("hidden");
  window.scrollTo({ top: document.getElementById("write").offsetTop - 20, behavior: "smooth" });
  editorStatus.textContent = "Editing an existing review.";
}

function cancelCurrentEdit() {
  editingPostId = null;
  cancelEdit.classList.add("hidden");
  form.reset();
  selectedFilmData = null;
  filmData.value = "";
  selectedFilm.innerHTML = "";
  selectedFilm.classList.add("hidden");
  document.getElementById("rating").value = 8;
  form.querySelector("button[type='submit']").textContent = "Publish review";
  editorStatus.textContent = "Editor unlocked. You can publish or edit reviews here.";
}

function renderTags(posts) {
  const tagMap = new Map();

  posts.forEach((post) => {
    (post.tags || []).forEach((tag) => {
      const key = tag.toLowerCase();
      tagMap.set(key, (tagMap.get(key) || 0) + 1);
    });
  });

  const tags = [...tagMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  tagsList.innerHTML = tags.length
    ? tags.map(([tag]) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")
    : '<span class="empty-state">No tags yet.</span>';
}

async function selectPost(id) {
  const posts = sortPosts(await loadPosts());
  const selected = posts.find((post) => post.id === id) || posts[0];
  renderFeatured(selected);
}

function renderFeatured(post) {
  if (!post) {
    featuredPost.innerHTML = '<p class="empty-state">No review selected.</p>';
    return;
  }

  featuredPost.innerHTML = `
    <div class="featured-copy">
      <div class="meta-row post-meta"><span>latest critic</span><span>${escapeHtml(post.date)}</span><span>${escapeHtml(post.context || "review")}</span></div>
      <p class="film-kicker">${escapeHtml(post.movieTitle)} · ★ ${Number(post.rating).toFixed(1)}</p>
      <h2>${escapeHtml(post.title)}</h2>
      <div class="meta-row post-meta">${post.tags && post.tags.length ? post.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("") : ""}</div>
      <div class="post-body">${escapeHtml(post.body || "").replace(/\n/g, "<br><br>")}</div>
    </div>
    ${post.film && post.film.poster ? `<img class="featured-poster" src="${escapeHtml(post.film.poster)}" alt="Poster for ${escapeHtml(post.movieTitle)}" />` : ""}
  `;
}

async function handleSubmit(event) {
  event.preventDefault();

  if (!isAuthorMode) {
    unlockAuthorMode();
    return;
  }

  const title = document.getElementById("review-title").value.trim();
  const movieTitle = document.getElementById("movie-title").value.trim();
  const date = document.getElementById("watch-date").value;
  const rating = Number(document.getElementById("rating").value);
  const context = document.getElementById("context").value.trim();
  const rawTags = document.getElementById("tags").value.trim();
  const body = document.getElementById("review-body").value.trim();
  const savedFilm = selectedFilmData || (filmData.value ? JSON.parse(filmData.value) : null);

  if (!title || !movieTitle || !date || !body || !savedFilm?.title) {
    filmSearchStatus.textContent = "Choose a film before publishing your critic.";
    return;
  }

  const parsedTags = rawTags ? rawTags.split(",").map((tag) => tag.trim()).filter(Boolean) : [];

  const nextPost = {
    id: editingPostId ?? Date.now(),
    title,
    movieTitle,
    date,
    rating: Number.isFinite(rating) ? rating : 0,
    context: context || "personal watch",
    tags: parsedTags,
    body,
    film: savedFilm
  };

  const request = {
    method: editingPostId ? "PUT" : "POST",
    headers: { "Content-Type": "application/json", "X-Author-Password": authorSecret },
    body: JSON.stringify(nextPost)
  };
  const response = await fetch(editingPostId ? `/api/posts/${editingPostId}` : "/api/posts", request);
  if (!response.ok) {
    editorStatus.textContent = "The review could not be saved.";
    return;
  }
  const savedPost = await response.json();
  await renderAll();
  form.reset();
  selectedFilmData = null;
  filmData.value = "";
  selectedFilm.innerHTML = "";
  selectedFilm.classList.add("hidden");
  document.getElementById("rating").value = 8;
  form.querySelector("button[type='submit']").textContent = "Publish review";
  cancelEdit.classList.add("hidden");

  const targetId = savedPost.id;
  await selectPost(targetId);
  editingPostId = null;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function renderAll() {
  const orderedPosts = sortPosts(await loadPosts());
  renderPosts(orderedPosts);
  renderArchive(orderedPosts);
  renderTags(orderedPosts);
  renderFeatured(orderedPosts[0]);
}

authorAccess.addEventListener("click", () => {
  authorGate.classList.remove("hidden");
  authorPassword.focus();
});
authorLogin.addEventListener("click", unlockAuthorMode);
filmSearchButton.addEventListener("click", searchFilms);
filmSearch.addEventListener("keydown", (event) => {
  if (event.key === "Enter") searchFilms();
});
authorPassword.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    unlockAuthorMode();
  }
});
cancelEdit.addEventListener("click", cancelCurrentEdit);
form.addEventListener("submit", handleSubmit);
setEditorState(false);
renderAll().catch(() => {
  postsList.innerHTML = '<p class="empty-state">The review archive is currently unavailable.</p>';
});
