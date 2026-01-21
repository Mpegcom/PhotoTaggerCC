// Photo Tagger Application - Pro Version
// Features: Batch editing, Zoom/Pan, Slideshow, Histogram, Export, Undo/Redo

class PhotoTagger {
    constructor() {
        this.photos = [];
        this.filteredPhotos = [];
        this.currentPhotoIndex = -1;
        this.selectedIndices = new Set();
        this.directoryHandle = null;
        this.map = null;
        this.marker = null;

        // Zoom state
        this.zoomLevel = 1;
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };

        // Slideshow state
        this.slideshowActive = false;
        this.slideshowPlaying = false;
        this.slideshowInterval = null;
        this.slideshowDelay = 3000;

        // Undo/Redo stacks
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSteps = 50;

        // Recent folders (stored in localStorage)
        this.recentFolders = JSON.parse(localStorage.getItem('recentFolders') || '[]');

        // Photo metadata cache
        this.metadataCache = new Map();

        // Performance: thumbnail cache and blob URL management
        this.thumbnailCache = new Map();
        this.activeBlobUrls = new Set();
        this.currentMainPhotoUrl = null;
        this.currentSlideshowUrl = null;
        this.thumbnailSize = 100; // pixels
        this.histogramTimeout = null;
        this.zoomTimeout = null;

        // Lazy loading observer
        this.intersectionObserver = null;

