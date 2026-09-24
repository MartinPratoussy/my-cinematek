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

  featuredPost.innerHTML = `
    <div class="featured-copy">
      <div class="meta-row post-meta"><span>latest critic</span><span>${escapeHtml(post.date)}</span><span>${venueLabel(post.venue) || escapeHtml(post.context || "review")}</span></div>
      <p class="film-kicker">${escapeHtml(post.movieTitle)} · ★ ${Number(post.rating).toFixed(1)}</p>
      <h2>${escapeHtml(post.title)}</h2>
      <div class="meta-row post-meta">${(post.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
      <div class="post-body">${escapeHtml(post.body || "").replace(/\n/g, "<br><br>")}</div>
    </div>
    ${post.film?.poster ? `<img class="featured-poster" src="${escapeHtml(posterUrl(post.film.poster))}" alt="Poster for ${escapeHtml(post.movieTitle)}" />` : ""}
  `;
}

function renderPosts(posts) {
  if (!posts.length) {
    postsList.innerHTML = '<p class="empty-state">The diary is empty.</p>';
    return;
  }

  postsList.innerHTML = posts.map((post) => `
    <details class="post-card" data-id="${post.id}">
      <summary>
        <div class="meta-row"><span>${escapeHtml(post.date)}</span><span>${venueLabel(post.venue) || escapeHtml(post.context || "review")}</span></div>
        <h3>${escapeHtml(post.title)}</h3>
        <div class="meta-row"><span>${escapeHtml(post.movieTitle)}</span><span>★ ${Number(post.rating).toFixed(1)}</span></div>
        <p>${escapeHtml((post.body || "").split("\n")[0]).slice(0, 140)}${(post.body || "").length > 140 ? "..." : ""}</p>
      </summary>
      <div class="diary-entry">${escapeHtml(post.body || "").replace(/\n/g, "<br><br>")}</div>
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
