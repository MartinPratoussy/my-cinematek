const postsList = document.getElementById("posts-list");
const modal = document.getElementById("critic-modal");
const modalContent = document.getElementById("modal-content");

function escapeHtml(value = "") {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}
function money(value) { return value ? `$${Number(value).toLocaleString("en-US")}` : "Not listed"; }
function venueLabel(venue) {
  if (!venue || !venue.name) return "";
  const label = escapeHtml(venue.name);
  return venue.location && /^https?:\/\//i.test(venue.location) ? `<a href="${escapeHtml(venue.location)}" target="_blank" rel="noreferrer">${label}</a>` : label;
}
function sortPosts(posts) { return [...posts].sort((a, b) => new Date(b.date) - new Date(a.date)); }
async function loadPosts() {
  const response = await fetch(`/api/posts?fresh=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Reviews could not be loaded.");
  const text = await response.text();
  if (!text.trim()) throw new Error("The review archive returned an empty response.");
  return JSON.parse(text);
}
function technicalFacts(film) {
  return `<div class="technical-grid"><span>Director<strong>${escapeHtml(film.director || "Not listed")}</strong></span><span>Main cast<strong>${escapeHtml((film.cast || []).join(", ") || "Not listed")}</strong></span><span>Runtime<strong>${film.runtime ? `${film.runtime} min` : "Not listed"}</strong></span><span>Budget<strong>${money(film.budget)}</strong></span><span>Genres<strong>${escapeHtml((film.genres || []).join(", ") || "Not listed")}</strong></span><span>Country<strong>${escapeHtml((film.countries || []).join(", ") || "Not listed")}</strong></span></div>`;
}
function criticMarkup(post) {
  const film = post.film || {};
  return `<section class="film-information"><p class="eyebrow">the film</p><div class="modal-film-heading">${film.poster ? `<img class="critic-poster" src="${escapeHtml(film.poster)}" alt="Poster for ${escapeHtml(post.movieTitle)}" />` : ""}<div><h2 id="modal-title">${escapeHtml(post.movieTitle)}</h2><p>${escapeHtml(film.year || "")}</p></div></div>${technicalFacts(film)}<p class="meta-row">${escapeHtml(post.date)} · ${venueLabel(post.venue) || escapeHtml(post.context || "")}</p></section><section class="critic-text"><p class="eyebrow">the critic</p><div class="post-body">${escapeHtml(post.body || "").replace(/\n/g, "<br><br>")}</div></section><section class="critic-conclusion"><p class="eyebrow">conclusion</p><div class="post-body">${escapeHtml(post.conclusion || "").replace(/\n/g, "<br><br>")}</div><strong class="rating">${Number(post.rating).toFixed(1)}<small>/10</small></strong></section>`;
}
function openModal(post) { modalContent.innerHTML = criticMarkup(post); modal.hidden = false; document.body.classList.add("modal-open"); modal.querySelector(".modal-close").focus(); }
function closeModal() { modal.hidden = true; document.body.classList.remove("modal-open"); }
function renderDiary(posts) {
  if (!posts.length) { postsList.innerHTML = '<p class="empty-state">The diary is empty.</p>'; return; }
  postsList.innerHTML = posts.map((post, index) => `<button class="diary-row ${index === 0 ? "diary-row-latest" : ""}" type="button" data-id="${post.id}"><span class="diary-date">${escapeHtml(post.date)}${index === 0 ? "<small>latest</small>" : ""}</span>${post.film?.poster ? `<img class="diary-poster" src="${escapeHtml(post.film.poster)}" alt="" />` : ""}<span class="diary-copy"><span class="film-kicker">${escapeHtml(post.movieTitle)}</span><strong>${escapeHtml(post.title)}</strong><span class="diary-venue">${venueLabel(post.venue) || escapeHtml(post.context || "")}</span></span><span class="diary-arrow" aria-hidden="true">&rarr;</span></button>`).join("");
  postsList.querySelectorAll(".diary-row").forEach((row) => row.addEventListener("click", () => { const post = posts.find((item) => item.id === Number(row.dataset.id)); if (post) openModal(post); }));
}
document.querySelectorAll("[data-close-modal]").forEach((element) => element.addEventListener("click", closeModal));
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !modal.hidden) closeModal(); });
loadPosts().then((posts) => renderDiary(sortPosts(posts))).catch((error) => { postsList.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`; });