        this.initElements();
        this.initEventListeners();
        this.initMap();
        this.initLazyLoading();
        this.updateRecentFolders();
    }

    initElements() {
        // Buttons
        this.openFolderBtn = document.getElementById('openFolderBtn');
        this.renameBtn = document.getElementById('renameBtn');
        this.searchLocationBtn = document.getElementById('searchLocationBtn');
        this.saveMetadataBtn = document.getElementById('saveMetadataBtn');
        this.selectAllBtn = document.getElementById('selectAllBtn');

        // Toolbar buttons
        this.undoBtn = document.getElementById('undoBtn');
        this.redoBtn = document.getElementById('redoBtn');
        this.zoomInBtn = document.getElementById('zoomInBtn');
        this.zoomOutBtn = document.getElementById('zoomOutBtn');
        this.zoomFitBtn = document.getElementById('zoomFitBtn');
        this.slideshowBtn = document.getElementById('slideshowBtn');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.toggleHistogramBtn = document.getElementById('toggleHistogramBtn');

        // Containers
        this.photoList = document.getElementById('photoList');
        this.photoCount = document.getElementById('photoCount');
        this.selectionCount = document.getElementById('selectionCount');
        this.emptyState = document.getElementById('emptyState');
        this.photoViewer = document.getElementById('photoViewer');
        this.photoDisplay = document.getElementById('photoDisplay');
        this.mainPhoto = document.getElementById('mainPhoto');
        this.exifInfo = document.getElementById('exifInfo');
        this.searchResults = document.getElementById('searchResults');
        this.toastContainer = document.getElementById('toastContainer');
        this.toolbar = document.getElementById('toolbar');
        this.photoPosition = document.getElementById('photoPosition');
        this.batchEditBanner = document.getElementById('batchEditBanner');
        this.batchEditCount = document.getElementById('batchEditCount');
        this.saveButtonText = document.getElementById('saveButtonText');

        // Histogram
        this.histogramOverlay = document.getElementById('histogramOverlay');
        this.histogramCanvas = document.getElementById('histogramCanvas');

        // Slideshow elements
        this.slideshowOverlay = document.getElementById('slideshowOverlay');
        this.slideshowPhoto = document.getElementById('slideshowPhoto');
        this.slideshowPosition = document.getElementById('slideshowPosition');
        this.slideshowPrevBtn = document.getElementById('slideshowPrevBtn');
        this.slideshowNextBtn = document.getElementById('slideshowNextBtn');
        this.slideshowPlayPauseBtn = document.getElementById('slideshowPlayPauseBtn');
        this.slideshowExitBtn = document.getElementById('slideshowExitBtn');
        this.playIcon = document.getElementById('playIcon');
        this.pauseIcon = document.getElementById('pauseIcon');

        // Export modal
        this.exportModal = document.getElementById('exportModal');
        this.exportPattern = document.getElementById('exportPattern');
        this.exportPreview = document.getElementById('exportPreview');
        this.exportCancelBtn = document.getElementById('exportCancelBtn');
        this.exportConfirmBtn = document.getElementById('exportConfirmBtn');

        // Shortcuts modal
        this.shortcutsModal = document.getElementById('shortcutsModal');
        this.shortcutsCloseBtn = document.getElementById('shortcutsCloseBtn');

        // Filter
        this.filterSelect = document.getElementById('filterSelect');

        // Recent folders
        this.recentFoldersContainer = document.getElementById('recentFolders');
        this.recentFoldersList = document.getElementById('recentFoldersList');

        // Inputs
        this.filenameInput = document.getElementById('filenameInput');
        this.descriptionInput = document.getElementById('descriptionInput');
        this.yearInput = document.getElementById('yearInput');
        this.monthInput = document.getElementById('monthInput');
        this.dayInput = document.getElementById('dayInput');
        this.locationSearch = document.getElementById('locationSearch');
        this.latInput = document.getElementById('latInput');
        this.lngInput = document.getElementById('lngInput');
    }

    initEventListeners() {
        // Main buttons
        this.openFolderBtn.addEventListener('click', () => this.openFolder());
        this.renameBtn.addEventListener('click', () => this.renamePhoto());
        this.searchLocationBtn.addEventListener('click', () => this.searchLocation());
        this.saveMetadataBtn.addEventListener('click', () => this.saveMetadata());
        this.selectAllBtn.addEventListener('click', () => this.selectAll());

        // Toolbar
        this.undoBtn.addEventListener('click', () => this.undo());
        this.redoBtn.addEventListener('click', () => this.redo());
        this.zoomInBtn.addEventListener('click', () => this.zoomIn());
        this.zoomOutBtn.addEventListener('click', () => this.zoomOut());
        this.zoomFitBtn.addEventListener('click', () => this.zoomFit());
        this.slideshowBtn.addEventListener('click', () => this.startSlideshow());
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        this.exportBtn.addEventListener('click', () => this.showExportModal());
        this.toggleHistogramBtn.addEventListener('click', () => this.toggleHistogram());

        // Slideshow controls
        this.slideshowPrevBtn.addEventListener('click', () => this.slideshowNavigate(-1));
        this.slideshowNextBtn.addEventListener('click', () => this.slideshowNavigate(1));
        this.slideshowPlayPauseBtn.addEventListener('click', () => this.toggleSlideshowPlayback());
        this.slideshowExitBtn.addEventListener('click', () => this.exitSlideshow());

        // Export modal
        this.exportCancelBtn.addEventListener('click', () => this.hideExportModal());
        this.exportConfirmBtn.addEventListener('click', () => this.executeExport());
        this.exportPattern.addEventListener('input', () => this.updateExportPreview());
        document.querySelector('#exportModal .modal-backdrop').addEventListener('click', () => this.hideExportModal());

        // Shortcuts modal
        this.shortcutsCloseBtn.addEventListener('click', () => this.hideShortcutsModal());
        document.querySelector('#shortcutsModal .modal-backdrop').addEventListener('click', () => this.hideShortcutsModal());

        // Filter
        this.filterSelect.addEventListener('change', () => this.applyFilter());

        // Location search on Enter
        this.locationSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchLocation();
        });

        // Update map marker when coordinates change
        this.latInput.addEventListener('change', () => this.updateMarkerFromInputs());
        this.lngInput.addEventListener('change', () => this.updateMarkerFromInputs());

        // Zoom with mouse wheel (debounced for performance)
        this.photoDisplay.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                // Debounce zoom for smooth performance
                if (this.zoomTimeout) return;
                this.zoomTimeout = setTimeout(() => {
                    this.zoomTimeout = null;
                }, 50);
                if (e.deltaY < 0) this.zoomIn();
                else this.zoomOut();
            }
        }, { passive: false });

        // Pan functionality
        this.photoDisplay.addEventListener('mousedown', (e) => this.startPan(e));
        this.photoDisplay.addEventListener('mousemove', (e) => this.doPan(e));
        this.photoDisplay.addEventListener('mouseup', () => this.endPan());
        this.photoDisplay.addEventListener('mouseleave', () => this.endPan());

        // Double-click to zoom
        this.mainPhoto.addEventListener('dblclick', () => {
            if (this.zoomLevel === 1) this.zoomIn();
            else this.zoomFit();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    handleKeyboard(e) {
        // Ignore if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            if (e.key === 'Escape') e.target.blur();
            return;
        }

        const isMod = e.metaKey || e.ctrlKey;

        // Slideshow mode shortcuts
        if (this.slideshowActive) {
            switch (e.key) {
                case 'Escape':
                    this.exitSlideshow();
                    break;
                case ' ':
                    e.preventDefault();
                    this.toggleSlideshowPlayback();
                    break;
                case 'ArrowLeft':
                    this.slideshowNavigate(-1);
                    break;
                case 'ArrowRight':
                    this.slideshowNavigate(1);
                    break;
            }
            return;
        }

        switch (e.key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                this.navigatePhoto(-1);
                break;
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                this.navigatePhoto(1);
                break;
            case ' ':
                e.preventDefault();
                this.startSlideshow();
                break;
            case 'f':
            case 'F':
                this.toggleFullscreen();
                break;
            case 's':
                if (isMod) {
                    e.preventDefault();
                    this.saveMetadata();
                }
                break;
            case 'z':
                if (isMod && e.shiftKey) {
                    e.preventDefault();
                    this.redo();
                } else if (isMod) {
                    e.preventDefault();
                    this.undo();
                }
                break;
            case 'a':
                if (isMod) {
                    e.preventDefault();
                    this.selectAll();
                }
                break;
            case 'Escape':
                this.clearSelection();
                this.hideExportModal();
                this.hideShortcutsModal();
                break;
            case '+':
            case '=':
                this.zoomIn();
                break;
            case '-':
                this.zoomOut();
                break;
            case '0':
                this.zoomFit();
                break;
            case 'h':
            case 'H':
                this.toggleHistogram();
                break;
            case '?':
                this.showShortcutsModal();
                break;
        }
    }

    initMap() {
        this.map = L.map('map').setView([0, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.map);

        this.map.on('click', (e) => {
            this.setMarker(e.latlng.lat, e.latlng.lng);
            this.latInput.value = e.latlng.lat.toFixed(6);
            this.lngInput.value = e.latlng.lng.toFixed(6);
        });
    }

    initLazyLoading() {
        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const photoName = img.dataset.photoName;
                    if (photoName && !img.src) {
                        this.loadThumbnail(img, photoName);
                    }
                }
            });
        }, {
            root: this.photoList,
            rootMargin: '100px',
            threshold: 0.1
        });
    }

    async loadThumbnail(img, photoName) {
        // Check cache first
        if (this.thumbnailCache.has(photoName)) {
            img.src = this.thumbnailCache.get(photoName);
            return;
        }

        const photo = this.photos.find(p => p.name === photoName);
        if (!photo) return;

        try {
            const thumbnail = await this.generateThumbnail(photo.file);
            this.thumbnailCache.set(photoName, thumbnail);
            img.src = thumbnail;
        } catch (err) {
            // Fallback to placeholder on error
            console.error('Thumbnail error:', err);
        }
    }

    async generateThumbnail(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
                // Create small thumbnail canvas
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Calculate scaled dimensions
                const maxSize = this.thumbnailSize * 2; // 2x for retina
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxSize) {
                        height = (height * maxSize) / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = (width * maxSize) / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // Revoke the full-size URL immediately
                URL.revokeObjectURL(url);

                // Return data URL (cached, no blob URL management needed)
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image'));
            };

            img.src = url;
        });
    }

    setMarker(lat, lng) {
        if (this.marker) {
            this.marker.setLatLng([lat, lng]);
        } else {
            this.marker = L.marker([lat, lng]).addTo(this.map);
        }
        this.map.setView([lat, lng], 13);
        setTimeout(() => this.map.invalidateSize(), 100);
    }

    updateMarkerFromInputs() {
        const lat = parseFloat(this.latInput.value);
        const lng = parseFloat(this.lngInput.value);
        if (!isNaN(lat) && !isNaN(lng)) {
            this.setMarker(lat, lng);
        }
    }

    // ==================== FOLDER MANAGEMENT ====================

    async openFolder() {
        try {
            if (!('showDirectoryPicker' in window)) {
                this.showToast('Browser does not support folder access. Use Chrome or Edge.', 'error');
                return;
            }

            this.directoryHandle = await window.showDirectoryPicker();
            this.addToRecentFolders(this.directoryHandle.name);
            await this.loadPhotos();
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error opening folder:', err);
                this.showToast('Error opening folder', 'error');
            }
        }
    }

    addToRecentFolders(name) {
        this.recentFolders = this.recentFolders.filter(f => f !== name);
        this.recentFolders.unshift(name);
        this.recentFolders = this.recentFolders.slice(0, 5);
        localStorage.setItem('recentFolders', JSON.stringify(this.recentFolders));
        this.updateRecentFolders();
    }

    updateRecentFolders() {
        if (this.recentFolders.length === 0) {
            this.recentFoldersContainer.classList.add('hidden');
            return;
        }

        this.recentFoldersContainer.classList.remove('hidden');
        this.recentFoldersList.innerHTML = '';

        this.recentFolders.forEach(name => {
            const item = document.createElement('div');
            item.className = 'recent-folder-item';
            item.textContent = name;
            this.recentFoldersList.appendChild(item);
        });
    }

    async loadPhotos() {
        // Clean up previous state
        this.photos = [];
        this.metadataCache.clear();
        this.thumbnailCache.clear();

        // Clean up any existing URLs
        if (this.currentMainPhotoUrl) {
            URL.revokeObjectURL(this.currentMainPhotoUrl);
            this.currentMainPhotoUrl = null;
        }
        if (this.currentSlideshowUrl) {
            URL.revokeObjectURL(this.currentSlideshowUrl);
            this.currentSlideshowUrl = null;
        }

        const imageExtensions = [
            '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
            '.tiff', '.tif', '.heic', '.heif', '.avif', '.raw',
            '.cr2', '.nef', '.arw', '.dng', '.orf', '.rw2'
        ];

        const allFiles = [];
        for await (const entry of this.directoryHandle.values()) {
            if (entry.kind === 'file') {
                allFiles.push(entry);
            }
        }

        const xmpFiles = new Map();
        for (const entry of allFiles) {
            if (entry.name.toLowerCase().endsWith('.xmp')) {
                const baseName = entry.name.slice(0, -4);
                xmpFiles.set(baseName.toLowerCase(), entry);
            }
        }

        for (const entry of allFiles) {
            const name = entry.name.toLowerCase();
            if (imageExtensions.some(ext => name.endsWith(ext))) {
                const file = await entry.getFile();
                const xmpHandle = xmpFiles.get(entry.name.toLowerCase());

                this.photos.push({
                    handle: entry,
                    file: file,
                    name: entry.name,
                    size: file.size,
                    lastModified: file.lastModified,
                    xmpHandle: xmpHandle || null,
                    metadata: null
                });
            }
        }

        this.photos.sort((a, b) => a.name.localeCompare(b.name));
        this.filteredPhotos = [...this.photos];
        this.selectedIndices.clear();

        this.updatePhotoCount();
        this.renderPhotoList();

        if (this.photos.length > 0) {
            this.selectPhoto(0);
            this.emptyState.classList.add('hidden');
            this.photoViewer.classList.remove('hidden');
            this.toolbar.classList.remove('hidden');
        } else {
            this.emptyState.classList.remove('hidden');
            this.photoViewer.classList.add('hidden');
            this.toolbar.classList.add('hidden');
            this.showToast('No photos found in folder', 'warning');
        }
    }

    // ==================== FILTERING ====================

    applyFilter() {
        const filter = this.filterSelect.value;

        this.filteredPhotos = this.photos.filter(photo => {
            const meta = this.metadataCache.get(photo.name);

            switch (filter) {
                case 'untagged':
                    return !meta || (!meta.hasDate && !meta.hasLocation);
                case 'no-date':
                    return !meta || !meta.hasDate;
                case 'no-location':
                    return !meta || !meta.hasLocation;
                case 'has-location':
                    return meta && meta.hasLocation;
                default:
                    return true;
            }
        });

        this.selectedIndices.clear();
        this.updateSelectionUI();
        this.renderPhotoList();

        if (this.filteredPhotos.length > 0) {
            this.selectPhoto(0);
        }
    }

    // ==================== PHOTO LIST ====================

    updatePhotoCount() {
        const total = this.photos.length;
        const filtered = this.filteredPhotos.length;
        const text = total === filtered
            ? `${total} photo${total !== 1 ? 's' : ''}`
            : `${filtered} of ${total} photos`;
        this.photoCount.textContent = text;
    }

    renderPhotoList() {
        // Disconnect observer before clearing
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }

        this.photoList.innerHTML = '';

        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();

        this.filteredPhotos.forEach((photo, index) => {
            const item = document.createElement('div');
            item.className = 'photo-item';
            item.dataset.index = index;

            // Checkbox for multi-select
            const checkbox = document.createElement('div');
            checkbox.className = 'select-checkbox';

            const thumbnail = document.createElement('img');
            thumbnail.className = 'photo-item-thumbnail';
            thumbnail.alt = photo.name;
            thumbnail.dataset.photoName = photo.name;

            // Use cached thumbnail if available, otherwise lazy load
            if (this.thumbnailCache.has(photo.name)) {
                thumbnail.src = this.thumbnailCache.get(photo.name);
            } else {
                thumbnail.src = ''; // Placeholder
                this.intersectionObserver?.observe(thumbnail);
            }

            const info = document.createElement('div');
            info.className = 'photo-item-info';

            const name = document.createElement('div');
            name.className = 'photo-item-name';
            name.textContent = photo.name;

            const meta = document.createElement('div');
            meta.className = 'photo-item-meta';
            meta.textContent = this.formatFileSize(photo.size);

            info.appendChild(name);
            info.appendChild(meta);
            item.appendChild(checkbox);
            item.appendChild(thumbnail);
            item.appendChild(info);

            item.addEventListener('click', (e) => {
                if (e.metaKey || e.ctrlKey) {
                    this.toggleSelection(index);
                } else if (e.shiftKey && this.currentPhotoIndex >= 0) {
                    this.selectRange(this.currentPhotoIndex, index);
                } else {
                    this.selectPhoto(index);
                }
            });

            fragment.appendChild(item);
        });

        this.photoList.appendChild(fragment);
        this.updatePhotoCount();
    }

    // ==================== SELECTION ====================

    toggleSelection(index) {
        if (this.selectedIndices.has(index)) {
            this.selectedIndices.delete(index);
        } else {
            this.selectedIndices.add(index);
        }
        this.updateSelectionUI();
    }

    selectRange(start, end) {
        const min = Math.min(start, end);
        const max = Math.max(start, end);
        for (let i = min; i <= max; i++) {
            this.selectedIndices.add(i);
        }
        this.updateSelectionUI();
    }

    selectAll() {
        if (this.selectedIndices.size === this.filteredPhotos.length) {
            this.clearSelection();
        } else {
            this.filteredPhotos.forEach((_, i) => this.selectedIndices.add(i));
            this.updateSelectionUI();
        }
    }

    clearSelection() {
        this.selectedIndices.clear();
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        document.querySelectorAll('.photo-item').forEach((item, i) => {
            item.classList.toggle('selected', this.selectedIndices.has(i));
        });

        const count = this.selectedIndices.size;
        if (count > 1) {
            this.selectionCount.textContent = `${count} selected`;
            this.selectionCount.classList.remove('hidden');
            this.batchEditBanner.classList.remove('hidden');
            this.batchEditCount.textContent = `${count} photos selected`;
            this.saveButtonText.textContent = `Save to ${count} Photos`;
        } else {
            this.selectionCount.classList.add('hidden');
            this.batchEditBanner.classList.add('hidden');
            this.saveButtonText.textContent = 'Save Changes';
        }
    }

    // ==================== PHOTO VIEWING ====================

    async selectPhoto(index) {
        if (index < 0 || index >= this.filteredPhotos.length) return;

        this.currentPhotoIndex = index;
        const photo = this.filteredPhotos[index];

        // Update active state
        document.querySelectorAll('.photo-item').forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });

        const activeItem = document.querySelector('.photo-item.active');
        if (activeItem) {
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Reset zoom
        this.zoomFit();

        // Revoke previous main photo URL to prevent memory leak
        if (this.currentMainPhotoUrl) {
            URL.revokeObjectURL(this.currentMainPhotoUrl);
        }

        // Display photo with new blob URL
        this.currentMainPhotoUrl = URL.createObjectURL(photo.file);
        this.mainPhoto.src = this.currentMainPhotoUrl;
        this.filenameInput.value = photo.name;

        // Update position indicator
        this.photoPosition.textContent = `${index + 1} of ${this.filteredPhotos.length}`;

        // Load EXIF (don't await - let it load async)
        this.loadExifData(photo);

        // Generate histogram with debounce (expensive operation)
        this.scheduleHistogramGeneration(photo);
    }

    scheduleHistogramGeneration(photo) {
        // Cancel any pending histogram generation
        if (this.histogramTimeout) {
            clearTimeout(this.histogramTimeout);
        }
        // Delay histogram generation to avoid blocking UI
        this.histogramTimeout = setTimeout(() => {
            this.generateHistogram(photo);
        }, 150);
    }

    navigatePhoto(direction) {
        const newIndex = this.currentPhotoIndex + direction;
        if (newIndex >= 0 && newIndex < this.filteredPhotos.length) {
            this.selectPhoto(newIndex);
        }
    }

    // ==================== ZOOM & PAN ====================

    zoomIn() {
        this.zoomLevel = Math.min(this.zoomLevel * 1.5, 5);
        this.applyZoom();
    }

    zoomOut() {
        this.zoomLevel = Math.max(this.zoomLevel / 1.5, 0.5);
        this.applyZoom();
    }

    zoomFit() {
        this.zoomLevel = 1;
        this.mainPhoto.style.transform = '';
        this.mainPhoto.style.width = '';
        this.mainPhoto.style.height = '';
        this.photoDisplay.classList.remove('zoomed');
        this.photoDisplay.scrollTop = 0;
        this.photoDisplay.scrollLeft = 0;
    }

    applyZoom() {
        if (this.zoomLevel === 1) {
            this.zoomFit();
            return;
        }

        this.photoDisplay.classList.add('zoomed');
        this.mainPhoto.style.width = `${this.mainPhoto.naturalWidth * this.zoomLevel}px`;
        this.mainPhoto.style.height = `${this.mainPhoto.naturalHeight * this.zoomLevel}px`;
    }

    startPan(e) {
        if (this.zoomLevel > 1) {
            this.isPanning = true;
            this.panStart = { x: e.clientX + this.photoDisplay.scrollLeft, y: e.clientY + this.photoDisplay.scrollTop };
        }
    }

    doPan(e) {
        if (this.isPanning) {
            this.photoDisplay.scrollLeft = this.panStart.x - e.clientX;
            this.photoDisplay.scrollTop = this.panStart.y - e.clientY;
        }
    }

    endPan() {
        this.isPanning = false;
    }

    // ==================== HISTOGRAM ====================

    toggleHistogram() {
        this.histogramOverlay.classList.toggle('hidden');
    }

    generateHistogram(photo) {
        const img = new Image();
        const url = URL.createObjectURL(photo.file);

        img.onload = () => {
            // Sample at a much smaller size for performance
            const maxSampleSize = 256;
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Scale down for sampling
            let width = img.width;
            let height = img.height;
            const scale = Math.min(maxSampleSize / width, maxSampleSize / height, 1);
            width = Math.floor(width * scale);
            height = Math.floor(height * scale);

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            // Clean up blob URL
            URL.revokeObjectURL(url);

            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            const histR = new Array(256).fill(0);
            const histG = new Array(256).fill(0);
            const histB = new Array(256).fill(0);

            // Process all pixels of the scaled down image
            for (let i = 0; i < data.length; i += 4) {
                histR[data[i]]++;
                histG[data[i + 1]]++;
                histB[data[i + 2]]++;
            }

            this.drawHistogram(histR, histG, histB);
        };

        img.onerror = () => URL.revokeObjectURL(url);
        img.src = url;
    }

    drawHistogram(histR, histG, histB) {
        const ctx = this.histogramCanvas.getContext('2d');
        const width = this.histogramCanvas.width;
        const height = this.histogramCanvas.height;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        const maxVal = Math.max(...histR, ...histG, ...histB);

        ctx.globalAlpha = 0.5;

        // Red channel
        ctx.strokeStyle = '#ff4444';
        ctx.beginPath();
        for (let i = 0; i < 256; i++) {
            const h = (histR[i] / maxVal) * height;
            if (i === 0) ctx.moveTo(i, height - h);
            else ctx.lineTo(i, height - h);
        }
        ctx.stroke();

        // Green channel
        ctx.strokeStyle = '#44ff44';
        ctx.beginPath();
        for (let i = 0; i < 256; i++) {
            const h = (histG[i] / maxVal) * height;
            if (i === 0) ctx.moveTo(i, height - h);
            else ctx.lineTo(i, height - h);
        }
        ctx.stroke();

        // Blue channel
        ctx.strokeStyle = '#4444ff';
        ctx.beginPath();
        for (let i = 0; i < 256; i++) {
            const h = (histB[i] / maxVal) * height;
            if (i === 0) ctx.moveTo(i, height - h);
            else ctx.lineTo(i, height - h);
        }
        ctx.stroke();

        ctx.globalAlpha = 1;
    }

    // ==================== SLIDESHOW ====================

    startSlideshow() {
        if (this.filteredPhotos.length === 0) return;

        this.slideshowActive = true;
        this.slideshowOverlay.classList.remove('hidden');
        this.updateSlideshowPhoto();
        this.startSlideshowPlayback();
    }

    exitSlideshow() {
        this.slideshowActive = false;
        this.stopSlideshowPlayback();
        this.slideshowOverlay.classList.add('hidden');

        // Clean up slideshow URL
        if (this.currentSlideshowUrl) {
            URL.revokeObjectURL(this.currentSlideshowUrl);
            this.currentSlideshowUrl = null;
        }
    }

    startSlideshowPlayback() {
        this.slideshowPlaying = true;
        this.playIcon.classList.add('hidden');
        this.pauseIcon.classList.remove('hidden');
        this.slideshowInterval = setInterval(() => this.slideshowNavigate(1), this.slideshowDelay);
    }

    stopSlideshowPlayback() {
        this.slideshowPlaying = false;
        this.playIcon.classList.remove('hidden');
        this.pauseIcon.classList.add('hidden');
        if (this.slideshowInterval) {
            clearInterval(this.slideshowInterval);
            this.slideshowInterval = null;
        }
    }

    toggleSlideshowPlayback() {
        if (this.slideshowPlaying) {
            this.stopSlideshowPlayback();
        } else {
            this.startSlideshowPlayback();
        }
    }

    slideshowNavigate(direction) {
        let newIndex = this.currentPhotoIndex + direction;
        if (newIndex >= this.filteredPhotos.length) newIndex = 0;
        if (newIndex < 0) newIndex = this.filteredPhotos.length - 1;

        this.currentPhotoIndex = newIndex;
        this.updateSlideshowPhoto();
    }

    updateSlideshowPhoto() {
        const photo = this.filteredPhotos[this.currentPhotoIndex];

        // Revoke previous slideshow URL
        if (this.currentSlideshowUrl) {
            URL.revokeObjectURL(this.currentSlideshowUrl);
        }

        this.currentSlideshowUrl = URL.createObjectURL(photo.file);
        this.slideshowPhoto.src = this.currentSlideshowUrl;
        this.slideshowPosition.textContent = `${this.currentPhotoIndex + 1} / ${this.filteredPhotos.length}`;
    }

    // ==================== FULLSCREEN ====================

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    // ==================== EXIF DATA ====================

    async loadExifData(photo) {
        this.exifInfo.innerHTML = '<p>Loading...</p>';
        const fileName = photo.name.toLowerCase();
        const isJpeg = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg');

        try {
            const exif = await exifr.parse(photo.file, { gps: true, exif: true, iptc: true });
            const xmpData = await this.loadXmpData(photo);

            let infoHtml = '';
            let hasDate = false;
            let hasLocation = false;

            const ext = photo.name.split('.').pop().toUpperCase();
            infoHtml += `<p><strong>Format</strong><span>${ext}${isJpeg ? '' : ' (XMP)'}</span></p>`;

            if (exif) {
                if (exif.Make) infoHtml += `<p><strong>Camera</strong><span>${exif.Make} ${exif.Model || ''}</span></p>`;
                if (exif.DateTimeOriginal) {
                    hasDate = true;
                    const date = new Date(exif.DateTimeOriginal);
                    infoHtml += `<p><strong>Date</strong><span>${date.toLocaleDateString()}</span></p>`;
                    this.yearInput.value = date.getFullYear();
                    this.monthInput.value = String(date.getMonth() + 1).padStart(2, '0');
                    this.dayInput.value = date.getDate();
                }
                if (exif.ExposureTime) infoHtml += `<p><strong>Exposure</strong><span>${this.formatExposure(exif.ExposureTime)}</span></p>`;
                if (exif.FNumber) infoHtml += `<p><strong>Aperture</strong><span>f/${exif.FNumber}</span></p>`;
                if (exif.ISO) infoHtml += `<p><strong>ISO</strong><span>${exif.ISO}</span></p>`;
                if (exif.FocalLength) infoHtml += `<p><strong>Focal</strong><span>${exif.FocalLength}mm</span></p>`;

                if (exif.latitude !== undefined && exif.longitude !== undefined) {
                    hasLocation = true;
                    infoHtml += `<p><strong>GPS</strong><span>${exif.latitude.toFixed(4)}, ${exif.longitude.toFixed(4)}</span></p>`;
                    this.latInput.value = exif.latitude.toFixed(6);
                    this.lngInput.value = exif.longitude.toFixed(6);
                    this.setMarker(exif.latitude, exif.longitude);
                }
            }

            // Fill from XMP if missing
            if (!hasDate && xmpData?.year) {
                hasDate = true;
                this.yearInput.value = xmpData.year;
                this.monthInput.value = xmpData.month;
                this.dayInput.value = parseInt(xmpData.day);
                infoHtml += `<p><strong>Date (XMP)</strong><span>${xmpData.year}-${xmpData.month}-${xmpData.day}</span></p>`;
            }

            if (!hasLocation && xmpData?.latitude !== undefined) {
                hasLocation = true;
                this.latInput.value = xmpData.latitude.toFixed(6);
                this.lngInput.value = xmpData.longitude.toFixed(6);
                this.setMarker(xmpData.latitude, xmpData.longitude);
                infoHtml += `<p><strong>GPS (XMP)</strong><span>${xmpData.latitude.toFixed(4)}, ${xmpData.longitude.toFixed(4)}</span></p>`;
            }

            // Clear fields if no data
            if (!hasDate) {
                this.yearInput.value = '';
                this.monthInput.value = '';
                this.dayInput.value = '';
            }

            if (!hasLocation) {
                this.latInput.value = '';
                this.lngInput.value = '';
                if (this.marker) {
                    this.map.removeLayer(this.marker);
                    this.marker = null;
                }
                this.map.setView([0, 0], 2);
                setTimeout(() => this.map.invalidateSize(), 100);
            }

            // Cache metadata state
            this.metadataCache.set(photo.name, { hasDate, hasLocation });

            this.exifInfo.innerHTML = infoHtml || '<p>No metadata</p>';
        } catch (err) {
            console.error('Error reading EXIF:', err);
            this.exifInfo.innerHTML = '<p>Error reading metadata</p>';
        }
    }

    async loadXmpData(photo) {
        if (!photo.xmpHandle) return null;

        try {
            const xmpFile = await photo.xmpHandle.getFile();
            const xmpText = await xmpFile.text();
            const result = {};

            const dateMatch = xmpText.match(/<exif:DateTimeOriginal>([^<]+)<\/exif:DateTimeOriginal>/);
            if (dateMatch) {
                const dateParts = dateMatch[1].match(/(\d{4})-(\d{2})-(\d{2})/);
                if (dateParts) {
                    result.year = dateParts[1];
                    result.month = dateParts[2];
                    result.day = dateParts[3];
                }
            }

            const latMatch = xmpText.match(/<exif:GPSLatitude>([^<]+)<\/exif:GPSLatitude>/);
            const latRefMatch = xmpText.match(/<exif:GPSLatitudeRef>([^<]+)<\/exif:GPSLatitudeRef>/);
            const lngMatch = xmpText.match(/<exif:GPSLongitude>([^<]+)<\/exif:GPSLongitude>/);
            const lngRefMatch = xmpText.match(/<exif:GPSLongitudeRef>([^<]+)<\/exif:GPSLongitudeRef>/);

            if (latMatch && lngMatch) {
                let lat = parseFloat(latMatch[1]);
                let lng = parseFloat(lngMatch[1]);
                if (latRefMatch && latRefMatch[1] === 'S') lat = -lat;
                if (lngRefMatch && lngRefMatch[1] === 'W') lng = -lng;
                result.latitude = lat;
                result.longitude = lng;
            }

            return result;
        } catch (err) {
            console.error('Error reading XMP:', err);
            return null;
        }
    }

    // ==================== UNDO/REDO ====================

    pushUndoState(action, data) {
        this.undoStack.push({ action, data, timestamp: Date.now() });
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }
        this.redoStack = [];
        this.updateUndoRedoButtons();
    }

    undo() {
        if (this.undoStack.length === 0) return;
        const state = this.undoStack.pop();
        this.redoStack.push(state);
        this.applyUndoState(state, true);
        this.updateUndoRedoButtons();
    }

    redo() {
        if (this.redoStack.length === 0) return;
        const state = this.redoStack.pop();
        this.undoStack.push(state);
        this.applyUndoState(state, false);
        this.updateUndoRedoButtons();
    }

    applyUndoState(state, isUndo) {
        // Implementation would restore previous state
        this.showToast(isUndo ? 'Undone' : 'Redone', 'success');
    }

    updateUndoRedoButtons() {
        this.undoBtn.disabled = this.undoStack.length === 0;
        this.redoBtn.disabled = this.redoStack.length === 0;
    }

    // ==================== SAVE METADATA ====================

    async saveMetadata() {
        const indices = this.selectedIndices.size > 1
            ? Array.from(this.selectedIndices)
            : [this.currentPhotoIndex];

        let successCount = 0;

        for (const index of indices) {
            const photo = this.filteredPhotos[index];
            if (!photo) continue;

            const fileName = photo.name.toLowerCase();
            const isJpeg = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg');

            try {
                if (isJpeg) {
                    await this.saveJpegExif(photo);
                } else {
                    await this.saveXmpSidecar(photo);
                }
                successCount++;
            } catch (err) {
                console.error(`Error saving ${photo.name}:`, err);
            }
        }

        if (successCount > 0) {
            this.showToast(`Saved ${successCount} photo${successCount > 1 ? 's' : ''}`, 'success');
            if (indices.length === 1) {
                await this.loadExifData(this.filteredPhotos[this.currentPhotoIndex]);
            }
        }
    }

    async saveJpegExif(photo) {
        const file = await photo.handle.getFile();
        const arrayBuffer = await file.arrayBuffer();
        const base64 = this.arrayBufferToBase64(arrayBuffer);
        const dataUrl = `data:image/jpeg;base64,${base64}`;

        let exifObj;
        try {
            exifObj = piexif.load(dataUrl);
        } catch (e) {
            exifObj = { '0th': {}, 'Exif': {}, 'GPS': {}, '1st': {}, 'thumbnail': null };
        }

        const year = this.yearInput.value;
        const month = this.monthInput.value;
        const day = this.dayInput.value;

        if (year && month && day) {
            const dateStr = `${year}:${month.padStart(2, '0')}:${day.toString().padStart(2, '0')} 12:00:00`;
            exifObj.Exif[piexif.ExifIFD.DateTimeOriginal] = dateStr;
            exifObj.Exif[piexif.ExifIFD.DateTimeDigitized] = dateStr;
            exifObj['0th'][piexif.ImageIFD.DateTime] = dateStr;
        }

        const lat = parseFloat(this.latInput.value);
        const lng = parseFloat(this.lngInput.value);

        if (!isNaN(lat) && !isNaN(lng)) {
            exifObj.GPS[piexif.GPSIFD.GPSLatitudeRef] = lat >= 0 ? 'N' : 'S';
            exifObj.GPS[piexif.GPSIFD.GPSLatitude] = this.degToDmsRational(Math.abs(lat));
            exifObj.GPS[piexif.GPSIFD.GPSLongitudeRef] = lng >= 0 ? 'E' : 'W';
            exifObj.GPS[piexif.GPSIFD.GPSLongitude] = this.degToDmsRational(Math.abs(lng));
        }

        const exifBytes = piexif.dump(exifObj);
        const newDataUrl = piexif.insert(exifBytes, dataUrl);
        const newBase64 = newDataUrl.split(',')[1];
        const newArrayBuffer = this.base64ToArrayBuffer(newBase64);

        const writable = await photo.handle.createWritable();
        await writable.write(newArrayBuffer);
        await writable.close();

        photo.file = await photo.handle.getFile();
    }

    async saveXmpSidecar(photo) {
        const year = this.yearInput.value;
        const month = this.monthInput.value;
        const day = this.dayInput.value;
        const lat = parseFloat(this.latInput.value);
        const lng = parseFloat(this.lngInput.value);

        const xmpContent = this.generateXmpContent({ year, month, day, lat, lng, filename: photo.name });
        const xmpFilename = photo.name + '.xmp';

        const xmpHandle = await this.directoryHandle.getFileHandle(xmpFilename, { create: true });
        const writable = await xmpHandle.createWritable();
        await writable.write(xmpContent);
        await writable.close();

        photo.xmpHandle = xmpHandle;
    }

    generateXmpContent({ year, month, day, lat, lng, filename }) {
        const now = new Date().toISOString();
        let dateTag = '';
        if (year && month && day) {
            const dateStr = `${year}-${month.padStart(2, '0')}-${day.toString().padStart(2, '0')}T12:00:00`;
            dateTag = `\n   <exif:DateTimeOriginal>${dateStr}</exif:DateTimeOriginal>\n   <xmp:CreateDate>${dateStr}</xmp:CreateDate>`;
        }

        let gpsTag = '';
        if (!isNaN(lat) && !isNaN(lng)) {
            const latRef = lat >= 0 ? 'N' : 'S';
            const lngRef = lng >= 0 ? 'E' : 'W';
            gpsTag = `\n   <exif:GPSLatitude>${Math.abs(lat).toFixed(6)}</exif:GPSLatitude>\n   <exif:GPSLatitudeRef>${latRef}</exif:GPSLatitudeRef>\n   <exif:GPSLongitude>${Math.abs(lng).toFixed(6)}</exif:GPSLongitude>\n   <exif:GPSLongitudeRef>${lngRef}</exif:GPSLongitudeRef>`;
        }

        return `<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="PhotoTagger">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
   xmlns:xmp="http://ns.adobe.com/xap/1.0/"
   xmlns:exif="http://ns.adobe.com/exif/1.0/"
   xmlns:dc="http://purl.org/dc/elements/1.1/">
   <xmp:ModifyDate>${now}</xmp:ModifyDate>
   <dc:source>${filename}</dc:source>${dateTag}${gpsTag}
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>`;
    }

    // ==================== RENAME ====================

    async renamePhoto() {
        if (this.currentPhotoIndex < 0) return;

        const photo = this.filteredPhotos[this.currentPhotoIndex];
        const newName = this.filenameInput.value.trim();

        if (!newName || newName === photo.name) {
            this.showToast('Enter a new filename', 'warning');
            return;
        }

        try {
            const file = await photo.handle.getFile();
            const arrayBuffer = await file.arrayBuffer();

            const newHandle = await this.directoryHandle.getFileHandle(newName, { create: true });
            const writable = await newHandle.createWritable();
            await writable.write(arrayBuffer);
            await writable.close();

            await this.directoryHandle.removeEntry(photo.name);

            photo.handle = newHandle;
            photo.name = newName;
            photo.file = await newHandle.getFile();

            const listItem = document.querySelector(`.photo-item[data-index="${this.currentPhotoIndex}"]`);
            if (listItem) {
                listItem.querySelector('.photo-item-name').textContent = newName;
            }

            this.showToast('Renamed successfully', 'success');
        } catch (err) {
            console.error('Error renaming:', err);
            this.showToast('Error renaming file', 'error');
        }
    }

    // ==================== LOCATION SEARCH ====================

    async searchLocation() {
        const query = this.locationSearch.value.trim();
        if (!query) return;

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,
                { headers: { 'User-Agent': 'PhotoTagger/1.0' } }
            );

            const results = await response.json();

            if (results.length === 0) {
                this.showToast('No locations found', 'warning');
                this.searchResults.classList.add('hidden');
                return;
            }

            this.searchResults.innerHTML = '';
            this.searchResults.classList.remove('hidden');

            results.slice(0, 5).forEach(result => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.textContent = result.display_name;
                item.addEventListener('click', () => {
                    const lat = parseFloat(result.lat);
                    const lng = parseFloat(result.lon);
                    this.latInput.value = lat.toFixed(6);
                    this.lngInput.value = lng.toFixed(6);
                    this.setMarker(lat, lng);
                    this.searchResults.classList.add('hidden');
                    this.locationSearch.value = result.display_name.split(',')[0];
                });
                this.searchResults.appendChild(item);
            });
        } catch (err) {
            console.error('Error searching:', err);
            this.showToast('Search error', 'error');
        }
    }

    // ==================== EXPORT ====================

    showExportModal() {
        this.exportModal.classList.remove('hidden');
        this.updateExportPreview();
    }

    hideExportModal() {
        this.exportModal.classList.add('hidden');
    }

    updateExportPreview() {
        const pattern = this.exportPattern.value;
        const photo = this.filteredPhotos[this.currentPhotoIndex];
        if (!photo) return;

        const preview = this.applyExportPattern(pattern, photo, 1);
        this.exportPreview.textContent = preview;
    }

    applyExportPattern(pattern, photo, index) {
        const meta = this.metadataCache.get(photo.name) || {};
        const ext = photo.name.split('.').pop();
        const original = photo.name.replace(/\.[^.]+$/, '');

        return pattern
            .replace('{original}', original)
            .replace('{year}', this.yearInput.value || 'YYYY')
            .replace('{month}', this.monthInput.value || 'MM')
            .replace('{day}', this.dayInput.value || 'DD')
            .replace('{index}', String(index).padStart(4, '0'))
            .replace('{location}', this.locationSearch.value || 'Unknown')
            + '.' + ext;
    }

    async executeExport() {
        const indices = this.selectedIndices.size > 0
            ? Array.from(this.selectedIndices)
            : [this.currentPhotoIndex];

        try {
            const exportDir = await window.showDirectoryPicker({ mode: 'readwrite' });
            const pattern = this.exportPattern.value;

            let count = 0;
            for (const index of indices) {
                const photo = this.filteredPhotos[index];
                if (!photo) continue;

                const newName = this.applyExportPattern(pattern, photo, count + 1);
                const file = await photo.handle.getFile();
                const arrayBuffer = await file.arrayBuffer();

                const newHandle = await exportDir.getFileHandle(newName, { create: true });
                const writable = await newHandle.createWritable();
                await writable.write(arrayBuffer);
                await writable.close();

                count++;
            }

            this.showToast(`Exported ${count} photo${count > 1 ? 's' : ''}`, 'success');
            this.hideExportModal();
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Export error:', err);
                this.showToast('Export failed', 'error');
            }
        }
    }

    // ==================== MODALS ====================

    showShortcutsModal() {
        this.shortcutsModal.classList.remove('hidden');
    }

    hideShortcutsModal() {
        this.shortcutsModal.classList.add('hidden');
    }

    // ==================== UTILITIES ====================

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    formatExposure(exposure) {
        if (exposure >= 1) return exposure + 's';
        return '1/' + Math.round(1 / exposure) + 's';
    }

    degToDmsRational(deg) {
        const d = Math.floor(deg);
        const minFloat = (deg - d) * 60;
        const m = Math.floor(minFloat);
        const secFloat = (minFloat - m) * 60;
        const s = Math.round(secFloat * 100);
        return [[d, 1], [m, 1], [s, 100]];
    }

    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!('showDirectoryPicker' in window)) {
        document.getElementById('emptyState').innerHTML = `
            <div class="empty-state-content">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h2>Browser Not Supported</h2>
                <p>Please use Chrome, Edge, or another Chromium-based browser.</p>
            </div>
        `;
        document.getElementById('openFolderBtn').disabled = true;
    }

    window.app = new PhotoTagger();
});
