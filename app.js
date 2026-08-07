const API_URL = "https://script.google.com/macros/s/AKfycbwFIsSgEF2grkBpliyO_hSD0Lh2ULq6xHoJC6mDLYvjemTLYe67jF38MDNWP2ixITzE/exec";

let pageData = [];
let totalItemsCount = 0;
let totalPagesCount = 1;

let zoomGallery = [];
let currentZoomIndex = 0;

let currentTab = 'home';
let cardsPerRow = 6;
let currentPage = 1;
let activeLocalIndex = 0;
let lastSelectedMenuId = 'menuBtnHome'; 
let lastSelectedBrandElem = null;

const BRAND_COLORS = {
  'carlsberg': '#005826',
  'heineken': '#008234',
  'budweiser': '#1d285a',
  'brahma': '#e31b23',
  'skol': '#fca311',
  'stella artois': '#b81d24',
  'corona': '#002b49',
  'amstel': '#d32f2f',
  'eisenbahn': '#3a2e2b',
  'bohemia': '#8b1e0f',
  'antarctica': '#0055a5',
  'guinness': '#000000',
  'kronenbourg 1664': '#0f2042',
  'therezopolis': '#1b382b',
  'wienbier': '#33261d',
  'faxe': '#3a0000',
  'zlaten dab': '#b38b00'
};

let zoomLevel = 1.0; 
let zoomState = 0;   
let panX = 0;
let panY = 0;
const PAN_STEP = 60;

const vkKeys = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','1','2','3','4','5','6','7','8','9','0','ESPAÇO','DEL','LIMPAR'];

function getTextColorForBackground(hexColor) {
  if (!hexColor) return { text: '#ffffff', pillBg: 'rgba(0, 0, 0, 0.3)' };
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length !== 6) return { text: '#ffffff', pillBg: 'rgba(0, 0, 0, 0.3)' };

  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  return yiq >= 128 ? { text: '#111111', pillBg: 'rgba(0, 0, 0, 0.15)' } : { text: '#ffffff', pillBg: 'rgba(0, 0, 0, 0.3)' };
}

function toTitleCase(str) {
  if (!str) return '';
  return String(str).toLowerCase().replace(/(?:^|\s)\S/g, a => a.toUpperCase());
}

function getOptimizedImageUrl(url, size = 300) {
  if (!url) return '';
  if (url.includes('googleusercontent.com')) return url.split('=')[0] + `=s${size}-rw`;
  return url;
}

function getFlagUrlByCountry(countryName) {
  if (!countryName) return '';
  const name = String(countryName).toLowerCase().trim();
  const countryCodes = {
    'brasil': 'br', 'canadá': 'ca', 'eua': 'us', 'méxico': 'mx', 'argentina': 'ar', 'chile': 'cl',
    'croácia': 'hr', 'alemanha': 'de', 'bélgica': 'be', 'dinamarca': 'dk', 'espanha': 'es', 'frança': 'fr',
    'holanda': 'nl', 'irlanda': 'ie', 'itália': 'it', 'macedônia do norte': 'mk', 'portugal': 'pt',
    'reino unido': 'gb', 'suíça': 'ch', 'suécia': 'se', 'noruega': 'no', 'china': 'cn', 'japão': 'jp',
    'austrália': 'au', 'áfrica do sul': 'za'
  };
  const code = countryCodes[name];
  return code ? `https://flagcdn.com/w40/${code}.png` : '';
}

function hideLoadingScreen() {
  const screen = document.getElementById("loadingScreen");
  if (screen) screen.classList.add("hidden");
}

async function fetchCatalogFromSheet() {
  const searchQuery = encodeURIComponent(document.getElementById("menuSearchInput").value.trim());
  const requestUrl = `${API_URL}?page=${currentPage}&limit=50&category=${currentTab}&search=${searchQuery}&nocache=${new Date().getTime()}`;

  try {
    const response = await fetch(requestUrl);
    const result = await response.json();

    pageData = result.data || [];
    totalItemsCount = result.total || 0;
    totalPagesCount = result.totalPages || 1;

    renderApp();
    hideLoadingScreen();
    
    if (pageData.length > 0) updateHeroPanel(pageData[0], 0);
  } catch (err) {
    console.error("Erro ao carregar catálogo da API:", err);
    hideLoadingScreen();
  }
}

