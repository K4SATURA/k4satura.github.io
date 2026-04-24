const domActiveFeedTitle = document.getElementById('activeFeedTitle');
const domArticleCount = document.getElementById('articleCount');
const domNewsGrid = document.getElementById('newsGrid');
const domSidebarFeeds = document.getElementById('sidebarFeeds');
const domFeedCountLabel = document.getElementById('feedCountLabel');
const FEED_COLORS = [
  '#00d2d3', '#ff9ff3', '#feca57', '#ff6b6b', '#48dbfb',
  '#1dd1a1', '#5f27cd', '#ff9f43', '#0abde3', '#ee5253',
  '#2ed573', '#1e90ff', '#ffa502', '#ff4757', '#7bed9f'
];

let feeds = [], articles = [], activeFilter = 'all', loading = false;
let readArticles = new Set();
let savedArticles = new Set();
let savedArticlesMap = new Map();
let showUnreadOnly = false;
let searchQuery = '';
let filteredListCache = [];
let currentRenderedCount = 0;
let isRendering = false;
let refreshInterval = null;
let timeLeft = 300;
function initApp() {
  initTheme();
  const storedRead = localStorage.getItem('rssfeeder_read');
  if (storedRead) readArticles = new Set(JSON.parse(storedRead));

  const storedSavedData = localStorage.getItem('rssfeeder_saved_data');
  if (storedSavedData) {
    const parsed = JSON.parse(storedSavedData);
    parsed.forEach(a => {
      savedArticlesMap.set(a.id, a);
      savedArticles.add(a.id);
    });
  } else {
    const storedSaved = localStorage.getItem('rssfeeder_saved');
    if (storedSaved) savedArticles = new Set(JSON.parse(storedSaved));
  }

  const storedUnread = localStorage.getItem('rssfeeder_unread_only');
  if (storedUnread === 'true') {
    showUnreadOnly = true;
    const toggleInput = document.getElementById('unreadToggle');
    if (toggleInput) toggleInput.checked = true;
    const lbl = document.getElementById('unreadLabel');
    const container = document.getElementById('unreadToggleLabel');
    if (lbl) lbl.textContent = 'OKUNMAMIŞLAR';
    if (container) container.classList.add('active');
  }

  const storedSelectedList = localStorage.getItem('rssfeeder_selected_list');
  if (storedSelectedList) {
    selectedListName = storedSelectedList;
  } else {
    selectedListName = "K4SATURA";
  }

  updateReadCounter();
  loadFeeds();
  populateListSelect(); // Ensure dropdown is updated
  renderSidebar();
  loadAllFeeds();
  startHeaderClock();
}

function startHeaderClock() {
  const update = () => {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    const s = now.getSeconds().toString().padStart(2, '0');
    const clockEl = document.getElementById('headerClock');
    const dateEl = document.getElementById('headerDate');
    if (clockEl) clockEl.textContent = `${h}:${m}:${s}`;
    if (dateEl) dateEl.textContent = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;
  };
  update();
  setInterval(update, 1000);
}

function initTheme() {
  const s = localStorage.getItem('rssfeeder_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', s);
}

function toggleTheme(event) {
  const cur = document.documentElement.getAttribute('data-theme');
  const nxt = cur === 'dark' ? 'light' : 'dark';
  const overlay = document.getElementById('themeTransition');
  const x = event ? event.clientX : window.innerWidth / 2;
  const y = event ? event.clientY : window.innerHeight / 2;
  const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  overlay.style.display = 'block';
  overlay.style.background = nxt === 'dark' ? '#07090c' : '#faf9f6';
  overlay.style.clipPath = `circle(0px at ${x}px ${y}px)`;

  const anim = overlay.animate(
    [
      { clipPath: `circle(0px at ${x}px ${y}px)` },
      { clipPath: `circle(${endRadius}px at ${x}px ${y}px)` }
    ],
    {
      duration: 500,
      easing: 'ease-in-out'
    }
  );

  anim.onfinish = () => {
    document.documentElement.setAttribute('data-theme', nxt);
    localStorage.setItem('rssfeeder_theme', nxt);
    overlay.style.display = 'none';
  };
}

let searchTimeout = null;
function handleSearch(val) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchQuery = val.toLowerCase();
    const clearBtn = document.getElementById('searchClear');
    if (searchQuery) clearBtn.classList.add('visible');
    else clearBtn.classList.remove('visible');
    renderArticles();
  }, 300);
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  handleSearch('');
}

function toggleUnreadFilter(checked) {
  showUnreadOnly = checked;
  localStorage.setItem('rssfeeder_unread_only', checked);
  window.scrollTo(0, 0);
  const lbl = document.getElementById('unreadLabel');
  const container = document.getElementById('unreadToggleLabel');
  if (lbl) lbl.textContent = checked ? 'OKUNMAMIŞLAR' : 'TÜMÜ';
  if (container) {
    if (checked) container.classList.add('active');
    else container.classList.remove('active');
  }
  renderArticles();
}

