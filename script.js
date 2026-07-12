// Pas de backoffice : les vidéos sont lues en direct depuis le flux RSS public
// de la chaîne à chaque chargement de la page.
const CHANNEL_ID = 'UCKHgYX0vGJ_hnzshUNARHXQ';
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
// Le flux RSS n'envoie pas d'en-têtes CORS : on passe par un proxy en lecture
// seule pour pouvoir le lire tel quel (toutes les entrées, sans limite artificielle).
const FEED_URL = `https://corsproxy.io/?url=${encodeURIComponent(RSS_URL)}`;

const grid = document.getElementById('videoGrid');
const gridStatus = document.getElementById('gridStatus');
const lightbox = document.getElementById('lightbox');
const lightboxPlayer = document.getElementById('lightboxPlayer');

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

function formatDate(date) {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function videoCard(video) {
  const card = document.createElement('article');
  card.className = 'video-card';
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `Lire la vidéo : ${video.title}`);

  card.innerHTML = `
    <div class="video-thumb-wrap">
      <img src="${video.thumbnail}" alt="" loading="lazy">
      <div class="play-badge"></div>
    </div>
    <div class="video-title">
      ${video.title}
      <span class="video-date">${formatDate(video.published)}</span>
    </div>
  `;

  const open = () => openLightbox(video.id);
  card.addEventListener('click', open);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });

  return card;
}

function openLightbox(videoId) {
  // Domaine "no-cookie" + options qui masquent au maximum l'habillage
  // de la plateforme source (pas de vidéos suggérées, pas d'annotations).
  lightboxPlayer.innerHTML = `<iframe
    src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&color=white"
    title="Lecteur vidéo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen></iframe>`;
  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.hidden = true;
  lightboxPlayer.innerHTML = '';
  document.body.style.overflow = '';
}

document.getElementById('lightboxClose')?.addEventListener('click', closeLightbox);
document.getElementById('lightboxBackdrop')?.addEventListener('click', closeLightbox);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
});

async function loadVideos() {
  try {
    const res = await fetch(FEED_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xmlText = await res.text();
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');

    if (doc.querySelector('parsererror')) throw new Error('Flux invalide');

    const entries = Array.from(doc.querySelectorAll('entry'));
    if (!entries.length) throw new Error('Aucune vidéo trouvée');

    let videos = entries.map((entry) => {
      const id = entry.getElementsByTagNameNS('*', 'videoId')[0]?.textContent;
      const title = entry.querySelector('title')?.textContent ?? 'Sans titre';
      const publishedText = entry.querySelector('published')?.textContent;
      const published = publishedText ? new Date(publishedText) : new Date();
      const thumb = entry.getElementsByTagNameNS('*', 'thumbnail')[0]?.getAttribute('url')
        ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      return { id, title, published, thumbnail: thumb };
    }).filter((v) => v.id);

    const limit = Number(grid.dataset.limit);
    if (limit) videos = videos.slice(0, limit);

    grid.innerHTML = '';
    videos.forEach((video) => grid.appendChild(videoCard(video)));
  } catch (err) {
    gridStatus.textContent = 'Impossible de charger les vidéos pour le moment. Réessayez plus tard.';
    console.error('Erreur de chargement des vidéos :', err);
  }
}

loadVideos();

// Nav mobile
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
navToggle?.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});
navLinks?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
  navLinks.classList.remove('is-open');
  navToggle.setAttribute('aria-expanded', 'false');
}));

// Animations au scroll
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));