function switchTab(tabName) {
  currentTab = tabName;
  currentPage = 1;
  activeLocalIndex = 0;
  document.getElementById("menuSearchInput").value = "";
  fetchCatalogFromSheet();
}

function renderApp() {
  const row = document.getElementById("cardRow");
  row.innerHTML = "";

  const pageItems = pageData.slice(0, cardsPerRow);

  pageItems.forEach((can, localIndex) => {
    const rawImg = can.ImgFront || can.front || can.ImgCover || can.cover || can.brandLogo;
    const frontImg = getOptimizedImageUrl(rawImg, 400);

    const brandName = toTitleCase(can.brewery || can.Cervejaria || can.name || "Cerveja");
    const countryName = toTitleCase(can.country || can.Pais || "");
    const volumeText = can.volume || can.Volume || "";
    const flagUrl = getFlagUrlByCountry(countryName);

    const brandKey = String(can.brewery || can.Cervejaria || "").toLowerCase().trim();
    const cardColor = BRAND_COLORS[brandKey] || "#008234";
    const colorTheme = getTextColorForBackground(cardColor);

    const card = document.createElement("div");
    card.className = `card ${currentTab === 'sets' ? 'card-aspect-sets' : ''}`;
    card.tabIndex = 0;
    
    card.onmouseenter = card.onfocus = () => {
      document.querySelectorAll(".card").forEach(c => c.classList.remove("focused"));
      card.classList.add("focused");
      activeLocalIndex = localIndex;
      updateHeroPanel(can, localIndex);
    };

    card.onclick = () => openZoomModal(0);

    card.innerHTML = `
      <div class="card-top-photo">
        <img src="${frontImg}" alt="${brandName}" loading="lazy">
      </div>
      <div class="card-bottom-bar" style="background-color: ${cardColor}; color: ${colorTheme.text};">
        <div class="card-bar-title" style="color: ${colorTheme.text};">${brandName}</div>
        <div class="card-bar-details">
          <div class="card-bar-country" style="color: ${colorTheme.text};">
            ${flagUrl ? `<img src="${flagUrl}" class="card-bar-flag" alt="${countryName}">` : ''}
            <span>${countryName}</span>
          </div>
          ${volumeText ? `<div class="card-bar-vol" style="color: ${colorTheme.text}; background: ${colorTheme.pillBg};">${volumeText}</div>` : ''}
        </div>
      </div>
    `;

    row.appendChild(card);
  });
}

function updateHeroPanel(can, index = 0) {
  if (!can) return;

  document.getElementById("heroTitle").innerText = String(can.name || can.Nome || "SELECIONE UMA LATA").toUpperCase();
  document.getElementById("heroCountry").innerText = String(can.country || can.Pais || "-").toUpperCase();
  document.getElementById("heroVolume").innerText = String(can.volume || can.Volume || "-").toUpperCase();
  document.getElementById("heroYear").innerText = can.year || can.Ano || "-";
  document.getElementById("heroBarcode").innerText = can.barcode || can.Barcode || "-";

  const currentGlobalNum = ((currentPage - 1) * 50) + index + 1;
  document.getElementById("cardCounter").innerText = `${currentGlobalNum}/${totalItemsCount}`;

  let rawPhotos = [can.ImgFront, can.ImgLeft, can.ImgBack, can.ImgRight].filter(Boolean);
  zoomGallery = rawPhotos;

  const photosContainer = document.getElementById("heroPhotos");
  photosContainer.innerHTML = "";

  rawPhotos.slice(0, 4).forEach((url, idx) => {
    const photoCard = document.createElement("div");
    photoCard.className = "hero-photo-card";
    photoCard.innerHTML = `<img src="${getOptimizedImageUrl(url, 1000)}" alt="FOTO ${idx+1}">`;
    photoCard.onclick = () => openZoomModal(idx);
    photosContainer.appendChild(photoCard);
  });
}

function openZoomModal(index) {
  if (!zoomGallery.length) return;
  currentZoomIndex = index;
  document.getElementById("zoomImage").src = getOptimizedImageUrl(zoomGallery[currentZoomIndex], 1200);
  document.getElementById("zoomModal").classList.add("active");
}

function closeZoomModal() {
  document.getElementById("zoomModal").classList.remove("active");
}

function openExitModal() { document.getElementById("exitModal").classList.add("active"); }
function closeExitModal() { document.getElementById("exitModal").classList.remove("active"); }
function confirmExit() { window.close(); }

window.onload = fetchCatalogFromSheet;