function toggleSaved(id) {
  if (savedArticles.has(id)) {
    savedArticles.delete(id);
    savedArticlesMap.delete(id);
    showToast('Haber kaydedilenlerden çıkarıldı.', true);
  } else {
    savedArticles.add(id);
    const article = articles.find(a => a.id === id) || savedArticlesMap.get(id);
    if (article) savedArticlesMap.set(id, article);
    showToast('Haber kaydedilenlere eklendi.');
  }
  localStorage.setItem('rssfeeder_saved', JSON.stringify([...savedArticles]));
  localStorage.setItem('rssfeeder_saved_data', JSON.stringify(Array.from(savedArticlesMap.values())));

  if (activeFilter === 'saved' && !savedArticles.has(id)) {
    renderArticles();
  } else {
    const btn = document.getElementById(`save-btn-${id}`);
    if (btn) {
      if (savedArticles.has(id)) btn.classList.add('is-saved');
      else btn.classList.remove('is-saved');
    }
  }
}

function updateReadCounter() {
  const el = document.getElementById('readCountLabel');
  if (el) el.textContent = readArticles.size;
}

function markAsRead(id) {
  readArticles.add(id);
  localStorage.setItem('rssfeeder_read', JSON.stringify([...readArticles]));
  updateReadCounter();
  renderArticles();
}

