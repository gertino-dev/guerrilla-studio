// Pas de backoffice : les vidéos sont lues en direct depuis le flux RSS public
// de la chaîne YouTube à chaque chargement de la page.
const CHANNEL_ID = 'UCKHgYX0vGJ_hnzshUNARHXQ'; // @GertinoVideaste
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
// Le flux RSS de YouTube n'envoie pas d'en-têtes CORS : rss2json le lit
// côté serveur et le renvoie en JSON, consultable directement depuis le navigateur.
const FEED_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`;

const grid = document.getElementById('videoGrid');
const gridStatus = document.getElementById('gridStatus');
const heroBg = document.getElementById('heroBg');
const lightbox = document.getElementById('lightbox');
const lightboxPlayer = document.getElementById('lightboxPlayer');

document.getElementById('year').textContent = new Date().getFullYear();

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
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
  lightboxPlayer.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0"
    title="Lecteur vidéo YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen></iframe>`;
  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.hidden = true;
  lightboxPlayer.innerHTML = '';
  document.body.style.overflow = '';
}

document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
document.getElementById('lightboxBackdrop').addEventListener('click', closeLightbox);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
});

async function loadVideos() {
  try {
    const res = await fetch(FEED_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.status !== 'ok' || !Array.isArray(data.items)) throw new Error('Flux invalide');
    if (!data.items.length) throw new Error('Aucune vidéo trouvée');

    const videos = data.items.map((item) => {
      const id = item.guid?.replace('yt:video:', '');
      return {
        id,
        title: item.title ?? 'Sans titre',
        published: item.pubDate ?? new Date().toISOString(),
        thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      };
    }).filter((v) => v.id);

    grid.innerHTML = '';
    videos.forEach((video) => grid.appendChild(videoCard(video)));

    if (videos[0]) {
      heroBg.style.backgroundImage = `url(${videos[0].thumbnail.replace('hqdefault', 'maxresdefault')})`;
      heroBg.style.backgroundSize = 'cover';
      heroBg.style.backgroundPosition = 'center';
      heroBg.style.opacity = '0.35';
    }
  } catch (err) {
    gridStatus.textContent = "Impossible de charger les vidéos pour le moment.";
    const link = document.createElement('a');
    link.href = 'https://www.youtube.com/@GertinoVideaste';
    link.target = '_blank';
    link.rel = 'noopener';
    link.className = 'btn btn-ghost';
    link.style.marginTop = '1rem';
    link.style.display = 'inline-block';
    link.textContent = 'Voir la chaîne sur YouTube';
    gridStatus.after(link);
    console.error('Erreur de chargement du flux YouTube :', err);
  }
}

loadVideos();

// Nav mobile
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});
navLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
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
