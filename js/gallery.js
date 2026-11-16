(function () {
    'use strict';

    const AUTOPLAY_MS = 5000;
    const BOARD_STORAGE_KEY = 'jj-gallery-board-v1';

    const state = {
        album: null,
        columns: [],
        photos: [],
        board: {},
        view: 'grid',
        query: '',
        category: 'all',
        visible: [],
        lightboxIndex: -1,
        autoplay: false,
        autoplayTimer: null,
        touchStartX: 0
    };

    const els = {};

    function domReady(callback) {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(callback, 1);
        } else {
            document.addEventListener('DOMContentLoaded', callback);
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return String(dateString);
        return d.toLocaleDateString('de-DE');
    }

    function fileExtension(src) {
        const clean = String(src || '').split('?')[0].split('#')[0];
        const parts = clean.split('.');
        return parts.length > 1 ? '.' + parts.pop().toLowerCase() : '';
    }

    function collectEls() {
        els.grid = document.getElementById('gallery-grid');
        els.board = document.getElementById('kanban-board');
        els.empty = document.getElementById('gallery-empty');
        els.search = document.getElementById('gallery-search');
        els.category = document.getElementById('category-filter');
        els.viewGrid = document.getElementById('view-grid');
        els.viewKanban = document.getElementById('view-kanban');
        els.startSlideshow = document.getElementById('start-slideshow');
        els.resetBoard = document.getElementById('reset-board');
        els.lightbox = document.getElementById('lightbox');
        els.stage = document.getElementById('lightbox-stage');
        els.media = document.getElementById('lightbox-media');
        els.lbTitle = document.getElementById('lightbox-title');
        els.lbDesc = document.getElementById('lightbox-desc');
        els.counter = document.getElementById('lightbox-counter');
        els.progressBar = document.getElementById('lightbox-progress-bar');
        els.lbClose = document.getElementById('lightbox-close');
        els.lbPrev = document.getElementById('lightbox-prev');
        els.lbNext = document.getElementById('lightbox-next');
        els.playBtn = document.getElementById('lightbox-play');
        els.fullscreenBtn = document.getElementById('lightbox-fullscreen');
        els.shareBtn = document.getElementById('lightbox-share');
        els.download = document.getElementById('lightbox-download');
        els.thumbs = document.getElementById('lightbox-thumbs');
    }

    function loadData() {
        return fetch('data/photos.json').then((response) => {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        });
    }

    function columnExists(id) {
        return state.columns.some((c) => c.id === id);
    }

    function initBoard() {
        let saved = null;
        try {
            saved = JSON.parse(localStorage.getItem(BOARD_STORAGE_KEY) || 'null');
        } catch (e) {
            saved = null;
        }
        state.board = {};
        state.photos.forEach((p) => {
            if (saved && columnExists(saved[p.id])) {
                state.board[p.id] = saved[p.id];
            } else {
                state.board[p.id] = columnExists(p.column) ? p.column : state.columns[0].id;
            }
        });
    }

    function persistBoard() {
        try {
            localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(state.board));
        } catch (e) {
            // localStorage nicht verfuegbar (z.B. privater Modus)
        }
    }

    function columnOf(photo) {
        return state.board[photo.id] || photo.column || state.columns[0].id;
    }

    function columnTitle(id) {
        const col = state.columns.find((c) => c.id === id);
        return col ? col.title : id;
    }

    function applyFilters() {
        const q = state.query.trim().toLowerCase();
        state.visible = state.photos.filter((p) => {
            const matchCategory = state.category === 'all' || p.category === state.category;
            const haystack = (p.title + ' ' + (p.description || '') + ' ' + (p.category || '')).toLowerCase();
            return matchCategory && (!q || haystack.includes(q));
        });
    }

    function photoIndexInVisible(id) {
        return state.visible.findIndex((p) => p.id === id);
    }

    function renderAlbumMeta() {
        if (!state.album) return;
        if (state.album.title) {
            document.getElementById('album-title').textContent = '„' + state.album.title + '“';
        }
        if (state.album.period) {
            document.getElementById('album-period').textContent = '(' + state.album.period.replace('-', '–') + ')';
        }
        if (state.album.url) {
            document.getElementById('album-link').href = state.album.url;
        }
    }

    function renderCategoryFilter() {
        const cats = [...new Set(state.photos.map((p) => p.category).filter(Boolean))].sort();
        cats.forEach((c) => {
            const option = document.createElement('option');
            option.value = c;
            option.textContent = c;
            els.category.appendChild(option);
        });
    }

    function videoBadge() {
        return '<span class="gallery-card-badge"><i class="fas fa-play"></i> Video</span>';
    }

    function renderGrid() {
        if (!state.visible.length) {
            els.grid.innerHTML = '';
            els.empty.classList.remove('hidden');
            return;
        }
        els.empty.classList.add('hidden');
        els.grid.innerHTML = state.visible.map((p, i) => `
            <article class="gallery-card" data-id="${escapeHtml(p.id)}" tabindex="0" role="button"
                     aria-label="${escapeHtml(p.title || 'Medium ' + (i + 1))} in der Diashow öffnen">
                <div class="gallery-card-media">
                    <img src="${escapeHtml(p.thumb || p.src)}" alt="${escapeHtml(p.title || '')}" loading="lazy">
                    ${p.type === 'video' ? videoBadge() : ''}
                </div>
                <div class="gallery-card-body">
                    <h3>${escapeHtml(p.title || 'Ohne Titel')}</h3>
                    <p class="gallery-card-meta">
                        <span class="tag">${escapeHtml(p.category || 'Allgemein')}</span>
                        <span class="tag tag-column">${escapeHtml(columnTitle(columnOf(p)))}</span>
                        <span class="gallery-card-date">${escapeHtml(formatDate(p.date))}</span>
                    </p>
                </div>
            </article>`).join('');
        els.grid.querySelectorAll('.gallery-card').forEach((card) => {
            const open = () => {
                const idx = photoIndexInVisible(card.dataset.id);
                if (idx >= 0) openLightbox(idx);
            };
            card.addEventListener('click', open);
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    open();
                }
            });
        });
    }

    function buildKanbanCard(p, colIdx) {
        const card = document.createElement('article');
        card.className = 'kanban-card';
        card.draggable = true;
        card.dataset.id = p.id;
        const isFirst = colIdx === 0;
        const isLast = colIdx === state.columns.length - 1;
        card.innerHTML = `
            <div class="kanban-card-media">
                <img src="${escapeHtml(p.thumb || p.src)}" alt="${escapeHtml(p.title || '')}" loading="lazy">
                ${p.type === 'video' ? videoBadge() : ''}
            </div>
            <div class="kanban-card-body">
                <h4>${escapeHtml(p.title || 'Ohne Titel')}</h4>
                <p class="kanban-card-meta">
                    <span class="tag">${escapeHtml(p.category || 'Allgemein')}</span>
                    <span>${escapeHtml(formatDate(p.date))}</span>
                </p>
                <div class="kanban-card-actions">
                    <button type="button" class="card-move" data-dir="-1" aria-label="In vorherige Spalte verschieben"${isFirst ? ' disabled' : ''}>
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <button type="button" class="card-play" aria-label="In der Diashow anzeigen">
                        <i class="fas fa-play"></i>
                    </button>
                    <button type="button" class="card-move" data-dir="1" aria-label="In nächste Spalte verschieben"${isLast ? ' disabled' : ''}>
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>`;
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', p.id);
            e.dataTransfer.effectAllowed = 'move';
            card.classList.add('dragging');
        });
        card.addEventListener('dragend', () => card.classList.remove('dragging'));
        card.querySelector('.card-play').addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = photoIndexInVisible(p.id);
            if (idx >= 0) openLightbox(idx);
        });
        card.querySelectorAll('.card-move').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dir = parseInt(btn.dataset.dir, 10);
                const target = state.columns[colIdx + dir];
                if (target) movePhoto(p.id, target.id);
            });
        });
        return card;
    }

    function renderKanban() {
        els.board.innerHTML = '';
        if (!state.visible.length) {
            els.empty.classList.remove('hidden');
            return;
        }
        els.empty.classList.add('hidden');
        state.columns.forEach((col, colIdx) => {
            const columnEl = document.createElement('div');
            columnEl.className = 'kanban-column';
            columnEl.dataset.column = col.id;
            const inColumn = state.visible.filter((p) => columnOf(p) === col.id);
            columnEl.innerHTML = `
                <div class="kanban-header">
                    <h3><i class="fas ${escapeHtml(col.icon || 'fa-circle')}"></i> ${escapeHtml(col.title)}</h3>
                    <span class="kanban-count">${inColumn.length}</span>
                </div>
                <div class="kanban-cards" data-column="${escapeHtml(col.id)}"></div>`;
            const cardsEl = columnEl.querySelector('.kanban-cards');
            inColumn.forEach((p) => cardsEl.appendChild(buildKanbanCard(p, colIdx)));
            cardsEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                columnEl.classList.add('drag-over');
            });
            cardsEl.addEventListener('dragleave', (e) => {
                if (!cardsEl.contains(e.relatedTarget)) {
                    columnEl.classList.remove('drag-over');
                }
            });
            cardsEl.addEventListener('drop', (e) => {
                e.preventDefault();
                columnEl.classList.remove('drag-over');
                const id = e.dataTransfer.getData('text/plain');
                if (id) movePhoto(id, col.id);
            });
            els.board.appendChild(columnEl);
        });
    }

    function movePhoto(id, columnId) {
        if (!columnExists(columnId) || state.board[id] === columnId) return;
        state.board[id] = columnId;
        persistBoard();
        if (state.view === 'kanban') {
            renderKanban();
        } else {
            renderGrid();
        }
    }

    function resetBoard() {
        try {
            localStorage.removeItem(BOARD_STORAGE_KEY);
        } catch (e) {
            // localStorage nicht verfuegbar
        }
        initBoard();
        if (state.view === 'kanban') {
            renderKanban();
        } else {
            renderGrid();
        }
    }

    function renderCurrentView() {
        if (state.view === 'kanban') {
            renderKanban();
        } else {
            renderGrid();
        }
    }

    function setView(view) {
        state.view = view;
        const isGrid = view === 'grid';
        els.grid.classList.toggle('hidden', !isGrid);
        els.board.classList.toggle('hidden', isGrid);
        els.viewGrid.classList.toggle('active', isGrid);
        els.viewGrid.setAttribute('aria-pressed', String(isGrid));
        els.viewKanban.classList.toggle('active', !isGrid);
        els.viewKanban.setAttribute('aria-pressed', String(!isGrid));
        els.resetBoard.classList.toggle('hidden', isGrid);
        renderCurrentView();
    }

    function currentPhoto() {
        return state.visible[state.lightboxIndex];
    }

    function openLightbox(index) {
        if (!state.visible.length) return;
        state.lightboxIndex = Math.max(0, Math.min(index, state.visible.length - 1));
        els.lightbox.hidden = false;
        requestAnimationFrame(() => els.lightbox.classList.add('open'));
        document.body.style.overflow = 'hidden';
        buildThumbs();
        showSlide(state.lightboxIndex);
    }

    function closeLightbox() {
        stopAutoplay();
        els.lightbox.classList.remove('open');
        els.lightbox.hidden = true;
        document.body.style.overflow = '';
        state.lightboxIndex = -1;
        if (window.history && history.replaceState) {
            history.replaceState(null, '', window.location.pathname + window.location.search);
        }
    }

    function updateHash(p) {
        if (window.history && history.replaceState) {
            history.replaceState(null, '', '#foto-' + p.id);
        }
    }

    function showSlide(index) {
        const list = state.visible;
        if (!list.length) return;
        state.lightboxIndex = ((index % list.length) + list.length) % list.length;
        const p = list[state.lightboxIndex];

        els.media.innerHTML = '';
        let mediaEl;
        if (p.type === 'video') {
            mediaEl = document.createElement('video');
            mediaEl.src = p.src;
            mediaEl.controls = true;
            mediaEl.autoplay = true;
            mediaEl.muted = true;
            mediaEl.loop = true;
            mediaEl.playsInline = true;
            if (p.poster) mediaEl.poster = p.poster;
        } else {
            mediaEl = document.createElement('img');
            mediaEl.src = p.src;
            mediaEl.alt = p.title || '';
            mediaEl.className = 'kenburns';
        }
        els.media.appendChild(mediaEl);

        els.lbTitle.textContent = p.title || '';
        els.lbDesc.textContent = [p.description, formatDate(p.date)].filter(Boolean).join(' · ');
        els.counter.textContent = (state.lightboxIndex + 1) + ' / ' + list.length;
        els.download.href = p.src;
        els.download.setAttribute('download', (p.title || p.id) + fileExtension(p.src));

        els.thumbs.querySelectorAll('.lightbox-thumb').forEach((t, i) => {
            t.classList.toggle('active', i === state.lightboxIndex);
        });
        const activeThumb = els.thumbs.querySelector('.lightbox-thumb.active');
        if (activeThumb && activeThumb.scrollIntoView) {
            activeThumb.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }

        preloadNext();
        updateHash(p);
        restartProgress();
    }

    function buildThumbs() {
        els.thumbs.innerHTML = state.visible.map((p, i) => `
            <button type="button" class="lightbox-thumb" data-index="${i}"
                    aria-label="${escapeHtml(p.title || 'Medium ' + (i + 1))}">
                <img src="${escapeHtml(p.thumb || p.src)}" alt="" loading="lazy">
            </button>`).join('');
        els.thumbs.querySelectorAll('.lightbox-thumb').forEach((t) => {
            t.addEventListener('click', () => showSlide(parseInt(t.dataset.index, 10)));
        });
    }

    function preloadNext() {
        const list = state.visible;
        if (!list.length) return;
        const next = list[(state.lightboxIndex + 1) % list.length];
        if (next && next.type !== 'video') {
            const img = new Image();
            img.src = next.src;
        }
    }

    function resetProgressBar() {
        els.progressBar.style.transition = 'none';
        els.progressBar.style.width = '0%';
    }

    function restartProgress() {
        if (state.autoplayTimer) {
            clearTimeout(state.autoplayTimer);
            state.autoplayTimer = null;
        }
        resetProgressBar();
        if (state.autoplay) {
            requestAnimationFrame(() => {
                els.progressBar.style.transition = 'width ' + AUTOPLAY_MS + 'ms linear';
                els.progressBar.style.width = '100%';
            });
            state.autoplayTimer = setTimeout(() => {
                showSlide(state.lightboxIndex + 1);
            }, AUTOPLAY_MS);
        }
    }

    function startAutoplay() {
        state.autoplay = true;
        els.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        els.playBtn.setAttribute('aria-label', 'Autoplay stoppen');
        restartProgress();
    }

    function stopAutoplay() {
        state.autoplay = false;
        if (state.autoplayTimer) {
            clearTimeout(state.autoplayTimer);
            state.autoplayTimer = null;
        }
        els.playBtn.innerHTML = '<i class="fas fa-play"></i>';
        els.playBtn.setAttribute('aria-label', 'Autoplay starten');
        resetProgressBar();
    }

    function toggleAutoplay() {
        if (state.autoplay) {
            stopAutoplay();
        } else {
            startAutoplay();
        }
    }

    function toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else if (els.lightbox.requestFullscreen) {
            els.lightbox.requestFullscreen();
        }
    }

    function fallbackCopy(text, done) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            done();
        } catch (e) {
            // Kopieren nicht moeglich
        }
        document.body.removeChild(ta);
    }

    function shareCurrent() {
        const p = currentPhoto();
        if (!p) return;
        const url = window.location.origin + window.location.pathname + '#foto-' + p.id;
        const done = () => {
            const icon = els.shareBtn.querySelector('i');
            if (icon) icon.className = 'fas fa-check';
            setTimeout(() => {
                const current = els.shareBtn.querySelector('i');
                if (current) current.className = 'fas fa-share-alt';
            }, 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(done).catch(() => fallbackCopy(url, done));
        } else {
            fallbackCopy(url, done);
        }
    }

    function onKeydown(e) {
        if (state.lightboxIndex === -1) return;
        switch (e.key) {
        case 'Escape':
            closeLightbox();
            break;
        case 'ArrowRight':
            showSlide(state.lightboxIndex + 1);
            break;
        case 'ArrowLeft':
            showSlide(state.lightboxIndex - 1);
            break;
        case ' ':
            e.preventDefault();
            toggleAutoplay();
            break;
        case 'f':
        case 'F':
            toggleFullscreen();
            break;
        default:
            break;
        }
    }

    function openFromHash() {
        const m = window.location.hash.match(/^#foto-(.+)$/);
        if (!m) return;
        const idx = photoIndexInVisible(decodeURIComponent(m[1]));
        if (idx >= 0) openLightbox(idx);
    }

    function wireEvents() {
        els.viewGrid.addEventListener('click', () => setView('grid'));
        els.viewKanban.addEventListener('click', () => setView('kanban'));
        els.search.addEventListener('input', () => {
            state.query = els.search.value;
            applyFilters();
            renderCurrentView();
        });
        els.category.addEventListener('change', () => {
            state.category = els.category.value;
            applyFilters();
            renderCurrentView();
        });
        els.startSlideshow.addEventListener('click', () => {
            if (!state.visible.length) return;
            openLightbox(0);
            if (!state.autoplay) startAutoplay();
        });
        els.resetBoard.addEventListener('click', resetBoard);

        els.lbClose.addEventListener('click', closeLightbox);
        els.lightbox.querySelector('[data-close]').addEventListener('click', closeLightbox);
        els.lbPrev.addEventListener('click', () => showSlide(state.lightboxIndex - 1));
        els.lbNext.addEventListener('click', () => showSlide(state.lightboxIndex + 1));
        els.playBtn.addEventListener('click', toggleAutoplay);
        els.fullscreenBtn.addEventListener('click', toggleFullscreen);
        els.shareBtn.addEventListener('click', shareCurrent);

        document.addEventListener('keydown', onKeydown);

        els.stage.addEventListener('touchstart', (e) => {
            state.touchStartX = e.changedTouches[0].clientX;
        }, { passive: true });
        els.stage.addEventListener('touchend', (e) => {
            const dx = e.changedTouches[0].clientX - state.touchStartX;
            if (Math.abs(dx) > 50) {
                showSlide(state.lightboxIndex + (dx < 0 ? 1 : -1));
            }
        }, { passive: true });
    }

    function init() {
        collectEls();
        loadData().then((data) => {
            state.album = data.album || null;
            state.columns = Array.isArray(data.columns) && data.columns.length
                ? data.columns
                : [{ id: 'default', title: 'Alle', icon: 'fa-images' }];
            state.photos = Array.isArray(data.photos) ? data.photos : [];
            initBoard();
            renderAlbumMeta();
            renderCategoryFilter();
            applyFilters();
            wireEvents();
            setView('grid');
            openFromHash();
        }).catch((err) => {
            console.error('Error loading gallery:', err);
            if (els.grid) {
                els.grid.innerHTML = '<p class="error">Fehler beim Laden der Galerie.</p>';
            }
        });
    }

    domReady(init);
})();
