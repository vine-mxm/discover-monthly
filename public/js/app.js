// Hypercube animation

// ===================================
// ETHICAL MUSIC MODAL
// ===================================

const MODAL_STORAGE_KEY = 'ethicalMusicModalLastSeen';
const MODAL_RESHOW_DAYS = 2;

function initEthicalModal() {
  const modal = document.getElementById('ethicalModal');
  const okBtn = document.getElementById('modalOk');
  
  // Close modal on OK button
  okBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    localStorage.setItem(MODAL_STORAGE_KEY, Date.now().toString());
  });
  
  // Close modal on overlay click (without saving to localStorage)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
}

function shouldShowModal() {
  const lastSeen = localStorage.getItem(MODAL_STORAGE_KEY);
  
  // If never seen, show modal
  if (!lastSeen) {
    return true;
  }
  
  // Check if more than MODAL_RESHOW_DAYS have passed
  const lastSeenDate = parseInt(lastSeen, 10);
  const daysSince = (Date.now() - lastSeenDate) / (1000 * 60 * 60 * 24);
  
  return daysSince > MODAL_RESHOW_DAYS;
}

function showEthicalModal() {
  const modal = document.getElementById('ethicalModal');
  modal.classList.add('active');
}

function handleStreamingLinkClick(e, platform) {
  // Track streaming link click with Plausible
  if (window.plausible) {
    const trackElement = e.currentTarget.closest('.track');
    const trackTitle = trackElement?.querySelector('.track-title')?.textContent || 'Unknown';
    const trackArtist = trackElement?.querySelector('.track-artist')?.textContent || 'Unknown';
    
    window.plausible('Streaming Link Click', {
      props: {
        platform: platform,
        artist: trackArtist,
        track: trackTitle
      }
    });
  }
  
  // Don't show modal for Bandcamp clicks
  if (platform === 'bandcamp') {
    return;
  }
  
  // Check if modal should be shown
  if (shouldShowModal()) {
    e.preventDefault();
    showEthicalModal();
    
    // Store the original href to allow user to continue if they want
    const originalHref = e.currentTarget.href;
    const modal = document.getElementById('ethicalModal');
    const okBtn = document.getElementById('modalOk');
    
    // Override OK button to open the link after dismissal
    const originalHandler = okBtn.onclick;
    okBtn.onclick = () => {
      modal.classList.remove('active');
      localStorage.setItem(MODAL_STORAGE_KEY, Date.now().toString());
      window.open(originalHref, '_blank');
      okBtn.onclick = originalHandler; // Restore original handler
    };
  }
}

// ===================================
// HYPERCUBE ANIMATION
// ===================================

