const postsList = document.getElementById("posts-list");
const criticPagination = document.getElementById("critic-pagination");
const previousPosts = document.getElementById("previous-posts");
const nextPosts = document.getElementById("next-posts");
const postsPageLabel = document.getElementById("posts-page-label");
const watchedList = document.getElementById("watched-list");
const modal = document.getElementById("critic-modal");
const modalContent = document.getElementById("modal-content");
const filmModal = document.getElementById("film-modal");
const filmModalContent = document.getElementById("film-modal-content");
const featuredReview = document.getElementById("featured-review");
const titleLanguageButtons = document.querySelectorAll("[data-title-language]");

let watchedItems = [];
let watchedOffset = 0;
let watchedLoading = false;
let hasMoreWatched = true;
let watchedObserver = null;
let criticPage = 1;
let criticHasNextPage = false;
let criticLoading = false;
let titleLanguage = localStorage.getItem("my-cinematek-title-language") || "fr";
let currentFeaturedPost = null;
let currentDiaryPosts = [];
let activeModalPost = null;
const CRITICS_PER_PAGE = 6;

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
function movieTitleFor(item) {
  const film = item?.film || item || {};
  if (titleLanguage === "original") return film.originalTitle || film.original_title || item?.movieTitle || film.title || "Film";
  return film.title || item?.movieTitle || film.originalTitle || "Film";
}
function posterFor(item) {
  const film = item?.film || item || {};
  return titleLanguage === "original" ? film.posterOriginal || film.poster || film.posterFr : film.posterFr || film.poster || film.posterOriginal;
}
function refreshTitleLanguage() {
  titleLanguageButtons.forEach((button) => {
    const active = button.dataset.titleLanguage === titleLanguage;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  if (currentFeaturedPost) renderFeaturedReview(currentFeaturedPost);
  renderDiary(currentDiaryPosts);
  renderWatched(watchedItems);
  if (!modal.hidden && activeModalPost) openModal(activeModalPost, false);
}
function sortPosts(posts) { return [...posts].sort((a, b) => new Date(b.date) - new Date(a.date)); }
async function loadPosts(offset = 0, limit = CRITICS_PER_PAGE) {
  const response = await fetch(`/api/posts?limit=${limit}&offset=${offset}&fresh=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Les critiques n’ont pas pu être chargées.");
  const text = await response.text();
  if (!text.trim()) throw new Error("L’archive des critiques a renvoyé une réponse vide.");
  return JSON.parse(text);
}
async function loadPost(postId) {
  const response = await fetch(`/api/posts/${postId}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Cette critique n’est plus disponible.");
  return response.json();
}
async function loadWatched(offset = 0, limit = 8) {
  const response = await fetch(`/api/watched?limit=${limit}&offset=${offset}&fresh=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Les visionnages récents n’ont pas pu être chargés.");
  const items = await response.json();
  return Promise.all(items.map(async (item) => {
    if (!item.film?.id) return item;
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
  const poster = posterFor(film);
  return `<div class="film-details"><div class="film-details-heading">${poster ? `<img class="film-details-poster" src="${escapeHtml(poster)}" alt="Affiche de ${escapeHtml(movieTitleFor(film))}" />` : ""}<div><p class="eyebrow">détails du film</p><h2 id="film-modal-title">${escapeHtml(movieTitleFor(film))}</h2>${film.tagline ? `<p class="film-tagline">${escapeHtml(film.tagline)}</p>` : ""}</div></div>${technicalFacts(film)}${film.overview ? `<section class="film-overview-block"><p class="eyebrow">synopsis</p><p>${escapeHtml(film.overview)}</p></section>` : ""}${film.homepage ? `<a class="venue-map-button film-homepage" href="${escapeHtml(film.homepage)}" target="_blank" rel="noreferrer">Voir la fiche officielle</a>` : ""}</div>`;
}
async function openFilmModal(film) {
  const details = await loadFilmDetails(film);
  filmModalContent.innerHTML = filmDetailsMarkup(details || {});
  filmModal.hidden = false;
  document.body.classList.add("modal-open");
  filmModal.querySelector(".modal-close").focus();
}
function closeFilmModal() { filmModal.hidden = true; if (modal.hidden) document.body.classList.remove("modal-open"); }

async function loadFilmDetails(film) {
  if (!film?.id) return film;
  try {
    const response = await fetch(`/api/movie?id=${film.id}`);
    if (response.ok) return { ...film, ...(await response.json()) };
  } catch { /* Keep the stored film data as a fallback. */ }
  return film;
}

function viewingContextMarkup(post) {
  const place = venueButton(post.venue) || escapeHtml(post.context || "Chez soi");
  const context = post.context ? `<span class="viewing-context-note"><strong>contexte</strong> ${escapeHtml(post.context)}</span>` : "";
  return `<aside class="viewing-context"><p class="eyebrow">séance</p><div class="viewing-context-line"><span>${escapeHtml(formatDate(post.date))}</span><span>${place}</span>${context}</div></aside>`;
}

function criticShareUrl(post) {
  const url = new URL(window.location.href);
  url.search = `?review=${encodeURIComponent(post.id)}`;
  url.hash = "";
  return url.toString();
}

function drawStoryText(context, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((lineText, index) => context.fillText(lineText, x, y + index * lineHeight));
}

function loadStoryPoster(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = `/api/poster?url=${encodeURIComponent(url)}`;
  });
}

async function createStoryImage(post) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const context = canvas.getContext("2d");
  context.fillStyle = "#120d10";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#35171e";
  context.fillRect(48, 48, canvas.width - 96, canvas.height - 96);
  context.strokeStyle = "rgba(213, 141, 85, .65)";
  context.lineWidth = 2;
  context.strokeRect(72, 72, canvas.width - 144, canvas.height - 144);

  const poster = await loadStoryPoster(posterFor(post));
  if (poster) {
    const posterWidth = 700;
    const posterHeight = 920;
    const scale = Math.min(posterWidth / poster.width, posterHeight / poster.height);
    const width = poster.width * scale;
    const height = poster.height * scale;
    context.drawImage(poster, (canvas.width - width) / 2, 150 + (posterHeight - height) / 2, width, height);
  }

  context.fillStyle = "#d58d55";
  context.font = "600 28px Arial, sans-serif";
  context.letterSpacing = "8px";
  context.fillText("MY-CINEMATEK", 120, 1220);
  context.letterSpacing = "0px";
  context.fillStyle = "#f4e9db";
  context.font = "500 68px Georgia, serif";
  drawStoryText(context, movieTitleFor(post), 120, 1330, 840, 78, 2);
  context.fillStyle = "#d7b5a9";
  context.font = "48px Georgia, serif";
  drawStoryText(context, post.title, 120, 1510, 840, 46, 3);
  context.fillStyle = "#f0ad72";
  context.font = "600 54px Georgia, serif";
  context.fillText(`${Number(post.rating).toFixed(1)} / 10`, 120, 1715);
  context.fillStyle = "#c3a59d";
  context.font = "24px Arial, sans-serif";
  context.fillText("Lire la critique sur my-cinematek", 120, 1800);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Story image unavailable.")), "image/png"));
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  document.execCommand("copy");
  field.remove();
}

async function shareCritic(post, button, status) {
  button.disabled = true;
  status.textContent = "Préparation de la story…";
  const url = criticShareUrl(post);
  try {
    const blob = await createStoryImage(post);
    await copyText(url);
    const file = new File([blob], "my-cinematek-story.png", { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: post.movieTitle, text: `Une critique sur my-cinematek : ${url}`, files: [file] });
      status.textContent = "Story prête. Le lien de la critique est copié.";
    } else {
      const download = document.createElement("a");
      download.href = URL.createObjectURL(blob);
      download.download = "my-cinematek-story.png";
      download.click();
      URL.revokeObjectURL(download.href);
      status.textContent = "Image téléchargée. Le lien de la critique est copié.";
    }
  } catch (error) {
    if (error.name !== "AbortError") status.textContent = "Le partage n’a pas pu être préparé.";
  } finally {
    button.disabled = false;
  }
}

function criticMarkup(post) {
  const film = post.film || {};
  const poster = posterFor(film);
  return `<section class="film-information"><p class="eyebrow">le film</p><div class="modal-film-heading">${poster ? `<button class="poster-button" type="button" aria-label="Voir les détails du film"><img class="critic-poster" src="${escapeHtml(poster)}" alt="Affiche de ${escapeHtml(movieTitleFor(post))}" /></button>` : ""}<div><h2 id="modal-title">${escapeHtml(movieTitleFor(post))}</h2><p>${escapeHtml(film.year || "")}</p></div></div>${technicalFacts(film)}</section>${viewingContextMarkup(post)}<section class="critic-text"><p class="eyebrow">la critique</p><div class="post-body">${escapeHtml(post.body || "").replace(/\n/g, "<br><br>")}</div></section><section class="critic-conclusion"><p class="eyebrow">conclusion</p><div class="post-body">${escapeHtml(post.conclusion || "").replace(/\n/g, "<br><br>")}</div><strong class="rating">${Number(post.rating).toFixed(1)}<small>/10</small></strong></section><div class="critic-share"><button class="share-button" type="button"><span aria-hidden="true">↗</span>Partager en story</button><span class="share-status" role="status" aria-live="polite"></span></div>`;
}
function bindCriticModal(post) {
  modalContent.querySelector(".poster-button")?.addEventListener("click", () => openFilmModal(post.film || { title: post.movieTitle }));
  const shareButton = modalContent.querySelector(".share-button");
  shareButton?.addEventListener("click", () => shareCritic(post, shareButton, modalContent.querySelector(".share-status")));
}
function openModal(post, focus = true) {
  activeModalPost = post;
  modal.dataset.postId = String(post.id);
  modalContent.innerHTML = criticMarkup(post);
  modal.hidden = false;
  document.body.classList.add("modal-open");
  if (focus) modal.querySelector(".modal-close").focus();
  bindCriticModal(post);
  if (post.film?.id && !post.film.director) {
    loadFilmDetails(post.film).then((film) => {
      if (film !== post.film && modal.dataset.postId === String(post.id) && !modal.hidden) {
        const enrichedPost = { ...post, film };
        activeModalPost = enrichedPost;
        modalContent.innerHTML = criticMarkup(enrichedPost);
        bindCriticModal(enrichedPost);
      }
    });
  }
}
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
      <p class="featured-review-title">${escapeHtml(movieTitleFor(post))}</p>
      <p class="featured-review-teaser">${escapeHtml(teaser)}</p>
      <div class="featured-review-meta"><span>${escapeHtml(formatDate(post.date))}</span></div>
    </div>
    <div class="featured-review-cover">${posterFor(post) ? `<img src="${escapeHtml(posterFor(post))}" alt="Affiche de ${escapeHtml(movieTitleFor(post))}" />` : ""}</div>
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
  currentDiaryPosts = posts;
  if (!posts.length) {
    if (!append) postsList.innerHTML = '<p class="empty-state">Le journal est vide.</p>';
    return;
  }
  const markup = posts.map((post) => `<button class="diary-row" type="button" data-id="${post.id}"><span class="diary-date">${escapeHtml(formatDate(post.date))}</span>${posterFor(post) ? `<img class="diary-poster" src="${escapeHtml(posterFor(post))}" alt="" />` : ""}<span class="diary-copy"><span class="film-kicker">${escapeHtml(movieTitleFor(post))}</span><strong>${escapeHtml(post.title)}</strong><span class="diary-venue">${venueButton(post.venue) || escapeHtml(post.context || "")}</span></span><span class="diary-arrow" aria-hidden="true">&rarr;</span></button>`).join("");
  if (append) postsList.insertAdjacentHTML("beforeend", markup); else postsList.innerHTML = markup;
  postsList.querySelectorAll(".diary-row").forEach((row) => row.addEventListener("click", () => { const post = posts.find((item) => item.id === Number(row.dataset.id)); if (post) openModal(post); }));
}
function renderWatched(items, append = false) {
  const mergedItems = append ? [...watchedItems, ...items] : items;
  watchedItems = mergedItems;
  const sentinel = hasMoreWatched ? '<div class="watched-sentinel" aria-hidden="true"></div>' : "";
  watchedList.innerHTML = (mergedItems.length ? mergedItems.map((item, index) => `<article class="recent-watch-row"><div class="recent-watch-copy"><strong>${escapeHtml(movieTitleFor(item))}${item.rewatch ? ' <em>revu</em>' : ""}</strong><div class="recent-watch-meta"><span class="recent-watch-date">${escapeHtml(formatDate(item.date))}</span><span class="recent-watch-venue">${venueButton(item.venue) || "visionnage"}</span>${item.rating !== null && item.rating !== undefined ? `<span class="recent-watch-rating">★ ${Number(item.rating).toFixed(1)}</span>` : ""}</div>${item.note ? `<p class="recent-watch-note"><small>note rapide</small>${escapeHtml(item.note)}</p>` : ""}</div>${posterFor(item) ? `<button class="poster-button recent-watch-poster-button" type="button" data-watched-index="${index}" aria-label="Voir les détails du film"><img class="recent-watch-poster" src="${escapeHtml(posterFor(item))}" alt="" /></button>` : ""}</article>`).join("") : '<p class="empty-state">Aucun visionnage sans critique.</p>') + sentinel;
  watchedList.querySelectorAll(".recent-watch-poster-button").forEach((button) => button.addEventListener("click", () => openFilmModal(mergedItems[Number(button.dataset.watchedIndex)].film)));
  if (watchedObserver) watchedObserver.disconnect();
  const watchedSentinel = watchedList.querySelector(".watched-sentinel");
  if (watchedSentinel && typeof IntersectionObserver !== "undefined") {
    watchedObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMoreWatched();
    }, { root: watchedList, threshold: .2 });
    watchedObserver.observe(watchedSentinel);
  }
}

async function loadMoreWatched() {
  if (watchedLoading || !hasMoreWatched) return;
  watchedLoading = true;
  try {
    const items = await loadWatched(watchedOffset, 8);
    if (!items.length) {
      hasMoreWatched = false;
      renderWatched([], true);
      return;
    }
    watchedOffset += items.length;
    renderWatched(items, true);
    hasMoreWatched = items.length === 8;
  } finally {
    watchedLoading = false;
  }
}
titleLanguageButtons.forEach((button) => button.addEventListener("click", () => {
  titleLanguage = button.dataset.titleLanguage;
  localStorage.setItem("my-cinematek-title-language", titleLanguage);
  refreshTitleLanguage();
}));
refreshTitleLanguage();
document.querySelectorAll("[data-close-modal]").forEach((element) => element.addEventListener("click", closeModal));
document.querySelectorAll("[data-close-film-modal]").forEach((element) => element.addEventListener("click", closeFilmModal));
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !modal.hidden) closeModal(); });
async function loadCriticPage(page) {
  if (criticLoading || page < 1) return;
  criticLoading = true;
  const firstPage = page === 1;
  const offset = firstPage ? 0 : 1 + ((page - 1) * CRITICS_PER_PAGE);
  const responseLimit = firstPage ? CRITICS_PER_PAGE + 2 : CRITICS_PER_PAGE + 1;
  try {
    const rawPosts = await loadPosts(offset, responseLimit);
    const posts = await Promise.all(rawPosts.map(async (post) => post.film?.id ? { ...post, film: await loadFilmDetails(post.film) } : post));
    if (firstPage) {
      const featuredPost = posts[0];
      currentFeaturedPost = featuredPost || null;
      if (featuredPost) renderFeaturedReview(featuredPost);
      renderDiary(posts.slice(1, CRITICS_PER_PAGE + 1));
    } else {
      renderDiary(posts.slice(0, CRITICS_PER_PAGE));
    }
    criticPage = page;
    criticHasNextPage = posts.length > CRITICS_PER_PAGE;
    postsPageLabel.textContent = `Page ${criticPage}`;
    previousPosts.disabled = criticPage === 1;
    nextPosts.disabled = !criticHasNextPage;
    criticPagination.hidden = criticPage === 1 && !criticHasNextPage;
    return posts;
  } finally {
    criticLoading = false;
  }
}

loadCriticPage(1).then((posts) => {
  if (!posts) return loadWatched(0, 8);
  const sharedReviewId = Number(new URLSearchParams(window.location.search).get("review"));
  const sharedReview = posts.find((post) => post.id === sharedReviewId);
  if (sharedReview) openModal(sharedReview);
  else if (sharedReviewId > 0) loadPost(sharedReviewId).then(openModal).catch(() => {});
  return loadWatched(0, 8);
}).then((items) => {
  watchedOffset = items.length;
  hasMoreWatched = items.length === 8;
  renderWatched(items);
}).catch((error) => { postsList.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`; });
previousPosts.addEventListener("click", () => loadCriticPage(criticPage - 1));
nextPosts.addEventListener("click", () => loadCriticPage(criticPage + 1));