function initTilt(card) {
  if (window.matchMedia("(hover: none)").matches) return;
  let ticking = false;
  card.addEventListener('mousemove', e => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const percentX = (x - centerX) / centerX;
        const percentY = (y - centerY) / centerY;
        const rotateX = percentY * -5;
        const rotateY = percentX * 5;
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(5px)`;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  card.addEventListener('mouseleave', () => {
    card.style.transform = `perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0)`;
  });
}
function sortFeedsAlphabetically() {
  feeds.sort((a, b) => a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' }));
}

function saveFeeds() {
  sortFeedsAlphabetically();
  try { localStorage.setItem('rssfeeder_feeds', JSON.stringify(feeds)); } catch (e) { }
}

function getCustomLists() {
  const s = localStorage.getItem('rssfeeder_custom_lists');
  return s ? JSON.parse(s) : {};
}

function saveCustomLists(lists) {
  localStorage.setItem('rssfeeder_custom_lists', JSON.stringify(lists));
}

function loadFeeds() {
  try {
    const s = localStorage.getItem('rssfeeder_feeds');
    feeds = s ? JSON.parse(s) : JSON.parse(JSON.stringify(PREDEFINED_LISTS["K4SATURA"]));
    if (!s) {
      feeds.forEach((f, i) => f.id = Date.now() + i);
      saveFeeds();
    }
  }
  catch (e) {
    feeds = JSON.parse(JSON.stringify(PREDEFINED_LISTS["K4SATURA"]));
    feeds.forEach((f, i) => f.id = Date.now() + i);
  }
  sortFeedsAlphabetically();
}
let selectedListName = "";

function populateListSelect() {
  const optionsContainer = document.getElementById('listOptions');
  const triggerText = document.getElementById('listSelectTriggerText');
  if (!optionsContainer || !triggerText) return;

  optionsContainer.innerHTML = '';
  const customLists = getCustomLists();

  const allItems = [];
  Object.keys(customLists).forEach(name => allItems.push({ name, type: 'custom' }));
  Object.keys(PREDEFINED_LISTS).forEach(name => allItems.push({ name, type: 'predefined' }));

  allItems.sort((a, b) => a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' }));

  const createOption = (name, type) => {
    const div = document.createElement('div');
    div.className = `custom-option ${selectedListName === name ? 'selected' : ''}`;
    if (name === 'K4SATURA') div.classList.add('k4satura-option');
    else if (type === 'custom') div.classList.add('user-list-option');

    const span = document.createElement('span');
    span.textContent = name;
    div.appendChild(span);
    div.onclick = () => selectList(name);
    optionsContainer.appendChild(div);
  };

  allItems.forEach(item => createOption(item.name, item.type));

  if (selectedListName) {
    triggerText.textContent = selectedListName;
    const isCustom = !!customLists[selectedListName];

    if (selectedListName === 'K4SATURA') {
      triggerText.className = 'k4satura-brand-text';
    } else if (isCustom) {
      triggerText.className = 'user-list-text';
    } else {
      triggerText.className = 'selected-list-text';
    }
  } else {
    triggerText.textContent = 'Bir liste seçin...';
    triggerText.className = '';
  }
  handleListSelectChange();
}
function selectList(name) {
  selectedListName = name;
  localStorage.setItem('rssfeeder_selected_list', name);
  document.getElementById('listSelectWrapper').classList.remove('open');
  populateListSelect();
  loadSelectedList();
}

document.addEventListener('click', (e) => {
  const wrapper = document.getElementById('listSelectWrapper');
  if (!wrapper) return;
  const isTrigger = e.target.closest('.custom-select-trigger');
  if (isTrigger) {
    wrapper.classList.toggle('open');
  } else if (!e.target.closest('.custom-select-wrapper')) {
    wrapper.classList.remove('open');
  }
});

function handleListSelectChange() {
  const btnDelete = document.getElementById('btnDeleteList');
  const spacer = document.getElementById('listSelectSpacer');
  const customLists = getCustomLists();

  if (btnDelete) {
    if (selectedListName && customLists[selectedListName]) {
      btnDelete.style.display = 'inline-flex';
      if (spacer) spacer.style.display = 'none';
    } else {
      btnDelete.style.display = 'none';
      if (spacer) spacer.style.display = 'block';
    }
  }
}

function loadSelectedList() {
  if (!selectedListName) {
    showToast('Lütfen bir liste seçin.', true);
    return;
  }

  let listToLoad = [];
  if (PREDEFINED_LISTS[selectedListName]) {
    listToLoad = JSON.parse(JSON.stringify(PREDEFINED_LISTS[selectedListName]));
  } else {
    const customLists = getCustomLists();
    if (customLists[selectedListName]) {
      listToLoad = JSON.parse(JSON.stringify(customLists[selectedListName]));
    } else {
      showToast('Liste bulunamadı.', true);
      return;
    }
  }

  feeds = listToLoad;
  feeds.forEach((f, i) => f.id = Date.now() + i);
  saveFeeds();
  if (typeof renderModalFeedList === 'function') renderModalFeedList();
  populateListSelect();
  renderSidebar();
  loadAllFeeds();
  showToast(`"${selectedListName}" listesi yüklendi.`);
}

function saveCurrentAsList() {
  const input = document.getElementById('newListName');
  if (!input) return;
  const listName = input.value.trim();
  if (!listName) {
    showToast('Lütfen liste adını girin.', true);
    return;
  }
  if (PREDEFINED_LISTS[listName]) {
    showToast('Bu isimde hazır bir liste zaten var.', true);
    return;
  }

  const customLists = getCustomLists();
  const currentFeedsToSave = feeds.map(f => ({ name: f.name, url: f.url, active: f.active }));
  customLists[listName] = currentFeedsToSave;
  saveCustomLists(customLists);

  input.value = '';
  selectedListName = listName;
  localStorage.setItem('rssfeeder_selected_list', listName);
  populateListSelect();
  showToast(`Liste "${listName}" olarak kaydedildi.`);
}

function deleteSelectedList() {
  if (!selectedListName) return;

  if (PREDEFINED_LISTS[selectedListName]) {
    showToast('Hazır listeler silinemez.', true);
    return;
  }

  const customLists = getCustomLists();
  if (customLists[selectedListName]) {
    if (confirm(`"${selectedListName}" listesini silmek istediğinize emin misiniz?`)) {
      delete customLists[selectedListName];
      saveCustomLists(customLists);
      selectedListName = "";
      localStorage.removeItem('rssfeeder_selected_list');
      populateListSelect();
      showToast(`Liste silindi.`);
    }
  }
}

function formatStaticDate(str) {
  if (!str) return '—';
  try {
    const d = new Date(str);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch (e) { return '—'; }
}

function stripHtml(h) {
  return h ? String(h).replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim() : '';
}

function getPlainText(h) {
  if (!h) return '';
  let str = String(h).replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
  if (str.includes('&lt;')) {
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    str = txt.value;
  }
  try {
    const doc = new DOMParser().parseFromString(str, 'text/html');
    return doc.body.textContent.trim().replace(/\s+/g, ' ');
  } catch (e) {
    return str.replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
  }
}

function extractImageFromHtml(htmlContent, baseUrl) {
  if (!htmlContent) return null;
  try {
    let str = String(htmlContent).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1');
    if (str.includes('&lt;') || str.includes('&amp;')) {
      const txt = document.createElement('textarea');
      txt.innerHTML = str;
      str = txt.value;
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(str, 'text/html');
    const images = Array.from(doc.querySelectorAll('img'));

    const skipKeywords = ['pixel', 'tracker', 'stats', 'spinner', '1x1', 'blank'];

    const validateUrl = (url) => {
      if (!url) return null;
      url = url.trim();
      if (url.startsWith('data:')) return null;
      if (url.length < 10) return null;
      if (url.startsWith('//')) url = 'https:' + url;
      else if (url.startsWith('/')) {
        if (baseUrl) {
          try { url = new URL(url, baseUrl).href; } catch (e) { return null; }
        } else { return null; }
      }
      if (!url.startsWith('http')) return null;
      const lowerUrl = url.toLowerCase();
      if (skipKeywords.some(k => lowerUrl.includes(k))) return null;
      return url;
    };

    for (let img of images) {
      const w = img.getAttribute('width');
      const h = img.getAttribute('height');
      if ((w === '1' || w === '0') || (h === '1' || h === '0')) continue;
      const style = img.getAttribute('style') || '';
      if (/display\s*:\s*none/i.test(style)) continue;

      const attrs = ['data-src', 'data-lazy-src', 'data-original', 'data-full-src', 'data-srcset', 'srcset', 'src'];
      for (const attr of attrs) {
        let val = img.getAttribute(attr);
        if (!val) continue;
        if (attr === 'srcset' || attr === 'data-srcset') {
          const parts = val.split(',').map(s => s.trim()).filter(Boolean);
          let bestSrc = parts[0].split(/\s+/)[0];
          let maxW = 0;
          for (const p of parts) {
            const pSplit = p.split(/\s+/);
            const srcUrl = pSplit[0];
            const wStr = pSplit[1];
            if (wStr && wStr.endsWith('w')) {
              const weight = parseInt(wStr);
              if (weight > maxW) { maxW = weight; bestSrc = srcUrl; }
            } else if (!maxW) {
              bestSrc = srcUrl;
            }
          }
          val = bestSrc;
        }
        const url = validateUrl(val);
        if (url) return url;
      }
    }

    const videos = doc.querySelectorAll('video[poster]');
    for (const v of videos) {
      const url = validateUrl(v.getAttribute('poster'));
      if (url) return url;
    }

    const sources = doc.querySelectorAll('picture source[srcset], source[srcset]');
    for (const s of sources) {
      let val = s.getAttribute('srcset');
      if (val) {
        const parts = val.split(',').map(ss => ss.trim()).filter(Boolean);
        let bestSrc = parts[0].split(/\s+/)[0];
        let maxW = 0;
        for (const p of parts) {
          const pSplit = p.split(/\s+/);
          const srcUrl = pSplit[0];
          const wStr = pSplit[1];
          if (wStr && wStr.endsWith('w')) {
            const weight = parseInt(wStr);
            if (weight > maxW) { maxW = weight; bestSrc = srcUrl; }
          } else if (!maxW) {
            bestSrc = srcUrl;
          }
        }
        const url = validateUrl(bestSrc);
        if (url) return url;
      }
    }

    const allEls = doc.querySelectorAll('[style*="background"]');
    for (const el of allEls) {
      const bgMatch = (el.getAttribute('style') || '').match(/url\(['"]?(https?:\/\/[^'"\)]+)['"]?\)/i);
      if (bgMatch) {
        const url = validateUrl(bgMatch[1]);
        if (url) return url;
      }
    }

    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = imgRegex.exec(str)) !== null) {
      const url = validateUrl(match[1]);
      if (url) return url;
    }
  } catch (e) { }
  return null;
}
const feedCache = new Map();

function decodeImageUrl(url) {
  if (!url || typeof url !== 'string') return url;
  return url.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function getBestImage(it, baseUrl) {
  const checkUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    url = decodeImageUrl(url).trim();
    if (url.startsWith('//')) url = 'https:' + url;
    else if (url.startsWith('/') && baseUrl) {
      try { url = new URL(url, baseUrl).href; } catch (e) { }
    }
    return url.startsWith('http') ? url : null;
  };
  const isImageUrl = (url) => url && /\.(jpg|jpeg|png|gif|webp|avif|svg|bmp|tiff?)([\?#].*)?$/i.test(url);

  if (checkUrl(it.thumbnail)) return checkUrl(it.thumbnail);
  if (typeof it.image === 'string' && checkUrl(it.image)) return checkUrl(it.image);
  if (it.image && it.image.url && checkUrl(it.image.url)) return checkUrl(it.image.url);
  if (it.image && it.image.href && checkUrl(it.image.href)) return checkUrl(it.image.href);

  const extractMedia = (obj) => {
    if (!obj) return null;
    const arr = Array.isArray(obj) ? obj : [obj];
    for (const item of arr) {
      if (!item) continue;
      let url = checkUrl(item.$?.url || item.$?.href || item.url || item.href);
      if (!url && typeof item === 'string') url = checkUrl(item);
      if (!url && item._) url = checkUrl(item._);
      const type = (item.$?.type || item.$?.medium || item.type || item.medium || '').toLowerCase();
      if (url && (type.startsWith('image/') || type === 'image' || isImageUrl(url))) return url;
    }
    for (const item of arr) {
      if (!item) continue;
      let url = checkUrl(item.$?.url || item.$?.href || item.url || item.href);
      if (!url && typeof item === 'string') url = checkUrl(item);
      if (!url && item._) url = checkUrl(item._);
      const type = (item.$?.type || item.$?.medium || item.type || item.medium || '').toLowerCase();
      if (url && !type.startsWith('video/') && !type.startsWith('audio/') && type !== 'video' && type !== 'audio') return url;
    }
    return null;
  };

  const mThumb = extractMedia(it['media:thumbnail']) || extractMedia(it.mediaThumbnail);
  if (mThumb) return mThumb;

  if (it['media:group']) {
    const mg = it['media:group'];
    const tUrl = extractMedia(mg['media:thumbnail']);
    if (tUrl) return tUrl;
    const cUrl = extractMedia(mg['media:content']) || extractMedia(mg.$ && mg.$.url ? mg : null);
    if (cUrl) return cUrl;
  }
  if (it.mediaGroup) {
    const tUrl = extractMedia(it.mediaGroup.mediaThumbnail);
    if (tUrl) return tUrl;
    const cUrl = extractMedia(it.mediaGroup.mediaContent || it.mediaGroup);
    if (cUrl) return cUrl;
  }

  const mContent = extractMedia(it['media:content']) || extractMedia(it.mediaContent);
  if (mContent) return mContent;

  if (it['itunes:image'] && it['itunes:image']['$']) {
    const u = checkUrl(it['itunes:image']['$'].href);
    if (u) return u;
  }
  if (it.itunes && it.itunes.image) {
    const u = checkUrl(it.itunes.image);
    if (u) return u;
  }
  if (it.itunesImage) {
    const u = checkUrl(it.itunesImage.$ ? it.itunesImage.$.href : it.itunesImage);
    if (u) return u;
  }

  const encs = Array.isArray(it.enclosure) ? it.enclosure : [it.enclosure].filter(Boolean);
  for (const enc of encs) {
    const encUrl = checkUrl(enc.url) || checkUrl(enc.link) || checkUrl(enc.href);
    if (encUrl && /image/i.test(enc.type || '')) return encUrl;
    if (encUrl && isImageUrl(encUrl)) return encUrl;
  }
  for (const enc of encs) {
    const encUrl = checkUrl(enc.url) || checkUrl(enc.link) || checkUrl(enc.href);
    if (encUrl && !/video|audio/i.test(enc.type || '')) return encUrl;
  }

  const links = Array.isArray(it.links) ? it.links : (it.link && typeof it.link === 'object' ? [it.link] : []);
  for (const l of links) {
    const lObj = l.$ || l;
    if (lObj && lObj.rel === 'enclosure' && checkUrl(lObj.href)) {
      if (/image/i.test(lObj.type || '') || isImageUrl(lObj.href)) return checkUrl(lObj.href);
    }
  }

  const htmlParts = [it['content:encoded'], it.content, it.description, it.summary, it['content:encodedSnippet'], it.contentSnippet];
  let combinedHtml = htmlParts.filter(Boolean).join(' ');
  const fromHtml = extractImageFromHtml(combinedHtml, baseUrl || it.link || it.guid);
  if (fromHtml) return fromHtml;
  return null;
}
function generateStableId(str) {
  if (!str) return Math.random().toString(36).substr(2, 9);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return 'id_' + Math.abs(hash).toString(36);
}
async function fetchFeed(feed) {
  const cacheKey = feed.url;
  const cached = feedCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < 5 * 60 * 1000)) {
    return cached.data;
  }

  const endpoints = [
    { url: `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`, type: 'json' },
    { url: `https://api.allorigins.win/get?url=${encodeURIComponent(feed.url)}`, type: 'allorigins' },
    { url: `https://corsproxy.io/?${encodeURIComponent(feed.url)}`, type: 'xml' }
  ];

  for (const ep of endpoints) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(ep.url, { signal: controller.signal });
      if (!res.ok) throw new Error('Not ok');

      let result = null;
      if (ep.type === 'json') {
        const data = await res.json();
        if (data.status === 'ok' && data.items && data.items.length > 0) {
          result = data.items.map(it => {
            let img = getBestImage(it, it.link || it.guid);
            return {
              id: generateStableId(it.link || it.guid || it.title),
              title: stripHtml(it.title) || 'Başlıksız İçerik',
              link: it.link || it.guid || '#',
              image: img,
              textContent: getPlainText(it.content || it['content:encoded'] || it.description || it.summary || ''),
              date: it.pubDate || '',
              source: feed.name
            };
          });
        } else {
          throw new Error('Invalid JSON');
        }
      } else {
        let text = '';
        if (ep.type === 'allorigins') {
          const data = await res.json();
          text = data.contents;
        } else {
          text = await res.text();
        }

        if (!text || text.includes('cloudflare') || text.startsWith('<!DOCTYPE html>')) throw new Error('Invalid XML');
        if (typeof RSSParser !== 'undefined') {
          const parser = new RSSParser({
            customFields: {
              item: [
                ['media:content', 'mediaContent', { keepArray: true }],
                ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
                ['media:group', 'mediaGroup', { keepArray: true }],
                ['itunes:image', 'itunesImage', { keepArray: true }],
                ['enclosure', 'enclosure', { keepArray: true }]
              ]
            }
          });
          const parsedData = await parser.parseString(text);
          if (parsedData && parsedData.items) {
            result = parsedData.items.map(it => {
              let img = getBestImage(it, it.link || it.guid);
              return {
                id: generateStableId(it.link || it.guid || it.title),
                title: stripHtml(it.title) || 'Başlıksız İçerik',
                link: it.link || '#',
                image: img,
                textContent: getPlainText(it.content || it['content:encoded'] || it.contentSnippet || it.description || it.summary || ''),
                date: it.isoDate || it.pubDate || '',
                source: feed.name,
              };
            });
          }
        }
        if (!result) throw new Error('Parse failed');
      }

      clearTimeout(timeoutId);
      feedCache.set(cacheKey, { timestamp: Date.now(), data: result });
      return result;
    } catch (e) {
      clearTimeout(timeoutId);
    }
  }

  if (cached) return cached.data;
  return { error: true, source: feed.name };
}
function startAutoRefresh() {
  clearInterval(refreshInterval);
  timeLeft = 300;
  updateCounterDisplay();
  refreshInterval = setInterval(() => {
    if (loading) return;
    timeLeft--;
    updateCounterDisplay();
    if (timeLeft <= 0) loadAllFeeds();
  }, 1000);
}