function animateHypercube() {
  const container = document.getElementById('hypercube');
  if (!container) return;
  
  let angle = 0;
  let width, height, size, centerX, centerY;
  
  function updateDimensions() {
    const rect = container.getBoundingClientRect();
    // Calculate canvas size based on container dimensions
    // Using computed font size to calculate character dimensions
    const computedStyle = window.getComputedStyle(container);
    const fontSize = parseFloat(computedStyle.fontSize);
    const charWidth = fontSize * 0.6; // Monospace character width
    const lineHeight = fontSize * 1.2; // Line height from CSS
    
    width = Math.floor(rect.width / charWidth);
    height = Math.floor(rect.height / lineHeight);
    centerX = Math.floor(width / 2);
    centerY = Math.floor(height / 2);
    // Size scales with available space, reduced to leave margin for rotation
    size = Math.min(width, height * 2) / 8; // Changed from /6 to /8 for more margin
  }
  
  updateDimensions();
  window.addEventListener('resize', updateDimensions);
  
  function drawHypercube() {
    // Skip drawing if container is hidden or dimensions are invalid
    if (!container || container.offsetParent === null || width <= 0 || height <= 0) {
      return;
    }
    
    // Rotate angle
    angle += 0.02;
    
    // 4D hypercube vertices (tesseract)
    const vertices4D = [
      [-1,-1,-1,-1], [1,-1,-1,-1], [-1,1,-1,-1], [1,1,-1,-1],
      [-1,-1,1,-1], [1,-1,1,-1], [-1,1,1,-1], [1,1,1,-1],
      [-1,-1,-1,1], [1,-1,-1,1], [-1,1,-1,1], [1,1,-1,1],
      [-1,-1,1,1], [1,-1,1,1], [-1,1,1,1], [1,1,1,1]
    ];
    
    // Project 4D to 3D to 2D
    const vertices2D = vertices4D.map(v => {
      // Rotate in 4D space
      const x = v[0] * Math.cos(angle) - v[3] * Math.sin(angle);
      const y = v[1];
      const z = v[2] * Math.cos(angle * 0.7) - v[1] * Math.sin(angle * 0.7);
      const w = v[0] * Math.sin(angle) + v[3] * Math.cos(angle);
      
      // Project 4D to 3D
      const distance4D = 3;
      const scale3D = distance4D / (distance4D + w);
      const x3D = x * scale3D;
      const y3D = y * scale3D;
      const z3D = z * scale3D;
      
      // Project 3D to 2D
      const distance3D = 5;
      const scale2D = distance3D / (distance3D + z3D);
      const x2D = x3D * scale2D * size + centerX;
      const y2D = y3D * scale2D * size * 0.5 + centerY;
      
      return [Math.round(x2D), Math.round(y2D)];
    });
    
    // Create canvas - validate dimensions first
    if (width <= 0 || height <= 0 || !isFinite(width) || !isFinite(height)) {
      return;
    }
    const canvas = Array(height).fill().map(() => Array(width).fill(' '));
    
    // Draw edges
    const edges = [
      // Inner cube
      [0,1],[1,3],[3,2],[2,0], [4,5],[5,7],[7,6],[6,4], [0,4],[1,5],[2,6],[3,7],
      // Outer cube
      [8,9],[9,11],[11,10],[10,8], [12,13],[13,15],[15,14],[14,12], [8,12],[9,13],[10,14],[11,15],
      // Connecting edges
      [0,8],[1,9],[2,10],[3,11], [4,12],[5,13],[6,14],[7,15]
    ];
    
    edges.forEach(([i, j]) => {
      const [x1, y1] = vertices2D[i];
      const [x2, y2] = vertices2D[j];
      drawLine(canvas, x1, y1, x2, y2);
    });
    
    // Draw vertices
    vertices2D.forEach(([x, y]) => {
      if (y >= 0 && y < height && x >= 0 && x < width) {
        canvas[y][x] = '●';
      }
    });
    
    // Render
    container.textContent = canvas.map(row => row.join('')).join('\n');
  }
  
  function drawLine(canvas, x1, y1, x2, y2) {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    
    let x = x1, y = y1;
    const char = '·';
    
    while (true) {
      if (y >= 0 && y < canvas.length && x >= 0 && x < canvas[0].length) {
        if (canvas[y][x] === ' ') canvas[y][x] = char;
      }
      
      if (x === x2 && y === y2) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
  }
  
  // Animate
  setInterval(drawHypercube, 50);
}

// Header wave animation
function animateHeaderHypercube() {
  const container = document.getElementById('headerHypercube');
  if (!container) return;
  
  let offset = 0;
  const width = 8;
  const height = 7;
  
  function drawWave() {
    offset += 0.15;
    
    const canvas = Array(height).fill().map(() => Array(width).fill(' '));
    
    // Draw sine wave
    for (let x = 0; x < width; x++) {
      // Calculate sine wave with scrolling offset
      const angle = (x / width) * Math.PI * 2 + offset;
      const sine = Math.sin(angle);
      
      // Map sine (-1 to 1) to canvas height
      const y = Math.round((sine + 1) * (height - 1) / 2);
      
      // Draw dot at position
      if (y >= 0 && y < height) {
        canvas[y][x] = '·';
      }
    }
    
    container.textContent = canvas.map(row => row.join('')).join('\n');
  }
  
  setInterval(drawWave, 50);
}

// Display playlist content
function displayPlaylistContent(playlist) {
  const content = document.getElementById('content');
  
  // Show header hypercube
  const headerHypercube = document.getElementById('headerHypercube');
  if (headerHypercube && !headerHypercube.classList.contains('active')) {
    headerHypercube.classList.add('active');
    animateHeaderHypercube();
  }
  
  let html = `
    <div class="content-header">
      <div class="content-title">${playlist.name}</div>
      <div class="content-meta">${playlist.tracks.length} TRACKS</div>
    </div>
    <div class="track-list">
  `;
  
  playlist.tracks.forEach((track, index) => {
    const links = [];
    if (track.links?.appleMusic) links.push(`<a href="${track.links.appleMusic}" class="stream-link" data-platform="applemusic" target="_blank">AM</a>`);
    if (track.links?.spotify) links.push(`<a href="${track.links.spotify}" class="stream-link" data-platform="spotify" target="_blank">SP</a>`);
    if (track.links?.youtube) links.push(`<a href="${track.links.youtube}" class="stream-link" data-platform="youtube" target="_blank">YT</a>`);
    if (track.links?.bandcamp) links.push(`<a href="${track.links.bandcamp}" class="stream-link" data-platform="bandcamp" target="_blank">BC</a>`);
    
    html += `
      <div class="track">
        <div class="track-num">${String(index + 1).padStart(2, '0')}</div>
        <div class="track-artwork">
          ${track.artwork ? `<img src="${track.artwork}" alt="">` : 'NO IMG'}
        </div>
        <div class="track-info">
          <div class="track-title">${escapeHtml(track.title)}</div>
          <div class="track-artist">${escapeHtml(track.artist)}</div>
        </div>
        <div class="track-links">
          ${links.length > 0 ? links.join(' <span class="sep">/</span> ') : '<span style="color: var(--dim)">--</span>'}
        </div>
      </div>
    `;
  });
  
  html += `</div>`;
  content.innerHTML = html;
  
  // Add click handlers to streaming links
  document.querySelectorAll('.stream-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const platform = e.currentTarget.dataset.platform;
      handleStreamingLinkClick(e, platform);
    });
  });
}

