const postsList = document.getElementById("posts-list");
const archiveList = document.getElementById("archive-list");
const tagsList = document.getElementById("tags-list");
const featuredPost = document.getElementById("latest");

function escapeHtml(value = "") {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}

function posterUrl(path) {
  return path ? `https://image.tmdb.org/t/p/w342${path}` : "";
}

function money(value) {
  return value ? `$${Number(value).toLocaleString("en-US")}` : "Not listed";
}

function venueLabel(venue) {
  if (!venue || !venue.name) return "";
  const label = escapeHtml(venue.name);
  if (!venue.location || !/^https?:\/\//i.test(venue.location)) return label;
  return `<a href="${escapeHtml(venue.location)}" target="_blank" rel="noreferrer">${label}</a>`;
}

function sortPosts(posts) {
  return [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
}

async function loadPosts() {
  const response = await fetch(`/api/posts?fresh=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Reviews could not be loaded.");
  const text = await response.text();
  if (!text.trim()) throw new Error("The review archive returned an empty response.");
  return JSON.parse(text);
}

function renderFeatured(post) {
  if (!post) {
    featuredPost.innerHTML = '<p class="empty-state">The diary is empty.</p>';
    return;
  }

  featuredPost.innerHTML = `<details class="featured-reader panel"><summary><div class="preview-art">${post.film?.poster ? `<img class="preview-poster" src="${escapeHtml(post.film.poster)}" alt="" />` : "<span class=\"poster-empty\">no poster</span>"}</div><div class="preview-copy"><span class="eyebrow">latest critic</span><span class="film-kicker">${escapeHtml(post.movieTitle)}</span><h2>${escapeHtml(post.title)}</h2><span class="open-label">open critic</span></div></summary>${fullCritic(post)}</details>`;
}

function fullCritic(post) {
  const film = post.film || {};
  const technical = `<div class="technical-grid"><span>Director<strong>${escapeHtml(film.director || "Not listed")}</strong></span><span>Main cast<strong>${escapeHtml((film.cast || []).join(", ") || "Not listed")}</strong></span><span>Runtime<strong>${film.runtime ? `${film.runtime} min` : "Not listed"}</strong></span><span>Budget<strong>${money(film.budget)}</strong></span><span>Genres<strong>${escapeHtml((film.genres || []).join(", ") || "Not listed")}</strong></span><span>Country<strong>${escapeHtml((film.countries || []).join(", ") || "Not listed")}</strong></span></div>`;
  return `<div class="critic-reading"><section class="film-information"><p class="eyebrow">the film</p>${film.poster ? `<img class="critic-poster" src="${escapeHtml(film.poster)}" alt="Poster for ${escapeHtml(post.movieTitle)}" />` : ""}<h3>${escapeHtml(post.movieTitle)}</h3><p>${escapeHtml(film.year || "")}</p>${technical}<p class="meta-row">${escapeHtml(post.date)} · ${venueLabel(post.venue) || escapeHtml(post.context || "")}</p></section><section class="critic-text"><p class="eyebrow">the critic</p><div class="post-body">${escapeHtml(post.body || "").replace(/\n/g, "<br><br>")}</div></section><section class="critic-conclusion"><p class="eyebrow">conclusion</p><div class="post-body">${escapeHtml(post.conclusion || "").replace(/\n/g, "<br><br>")}</div><strong class="rating">${Number(post.rating).toFixed(1)}<small>/10</small></strong></section></div>`;
}

function renderPosts(posts) {
  if (!posts.length) {
    postsList.innerHTML = '<p class="empty-state">The diary is empty.</p>';
    return;
  }

  postsList.innerHTML = posts.map((post) => `
    <details class="post-card" data-id="${post.id}">
      <summary>
        ${post.film?.poster ? `<img class="card-poster" src="${escapeHtml(post.film.poster)}" alt="" />` : ""}<span class="film-kicker">${escapeHtml(post.movieTitle)}</span>
        <h3>${escapeHtml(post.title)}</h3>
        <span class="open-label">open critic</span>
      </summary>
      ${fullCritic(post)}
    </details>
  `).join("");

  postsList.querySelectorAll(".post-card").forEach((card) => {
    card.addEventListener("toggle", () => {
      if (card.open) renderFeatured(posts.find((post) => post.id === Number(card.dataset.id)));
    });
  });
}

function renderArchive(posts) {
  archiveList.innerHTML = posts.map((post) => `<li><button type="button" data-id="${post.id}">${escapeHtml(post.movieTitle)}<small>${escapeHtml(post.date)}</small></button></li>`).join("");
  archiveList.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => renderFeatured(posts.find((post) => post.id === Number(button.dataset.id)))));
}

function renderTags(posts) {
  const tags = [...new Set(posts.flatMap((post) => post.tags || []))].slice(0, 10);
  tagsList.innerHTML = tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
}

loadPosts().then((posts) => {
  const ordered = sortPosts(posts);
  renderPosts(ordered);
  renderArchive(ordered);
  renderTags(ordered);
  renderFeatured(ordered[0]);
}).catch((error) => {
  postsList.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
  renderFeatured(null);
});