function updateCounterDisplay() {
  let m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  let s = (timeLeft % 60).toString().padStart(2, '0');
  const counterEl = document.getElementById('autoRefreshCounter');
  if (counterEl) counterEl.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>${m}:${s}`;
}

function manualRefresh() {
  feedCache.clear();
  loadAllFeeds();
}
async function loadAllFeeds() {
  if (loading) return;
  loading = true;

  const refreshBtn = document.getElementById('refreshBtn');

  if (refreshBtn) { refreshBtn.classList.add('loading'); refreshBtn.disabled = true; }
  if (domNewsGrid) domNewsGrid.classList.add('is-loading');

  showSkeletons();
  articles = [];
  let failedFeeds = [];
  const active = feeds.filter(f => f.active);
  const res = await Promise.allSettled(active.map(f => fetchFeed(f)));
  res.forEach((r, idx) => {
    if (r.status === 'fulfilled') {
      if (r.value.error) {
        failedFeeds.push(r.value.source);
        const feedIndex = feeds.findIndex(f => f.name === r.value.source);
        if (feedIndex > -1 && feeds[feedIndex].active) {
          feeds[feedIndex].active = false;
        }
      } else {
        articles.push(...r.value);
      }
    } else {
      const sourceName = active[idx].name;
      failedFeeds.push(sourceName);
      const feedIndex = feeds.findIndex(f => f.name === sourceName);
      if (feedIndex > -1 && feeds[feedIndex].active) {
        feeds[feedIndex].active = false;
      }
    }
  });
  if (failedFeeds.length > 0) saveFeeds();
  articles.sort((a, b) => new Date(b.date) - new Date(a.date));

  loading = false;
  if (refreshBtn) { refreshBtn.classList.remove('loading'); refreshBtn.disabled = false; }
  if (domNewsGrid) domNewsGrid.classList.remove('is-loading');

  renderArticles();
  renderSidebar();
  startAutoRefresh();
  if (failedFeeds.length > 0) showToast(`Erişilemeyen kaynaklar: ${failedFeeds.join(', ')}`, true);
  else if (articles.length > 0) showToast('Kaynaklar güncellendi.');
}

function showSkeletons() {
  domNewsGrid.innerHTML = Array(9).fill(0).map(() => `
<div class="skeleton">
  <div class="skel-img"></div>
  <div class="skel-body">
    <div class="skel-line" style="width:38%;margin-bottom:13px"></div>
    <div class="skel-line" style="width:95%"></div>
    <div class="skel-line" style="width:55%;margin-top:18px"></div>
  </div>
</div>`).join('');
  domArticleCount.textContent = '';
}

function renderArticles(filter) {
  if (filter !== undefined) {
    activeFilter = filter;
    renderSidebar();
    window.scrollTo(0, 0);
  }

  let list = [];
  if (activeFilter === 'all') list = articles;
  else if (activeFilter === 'saved') list = Array.from(savedArticlesMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
  else list = articles.filter(a => a.source === activeFilter);

  if (showUnreadOnly) {
    list = list.filter(a => !readArticles.has(a.id));
  }

  if (searchQuery) {
    list = list.filter(a =>
      a.title.toLowerCase().includes(searchQuery) ||
      a.textContent.toLowerCase().includes(searchQuery)
    );
  }

  filteredListCache = list;
  currentRenderedCount = 0;

  if (activeFilter === 'all') domActiveFeedTitle.textContent = 'TÜM HABERLER';
  else if (activeFilter === 'saved') domActiveFeedTitle.textContent = 'KAYDEDİLENLER';
  else domActiveFeedTitle.textContent = activeFilter.toLocaleUpperCase('tr-TR');
  domArticleCount.innerHTML = `<svg viewBox="0 0 24 24"><path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" stroke-linecap="round" stroke-linejoin="round"/></svg>${filteredListCache.length} HABER`;

  const refreshBtn = document.getElementById('refreshBtn');
  const refreshCounter = document.getElementById('autoRefreshCounter');
  const unreadToggle = document.getElementById('unreadToggleLabel');
  const readCounter = document.getElementById('readCounter');

  if (activeFilter === 'saved') {
    if (refreshBtn) refreshBtn.style.display = 'none';
    if (refreshCounter) refreshCounter.style.display = 'none';
    if (unreadToggle) unreadToggle.style.display = 'none';
    if (readCounter) readCounter.style.display = 'none';
  } else if (activeFilter === 'all') {
    if (refreshBtn) refreshBtn.style.display = 'flex';
    if (refreshCounter) refreshCounter.style.display = 'flex';
    if (unreadToggle) unreadToggle.style.display = 'inline-flex';
    if (readCounter) readCounter.style.display = 'inline-flex';
  } else {
    if (refreshBtn) refreshBtn.style.display = 'none';
    if (refreshCounter) refreshCounter.style.display = 'none';
    if (unreadToggle) unreadToggle.style.display = 'inline-flex';
    if (readCounter) readCounter.style.display = 'none';
  }

  if (!filteredListCache.length) {
    domNewsGrid.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg><div class="empty-state-text">${searchQuery ? 'ARAMA SONUCU BULUNAMADI' : 'GÖSTERİLECEK İÇERİK BULUNAMADI'}</div></div>`;
    return;
  }

  domNewsGrid.innerHTML = '';
  renderMoreArticles();
}

function renderMoreArticles() {
  if (isRendering || currentRenderedCount >= filteredListCache.length) return;
  isRendering = true;

  const chunk = filteredListCache.slice(currentRenderedCount, currentRenderedCount + 24);
  const colorMap = {};
  feeds.filter(f => f.active).forEach((f, idx) => { colorMap[f.name] = FEED_COLORS[idx % FEED_COLORS.length]; });

  const frag = document.createDocumentFragment();
  chunk.forEach(a => {
    const c = colorMap[a.source] || 'var(--accent)';
    const initials = a.source.split(' ').map(n => n[0]).join('').substring(0, 2).toLocaleUpperCase('tr-TR');
    const imgSrc = esc(a.image || '');
    const isRead = readArticles.has(a.id);

    const imgProxy1 = imgSrc ? esc(`https://wsrv.nl/?url=${encodeURIComponent(a.image)}`) : '';
    const imgProxy2 = imgSrc ? esc(`https://api.allorigins.win/raw?url=${encodeURIComponent(a.image)}`) : '';

    let domain = '';
    try { domain = new URL(a.link).hostname; } catch (e) { }
    const faviconTag = domain ? `<img src="https://www.google.com/s2/favicons?domain=${esc(domain)}&sz=64" style="position: static; width: 48px; height: 48px; object-fit: contain; filter: grayscale(1) opacity(0.5); transform: none;" alt="">` : '';

    const card = document.createElement('div');
    card.className = `news-card ${isRead ? 'read' : ''}`;
    card.style.setProperty('--card-color', c);

    let imgTag = '';
    if (imgSrc) {
      imgTag = `<img src="${imgSrc}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="if(!this.dataset.retry1){this.dataset.retry1='1';this.src='${imgProxy1}';}else if(!this.dataset.retry2){this.dataset.retry2='1';this.src='${imgProxy2}';}else{this.style.display='none';}">`;
    }

    card.innerHTML = `
  <div class="card-img-wrap">
    <div class="img-placeholder" style="background: color-mix(in srgb, ${c} 15%, transparent); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; z-index: 1;">
      ${faviconTag}
      <span style="color: ${c}; font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: bold; letter-spacing: 2px;">${initials}</span>
    </div>
    ${imgTag}
    <div class="card-source">${esc(a.source)}</div>
  </div>
  <div class="card-body">
    <div class="card-title">${esc(a.title)}</div>
    <div class="card-snippet">${esc(a.textContent)}</div>
    <div class="card-footer">
      <div class="card-date">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        ${formatStaticDate(a.date)}
      </div>
      <div class="card-actions">
        <button class="card-btn-copy ${savedArticles.has(a.id) ? 'is-saved' : ''}" id="save-btn-${a.id}" onclick="toggleSaved('${a.id}')" title="Kaydet">
          <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
        <button class="card-btn-copy" onclick="copyArticleLink('${a.id}')" title="Paylaş">
          <svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </button>
        <button class="card-btn-copy" onclick="copyArticleText('${a.id}')" title="Kopyala">
          <svg viewBox="0 0 24 24"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <a href="${esc(a.link)}" target="_blank" rel="noopener" class="card-link" onclick="markAsRead('${a.id}')">
          ${isRead
        ? '<svg viewBox="0 0 24 24" style="margin-right:2px; stroke-width:2.5;"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>OKUNDU'
        : 'OKU<svg viewBox="0 0 24 24"><path d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" stroke-linecap="round" stroke-linejoin="round"/></svg>'}
        </a>
      </div>
    </div>
  </div>
`;

    initTilt(card);
    frag.appendChild(card);
  });
  domNewsGrid.appendChild(frag);
  currentRenderedCount += chunk.length;
  isRendering = false;
}
let scrollTicking = false;
window.addEventListener('scroll', () => {
  if (loading || isRendering) return;
  if (!scrollTicking) {
    window.requestAnimationFrame(() => {
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 800) {
        renderMoreArticles();
      }
      scrollTicking = false;
    });
    scrollTicking = true;
  }
}, { passive: true });
function copyArticleLink(id) {
  const article = articles.find(a => a.id === id);
  if (!article || !article.link) {
    showToast('Bağlantı bulunamadı.', true);
    return;
  }
  navigator.clipboard.writeText(article.link).then(() => {
    showToast('Haber bağlantısı kopyalandı.');
  }).catch(err => {
    showToast('Kopyalama başarısız oldu.', true);
  });
}
function copyArticleText(id) {
  const article = articles.find(a => a.id === id);
  if (!article) return;

  const title = article.title ? article.title.trim() : '';
  const text = article.textContent ? article.textContent.trim() : '';

  let contentToCopy = '';
  if (title && text) {
    contentToCopy = `${title}\n\n${text}`;
  } else if (title) {
    contentToCopy = title;
  } else if (text) {
    contentToCopy = text;
  } else {
    showToast('Kopyalanacak metin bulunamadı.', true);
    return;
  }

  navigator.clipboard.writeText(contentToCopy).then(() => {
    showToast('Haber metni kopyalandı.');
  }).catch(err => {
    showToast('Kopyalama başarısız oldu.', true);
  });
}