// Load and display playlists
async function loadPlaylists() {
  try {
    const response = await fetch('../data/playlists.json');
    const data = await response.json();
    
    displayStats(data);
    populatePlaylistMenu(data.playlists);
    populateMobilePlaylistMenu(data.playlists);
    
  } catch (error) {
    console.error('Error loading playlists:', error);
    document.getElementById('playlistMenu').innerHTML = `
      <div class="error-box">
        ERROR: FAILED TO LOAD<br>
        RUN: npm run fetch
      </div>
    `;
  }
}

function displayStats(data) {
  document.getElementById('totalPlaylists').textContent = data.totalPlaylists || '--';
  document.getElementById('totalTracks').textContent = data.totalTracks || '--';
  
  if (data.generated) {
    const date = new Date(data.generated);
    document.getElementById('lastUpdate').textContent = 
      date.toISOString().split('T')[0].replace(/-/g, '.');
  }
}

function populatePlaylistMenu(playlists) {
  const menu = document.getElementById('playlistMenu');
  
  // Group playlists by year
  const groupedByYear = playlists.reduce((acc, playlist) => {
    const year = playlist.year;
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(playlist);
    return acc;
  }, {});
  
  // Sort years descending
  const years = Object.keys(groupedByYear).sort((a, b) => b - a);
  
  menu.innerHTML = years.map(year => {
    const yearPlaylists = groupedByYear[year];
    const totalTracks = yearPlaylists.reduce((sum, p) => sum + p.tracks.length, 0);
    
    return `
      <div class="year-group">
        <div class="year-header" data-year="${year}">
          <span><span class="year-toggle">▶</span>${year}</span>
          <span class="count">${totalTracks}</span>
        </div>
        <div class="year-playlists" data-year="${year}">
          ${yearPlaylists.map(playlist => `
            <div class="playlist-item" data-playlist='${JSON.stringify(playlist).replace(/'/g, "&apos;")}'>
              <span>${escapeHtml(playlist.name)}</span>
              <span class="count">${playlist.tracks.length}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
  
  // Setup year toggle handlers for desktop sidebar
  menu.querySelectorAll('.year-header').forEach(header => {
    header.addEventListener('click', function() {
      const year = this.dataset.year;
      const playlistsContainer = menu.querySelector(`.year-playlists[data-year="${year}"]`);
      const toggle = this.querySelector('.year-toggle');
      
      if (playlistsContainer && playlistsContainer.classList.contains('expanded')) {
        playlistsContainer.classList.remove('expanded');
        toggle.textContent = '▶';
      } else if (playlistsContainer) {
        playlistsContainer.classList.add('expanded');
        toggle.textContent = '▼';
      }
    });
  });
  
  // Setup playlist click handlers
  menu.querySelectorAll('.playlist-item').forEach(item => {
    item.addEventListener('click', function() {
      menu.querySelectorAll('.playlist-item').forEach(i => i.classList.remove('active'));
      this.classList.add('active');
      const playlist = JSON.parse(this.dataset.playlist);
      
      // Track playlist view with Plausible
      if (window.plausible) {
        window.plausible('Playlist View', {
          props: {
            playlist: playlist.name,
            tracks: playlist.tracks.length,
            year: playlist.year
          }
        });
      }
      
      displayPlaylistContent(playlist);
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Mobile menu toggle
function setupMobileMenu() {
  const toggle = document.getElementById('mobilePlsToggle');
  const content = document.getElementById('mobilePlsContent');
  
  if (!toggle || !content) return;
  
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    content.classList.toggle('expanded');
  });
}

// Populate mobile playlist menu (duplicate for mobile)
function populateMobilePlaylistMenu(playlists) {
  const menu = document.getElementById('mobilePlaylistMenu');
  if (!menu) return;
  
  // Group playlists by year
  const groupedByYear = playlists.reduce((acc, playlist) => {
    const year = playlist.year;
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(playlist);
    return acc;
  }, {});
  
  // Sort years descending
  const years = Object.keys(groupedByYear).sort((a, b) => b - a);
  
  menu.innerHTML = years.map(year => {
    const yearPlaylists = groupedByYear[year];
    const totalTracks = yearPlaylists.reduce((sum, p) => sum + p.tracks.length, 0);
    
    return `
      <div class="year-group">
        <div class="year-header" data-year="${year}">
          <span><span class="year-toggle">▶</span>${year}</span>
          <span class="count">${totalTracks}</span>
        </div>
        <div class="year-playlists" data-year="${year}">
          ${yearPlaylists.map(playlist => `
            <div class="playlist-item" data-playlist='${JSON.stringify(playlist).replace(/'/g, "&apos;")}'>
              <span>${escapeHtml(playlist.name)}</span>
              <span class="count">${playlist.tracks.length}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
  
  // Setup year toggle handlers for mobile menu
  menu.querySelectorAll('.year-header').forEach(header => {
    header.addEventListener('click', function() {
      const year = this.dataset.year;
      const playlistsContainer = menu.querySelector(`.year-playlists[data-year="${year}"]`);
      const toggle = this.querySelector('.year-toggle');
      
      if (playlistsContainer.classList.contains('expanded')) {
        playlistsContainer.classList.remove('expanded');
        toggle.textContent = '▶';
      } else {
        playlistsContainer.classList.add('expanded');
        toggle.textContent = '▼';
      }
    });
  });
  
  // Setup playlist click handlers for mobile
  menu.querySelectorAll('.playlist-item').forEach(item => {
    item.addEventListener('click', function() {
      menu.querySelectorAll('.playlist-item').forEach(i => i.classList.remove('active'));
      this.classList.add('active');
      const playlist = JSON.parse(this.dataset.playlist);
      
      // Track playlist view with Plausible
      if (window.plausible) {
        window.plausible('Playlist View', {
          props: {
            playlist: playlist.name,
            tracks: playlist.tracks.length,
            year: playlist.year
          }
        });
      }
      
      displayPlaylistContent(playlist);
      
      // Close mobile menu after selection
      const toggle = document.getElementById('mobilePlsToggle');
      const content = document.getElementById('mobilePlsContent');
      if (toggle && content && window.innerWidth <= 768) {
        toggle.classList.remove('active');
        content.classList.remove('expanded');
      }
    });
  });
}

// Load on page ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    animateHypercube();
    loadPlaylists();
    setupMobileMenu();
    initEthicalModal();
  });
} else {
  animateHypercube();
  loadPlaylists();
  setupMobileMenu();
  initEthicalModal();
}