function esc(s) { return s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') : ''; }
function renderSidebar() {
  const activeFeedsCount = feeds.filter(f => f.active).length;
  domFeedCountLabel.textContent = `${activeFeedsCount}/${feeds.length}`;

  const btnAll = document.getElementById('btnAllFeeds');
  const btnSaved = document.getElementById('btnSaved');
  if (btnAll) btnAll.classList.toggle('active', activeFilter === 'all');
  if (btnSaved) btnSaved.classList.toggle('active', activeFilter === 'saved');

  const frag = document.createDocumentFragment();

  feeds.forEach((f, idx) => {
    const c = FEED_COLORS[idx % FEED_COLORS.length];
    const isActive = activeFilter === f.name;

    const item = document.createElement('div');
    item.className = `feed-item ${isActive ? 'active' : ''}`;

    if (f.active) {
      item.onclick = () => { renderArticles(f.name); closeMobileSidebar(); };
      item.style.setProperty('--item-color', c);
    } else {
      item.onclick = () => { showToast('Bu kaynak pasif durumdadır.', true); };
      item.style.setProperty('--item-color', 'var(--muted)');
      item.style.opacity = '0.6';
    }

    item.style.setProperty('--active-color', c);

    item.innerHTML = `
      <div class="feed-dot" style="${!f.active ? 'background: var(--muted)' : ''}"></div>
      <div class="feed-name" style="flex:1; ${!f.active ? 'color: var(--muted);' : ''}">${esc(f.name)}</div>
    `;
    frag.appendChild(item);
  });
  domSidebarFeeds.innerHTML = '';
  domSidebarFeeds.appendChild(frag);
}

function renderModalFeedList() {
  const el = document.getElementById('modalFeedList');
  if (!feeds.length) { el.innerHTML = `<div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--muted);padding:1rem 0;text-align:center">Henüz kaynak eklenmedi.</div>`; return; }
  el.innerHTML = feeds.map((f, i) => `
<div class="feed-list-item">
  <input type="checkbox" class="feed-toggle" ${f.active ? 'checked' : ''} onchange="toggleFeed(${i},this.checked)">
  <div class="feed-info" style="min-width: 0;">
    <div class="feed-info-name">${esc(f.name)}</div>
    <div class="feed-info-url">${esc(f.url)}</div>
  </div>
  <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0; flex-wrap: wrap;">
    <button class="feed-action-badge btn-edit" onclick="editFeed(${i})">DÜZENLE</button>
    <button class="feed-action-badge btn-delete" onclick="deleteFeed(${i})">KALDIR</button>
  </div>
</div>`).join('');
}

let editingIndex = -1;

function editFeed(i) {
  editingIndex = i;
  const feed = feeds[i];
  document.getElementById('newFeedName').value = feed.name;
  document.getElementById('newFeedUrl').value = feed.url;
  document.getElementById('btnAddFeed').textContent = 'KAYDET';
  document.getElementById('newFeedName').focus();
}

function addFeed() {
  const n = document.getElementById('newFeedName'), u = document.getElementById('newFeedUrl');
  const name = n.value.trim(), url = u.value.trim();
  if (!name || !url) { showToast('Kaynak adı ve bağlantı adresi gereklidir.', true); return; }
  if (!url.startsWith('http')) { showToast('Geçersiz bağlantı formatı.', true); return; }

  if (editingIndex > -1) {
    feeds[editingIndex].name = name;
    feeds[editingIndex].url = url;
    editingIndex = -1;
    document.getElementById('btnAddFeed').textContent = 'EKLE';
    showToast(`"${name}" güncellendi.`);
  } else {
    feeds.push({ id: Date.now(), name, url, active: true });
    showToast(`"${name}" başarıyla eklendi.`);
  }

  saveFeeds(); renderModalFeedList(); renderSidebar();
  n.value = ''; u.value = '';
  loadAllFeeds();
}

function deleteFeed(i) {
  const name = feeds[i].name; feeds.splice(i, 1);
  if (editingIndex === i) {
    editingIndex = -1;
    document.getElementById('btnAddFeed').textContent = 'EKLE';
    document.getElementById('newFeedName').value = '';
    document.getElementById('newFeedUrl').value = '';
  } else if (editingIndex > i) {
    editingIndex--;
  }
  saveFeeds(); renderModalFeedList(); renderSidebar();
  showToast(`"${name}" kaldırıldı.`, true);
  if (activeFilter === name) renderArticles('all'); else renderArticles();
}

function toggleFeed(i, checked) { feeds[i].active = checked; saveFeeds(); renderSidebar(); loadAllFeeds(); }
function openModal() {
  editingIndex = -1;
  document.getElementById('btnAddFeed').textContent = 'EKLE';
  document.getElementById('newFeedName').value = '';
  document.getElementById('newFeedUrl').value = '';
  renderModalFeedList();
  populateListSelect();
  document.getElementById('modalOverlay').classList.add('open');
}
function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }
function closeModalOutside(e) { if (e.target === document.getElementById('modalOverlay')) closeModal(); }
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter' && document.getElementById('modalOverlay').classList.contains('open')) addFeed();
});

function toggleMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const isOpen = sidebar.classList.contains('open');
  if (isOpen) {
    closeMobileSidebar();
  } else {
    sidebar.classList.add('open');
    overlay.classList.add('open');
  }
}

function closeMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.remove('open');
  overlay.classList.remove('open');
}

let toastTimer;
function showToast(msg, isWarning = false) {
  const el = document.getElementById('toast');
  const msgEl = document.getElementById('toastMsg');
  const bar = document.getElementById('toastProgressBar');
  const iconPath = document.getElementById('toastIconPath');
  const duration = 4500;

  msgEl.textContent = msg;

  if (isWarning) {
    el.style.borderColor = 'var(--red-text)';
    bar.style.background = 'var(--red-text)';
    bar.style.boxShadow = '0 0 8px var(--red-text)';
    if (iconPath) iconPath.setAttribute('d', 'M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z M12 8V12 M12 16H12.01');
  } else {
    el.style.borderColor = 'var(--border2)';
    bar.style.background = 'var(--accent)';
    bar.style.boxShadow = '0 0 8px var(--accent)';
    if (iconPath) iconPath.setAttribute('d', 'M20 6L9 17L4 12');
  }

  el.classList.add('show');

  bar.style.transition = 'none';
  bar.style.transform = 'scaleX(1)';
  setTimeout(() => {
    bar.style.transition = `transform ${duration}ms linear`;
    bar.style.transform = 'scaleX(0)';
  }, 50);

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
  }, duration);
}

initApp();
