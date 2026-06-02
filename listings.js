/**
 * BB Realty - Premium Property Listing Portal & Admin Controller (listings.js)
 * Features: Async API synchronization, Dynamic card grid rendering, Advanced Filters, 
 * Sorting engine, public Detail Views, GHL UTM dynamic bindings, Admin Panel PIN authorization, 
 * base64 upload translation, and instant deletion logs.
 */

document.addEventListener('DOMContentLoaded', () => {

    const API_BASE_URL = "https://bbrealty.stocky-navi.workers.dev/api/properties";

    // --- State variables ---
    let propertiesList = [];
    let filteredList = [];
    let isAuthenticated = sessionStorage.getItem('bb_admin_auth') === 'true';
    let editingPropertyId = null;

    // --- DOM Elements ---
    const listingsGrid = document.getElementById('listingsGrid');
    const resultsCountSpan = document.querySelector('.results-count span');
    
    // Filters
    const searchInput = document.getElementById('filterSearch');
    const typeSelect = document.getElementById('filterType');
    const corridorSelect = document.getElementById('filterCorridor');
    const budgetSelect = document.getElementById('filterBudget');
    const sortSelect = document.getElementById('filterSort');
    const statusCheckboxes = document.querySelectorAll('.filter-status-checkbox');
    const bhkCheckboxes = document.querySelectorAll('.bhk-pill-checkbox');
    const resetFiltersBtn = document.getElementById('btnResetFilters');

    // Admin Access Lock
    const adminLockBtn = document.getElementById('adminLockBtn');
    const adminDashboard = document.getElementById('adminDashboard');
    
    // Auth Modal
    const authModal = document.getElementById('auth-modal');
    const pinInput = document.getElementById('authPin');
    const btnSubmitPin = document.getElementById('btnSubmitPin');
    const authError = document.getElementById('authError');

    // Add Project Modal
    const addProjectModal = document.getElementById('add-project-modal');
    const btnShowAddModal = document.getElementById('btnShowAddModal');
    const addProjectForm = document.getElementById('addProjectForm');
    
    // 3-Slot Image Elements
    const dropzone1 = document.getElementById('imageDropzone1');
    const fileInput1 = document.getElementById('projectImageFile1');
    const previewContainer1 = document.getElementById('imagePreviewContainer1');
    const previewImg1 = document.getElementById('imagePreviewImg1');
    const btnRemovePreview1 = document.getElementById('btnRemovePreview1');

    const dropzone2 = document.getElementById('imageDropzone2');
    const fileInput2 = document.getElementById('projectImageFile2');
    const previewContainer2 = document.getElementById('imagePreviewContainer2');
    const previewImg2 = document.getElementById('imagePreviewImg2');
    const btnRemovePreview2 = document.getElementById('btnRemovePreview2');

    const dropzone3 = document.getElementById('imageDropzone3');
    const fileInput3 = document.getElementById('projectImageFile3');
    const previewContainer3 = document.getElementById('imagePreviewContainer3');
    const previewImg3 = document.getElementById('imagePreviewImg3');
    const btnRemovePreview3 = document.getElementById('btnRemovePreview3');

    const btnLogoutAdmin = document.getElementById('btnLogoutAdmin');

    // Detail Modal
    const detailModal = document.getElementById('property-detail-modal');

    // Success Modal
    const successModal = document.getElementById('success-modal');

    // Public Post Property Elements
    const btnShowPublicAddModal = document.getElementById('btnShowPublicAddModal');
    const ownerContactGroup = document.getElementById('ownerContactGroup');
    const ownerNameInput = document.getElementById('ownerName');
    const ownerPhoneInput = document.getElementById('ownerPhone');
    const ownerUserTypeSelect = document.getElementById('ownerUserType');

    // Mobile Navigation Drawer Toggle (matches script.js for consistency)
    const menuToggle = document.getElementById('menuToggle');
    const drawerClose = document.getElementById('drawerClose');
    const mobileDrawer = document.getElementById('mobileDrawer');
    const drawerOverlay = document.getElementById('drawerOverlay');
    const drawerLinks = document.querySelectorAll('.drawer-link');

    if (menuToggle && drawerClose && mobileDrawer && drawerOverlay) {
        menuToggle.addEventListener('click', () => {
            mobileDrawer.classList.add('open');
            drawerOverlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        });
        const closeDrawer = () => {
            mobileDrawer.classList.remove('open');
            drawerOverlay.classList.remove('open');
            document.body.style.overflow = '';
        };
        drawerClose.addEventListener('click', closeDrawer);
        drawerOverlay.addEventListener('click', closeDrawer);
        drawerLinks.forEach(link => link.addEventListener('click', closeDrawer));
    }

    // Sticky Header Scroll Effect
    const header = document.querySelector('.site-header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    // --- Base64 Image Processing Variables & Deletion Flags ---
    let base64ImagePayload1 = "";
    let base64ImagePayload2 = "";
    let base64ImagePayload3 = "";

    let image2Cleared = false;
    let image3Cleared = false;

    function parseUrlParameters() {
        const params = new URLSearchParams(window.location.search);
        
        const typeParam = params.get('type');
        const locationParam = params.get('location');
        const budgetParam = params.get('budget');
        
        if (typeParam) {
            typeSelect.value = typeParam;
        }
        
        if (locationParam) {
            const exists = Array.from(corridorSelect.options).some(opt => opt.value === locationParam);
            if (!exists && locationParam !== 'all') {
                const opt = document.createElement('option');
                opt.value = locationParam;
                opt.textContent = isNaN(locationParam) ? locationParam.replace(/-/g, ' ') : `Sector ${locationParam}`;
                corridorSelect.appendChild(opt);
            }
            corridorSelect.value = locationParam;
        }
        
        if (budgetParam && budgetSelect) {
            budgetSelect.value = budgetParam;
        }
    }

    // ==========================================================================
    // 1. Initial Load & Fetch Listings
    // ==========================================================================
    async function loadProperties() {
        showGridSkeleton();
        try {
            const response = await fetch(API_BASE_URL);
            if (!response.ok) throw new Error('API connection error');
            propertiesList = await response.json();
            
            // Check auth state and toggle views
            checkAuthState();

            // Parse URL parameters from homepage redirect
            parseUrlParameters();

            // Run initial filters and display grid
            applyFilters();
        } catch (error) {
            console.error('Failed to load listings:', error);
            listingsGrid.innerHTML = `
                <div class="empty-listings-state">
                    <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <h4>Failed to sync portal</h4>
                    <p>There was a connection issue with the database. Please try reloading the page.</p>
                    <button class="btn btn-gold" onclick="window.location.reload()">Retry Connection</button>
                </div>
            `;
        }
    }

    function showGridSkeleton() {
        listingsGrid.innerHTML = Array(6).fill(0).map(() => `
            <div class="project-card skeleton-card" style="opacity: 0.7;">
                <div style="height: 220px; background-color: #e2e8f0; animation: pulse 1.5s infinite;"></div>
                <div style="padding: 24px; display: flex; flex-direction: column; gap: 14px;">
                    <div style="height: 12px; width: 40%; background-color: #e2e8f0; animation: pulse 1.5s infinite; border-radius: 4px;"></div>
                    <div style="height: 20px; width: 80%; background-color: #e2e8f0; animation: pulse 1.5s infinite; border-radius: 4px;"></div>
                    <div style="height: 12px; width: 100%; background-color: #e2e8f0; animation: pulse 1.5s infinite; border-radius: 4px;"></div>
                    <div style="height: 40px; background-color: #e2e8f0; animation: pulse 1.5s infinite; border-radius: 6px; margin-top: 15px;"></div>
                </div>
            </div>
        `).join('');
    }

    // ==========================================================================
    // 2. Listing Cards Render Engine
    // ==========================================================================
    function renderListings(properties) {
        if (properties.length === 0) {
            listingsGrid.innerHTML = `
                <div class="empty-listings-state">
                    <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                    <h4>No Projects Match Filters</h4>
                    <p>Try resetting the sidebar query values or checking different property categories.</p>
                    <button class="btn btn-gold" id="btnResetFiltersInline">Clear All Filters</button>
                </div>
            `;
            const resetInline = document.getElementById('btnResetFiltersInline');
            if (resetInline) resetInline.addEventListener('click', resetFilters);
            resultsCountSpan.innerText = '0';
            return;
        }

        resultsCountSpan.innerText = properties.length;

        listingsGrid.innerHTML = properties.map(prop => {
            const statusLabel = prop.status === 'new-launch' ? 'New Launch' : 
                                prop.status === 'under-construction' ? 'Under Construction' : 'Ready to Move';
            const typeLabel = prop.type === 'residential' ? 'Residential' :
                              prop.type === 'commercial' ? 'Commercial' : 'Agriculture';
            
            // Delete and Edit buttons markup if admin is authenticated
            const adminBtnMarkup = isAuthenticated ? `
                <button class="btn-edit-listing" data-id="${prop.id}">
                    <svg style="width:12px;height:12px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit
                </button>
                <button class="btn-delete-listing" data-id="${prop.id}">
                    <svg style="width:14px;height:14px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                </button>
            ` : '';

            return `
                <div class="project-card ${isAuthenticated ? 'admin-mode' : ''}" data-id="${prop.id}">
                    ${adminBtnMarkup}
                    <div class="project-img-wrapper">
                        <img src="${prop.image}" alt="${prop.name}" onerror="this.src='assets/images/residential.png'">
                        <span class="badge-status badge-${prop.status}">${statusLabel}</span>
                        <span class="badge-type">${typeLabel}</span>
                    </div>
                    <div class="project-body">
                        <div class="builder-info">
                            <span class="builder-name">${prop.builderName}</span>
                            <span class="project-price">${prop.price}</span>
                        </div>
                        <h3 class="project-name">${prop.name}</h3>
                        <div class="project-meta">
                            <div class="meta-row">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>${prop.location}</span>
                            </div>
                            <div class="meta-row">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                <span>${prop.bhkText || 'Commercial Unit'}</span>
                            </div>
                            <div class="meta-row">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                </svg>
                                <span>Area: ${prop.size || 'Varies'}</span>
                            </div>
                        </div>
                        <div class="project-footer">
                            <button class="btn btn-navy-outline btn-detail-trigger" data-id="${prop.id}">View Details</button>
                            <button class="btn btn-gold btn-enquire-ghl" data-project="${prop.name}" data-builder="${prop.builderName}">Enquire Now</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Re-attach triggers to buttons
        setupCardInteractionListeners();
    }

    // ==========================================================================
    // 3. Multi-Facet Filtering & Sorting Engine
    // ==========================================================================
    function applyFilters() {
        const query = searchInput.value.toLowerCase().trim();
        const propType = typeSelect.value;
        const locationVal = corridorSelect.value;
        const budgetVal = budgetSelect ? budgetSelect.value : 'all';
        const sortVal = sortSelect.value;

        // Get checked statuses
        const activeStatuses = Array.from(statusCheckboxes)
                                    .filter(cb => cb.checked)
                                    .map(cb => cb.value);

        // Get checked BHK pills
        const activeBhkList = Array.from(bhkCheckboxes)
                                    .filter(cb => cb.checked)
                                    .map(cb => cb.value);

        filteredList = propertiesList.filter(prop => {
            // Text search matches name, builder name, or location
            const matchesText = !query || 
                                prop.name.toLowerCase().includes(query) ||
                                prop.builderName.toLowerCase().includes(query) ||
                                prop.location.toLowerCase().includes(query) ||
                                prop.description.toLowerCase().includes(query);

            // Property type match
            const matchesType = (propType === 'all' || prop.type === propType);

            // Location corridors match
            let matchesLocation = true;
            if (locationVal !== 'all') {
                const locText = prop.location.toLowerCase();
                if (locationVal === 'dxp') {
                    matchesLocation = locText.includes('dwarka expressway') || locText.includes('sector 10') || locText.includes('sector 11');
                } else if (locationVal === 'new-gurgaon') {
                    matchesLocation = locText.includes('new gurgaon') ||
                                      locText.includes('sector 8') ||
                                      locText.includes('sector 9') ||
                                      locText.includes('manesar');
                } else if (locationVal === 'spr') {
                    matchesLocation = locText.includes('spr road') ||
                                      locText.includes('sector 7') ||
                                      locText.includes('sector 80');
                } else {
                    matchesLocation = locText.includes(`sector ${locationVal}`);
                }
            }

            // Status match
            const matchesStatus = (activeStatuses.length === 0 || activeStatuses.includes(prop.status));

            // BHK size match
            let matchesBhk = true;
            if (activeBhkList.length > 0 && prop.bhk && prop.bhk.length > 0) {
                matchesBhk = prop.bhk.some(val => {
                    const stringVal = Math.floor(val).toString();
                    if (stringVal >= 4 && activeBhkList.includes('4')) return true;
                    return activeBhkList.includes(stringVal);
                });
            } else if (activeBhkList.length > 0) {
                // If it is commercial (which has empty bhk list), it only matches if commercial isn't searching for room sizes
                matchesBhk = false;
            }

            // Budget match
            let matchesBudget = true;
            if (budgetVal !== 'all') {
                const budget = parseFloat(prop.priceNum || 0);
                if (budgetVal === 'under-1') {
                    matchesBudget = budget < 1.0;
                } else if (budgetVal === '1-2.5') {
                    matchesBudget = budget >= 1.0 && budget <= 2.5;
                } else if (budgetVal === '2.5-5') {
                    matchesBudget = budget >= 2.5 && budget <= 5.0;
                } else if (budgetVal === '5-10') {
                    matchesBudget = budget >= 5.0 && budget <= 10.0;
                } else if (budgetVal === '10plus') {
                    matchesBudget = budget > 10.0;
                }
            }

            return matchesText && matchesType && matchesLocation && matchesStatus && matchesBhk && matchesBudget;
        });

        // Apply Sorting
        sortListings(sortVal);

        // Display results
        renderListings(filteredList);
    }

    function sortListings(sortBy) {
        if (sortBy === 'price-asc') {
            filteredList.sort((a, b) => (a.priceNum || 0) - (b.priceNum || 0));
        } else if (sortBy === 'price-desc') {
            filteredList.sort((a, b) => (b.priceNum || 0) - (a.priceNum || 0));
        } else if (sortBy === 'alphabetical') {
            filteredList.sort((a, b) => a.name.localeCompare(b.name));
        } else {
            // Default sort by ID (reverse - newest first)
            filteredList.sort((a, b) => parseInt(b.id, 10) - parseInt(a.id, 10));
        }
    }

    function resetFilters() {
        searchInput.value = '';
        typeSelect.value = 'all';
        corridorSelect.value = 'all';
        if (budgetSelect) budgetSelect.value = 'all';
        sortSelect.value = 'default';
        statusCheckboxes.forEach(cb => cb.checked = false);
        bhkCheckboxes.forEach(cb => cb.checked = false);
        applyFilters();
    }

    // Attach sidebar listener events
    searchInput.addEventListener('input', applyFilters);
    typeSelect.addEventListener('change', applyFilters);
    corridorSelect.addEventListener('change', applyFilters);
    if (budgetSelect) {
        budgetSelect.addEventListener('change', applyFilters);
    }
    sortSelect.addEventListener('change', applyFilters);
    statusCheckboxes.forEach(cb => cb.addEventListener('change', applyFilters));
    bhkCheckboxes.forEach(cb => cb.addEventListener('change', applyFilters));
    resetFiltersBtn.addEventListener('click', resetFilters);


    // ==========================================================================
    // 4. Dynamic public Modal Operations & GHL Direct bindings
    // ==========================================================================
    function setupCardInteractionListeners() {
        // public view details modal triggers
        const detailBtns = document.querySelectorAll('.btn-detail-trigger');
        detailBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const propId = e.currentTarget.getAttribute('data-id');
                openDetailModal(propId);
            });
        });

        // direct enquire buttons
        const enquireBtns = document.querySelectorAll('.btn-enquire-ghl');
        enquireBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const project = e.currentTarget.getAttribute('data-project');
                const builder = e.currentTarget.getAttribute('data-builder');
                triggerGhlRedirect(project, builder, 'portal_grid');
            });
        });

        // admin delete action triggers
        const deleteBtns = document.querySelectorAll('.btn-delete-listing');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const propId = e.currentTarget.getAttribute('data-id');
                confirmAndDeleteProperty(propId);
            });
        });

        // admin edit action triggers
        const editBtns = document.querySelectorAll('.btn-edit-listing');
        editBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const propId = e.currentTarget.getAttribute('data-id');
                openEditModal(propId);
            });
        });
    }

    function triggerGhlRedirect(project, builder, source) {
        const baseUrl = "https://leads.bbrealty.in/";
        let params = `tag=${encodeURIComponent(source)}&source=${encodeURIComponent(source)}&Source=${encodeURIComponent(source)}&utm_source=${encodeURIComponent(source)}`;
        
        if (project) {
            params += `&project=${encodeURIComponent(project)}` +
                      `&Project=${encodeURIComponent(project)}` +
                      `&project_name=${encodeURIComponent(project)}` +
                      `&Project_Name=${encodeURIComponent(project)}` +
                      `&propertyName=${encodeURIComponent(project)}` +
                      `&PropertyName=${encodeURIComponent(project)}` +
                      `&selected_project=${encodeURIComponent(project)}` +
                      `&selectedProject=${encodeURIComponent(project)}`;
        }
        if (builder) {
            params += `&builder=${encodeURIComponent(builder)}` +
                      `&Builder=${encodeURIComponent(builder)}` +
                      `&builder_name=${encodeURIComponent(builder)}` +
                      `&builderName=${encodeURIComponent(builder)}`;
        }
        window.location.href = `${baseUrl}?${params}`;
    }

    function openDetailModal(id) {
        const prop = propertiesList.find(p => String(p.id) === String(id));
        if (!prop) return;

        const typeLabel = prop.type === 'residential' ? 'Residential Development' :
                          prop.type === 'commercial' ? 'Commercial Spot' : 'Agricultural Land';
        const reraTag = prop.rera ? `RERA Approved: ${prop.rera}` : 'HARERA Verification Pending';

        const hasGallery = !!(prop.image2 || prop.image3);
        const galleryHtml = hasGallery ? `
            <div class="detail-gallery-container">
                <div class="detail-gallery-thumb active" data-img="${prop.image}">
                    <img src="${prop.image}" onerror="this.src='assets/images/residential.png'">
                </div>
                ${prop.image2 ? `
                <div class="detail-gallery-thumb" data-img="${prop.image2}">
                    <img src="${prop.image2}">
                </div>
                ` : ''}
                ${prop.image3 ? `
                <div class="detail-gallery-thumb" data-img="${prop.image3}">
                    <img src="${prop.image3}">
                </div>
                ` : ''}
            </div>
        ` : '';

        // Populate detail dynamic structures
        const detailCard = detailModal.querySelector('.modal-dialog-card--detail');
        detailCard.innerHTML = `
            <button class="modal-close" style="z-index: 100; color: #fff; font-size:36px;" id="detailCloseBtn">&times;</button>
            <div class="detail-modal-header">
                <img id="detailHeroImg" src="${prop.image}" alt="${prop.name}" onerror="this.src='assets/images/residential.png'">
                <div class="detail-modal-overlay-top"></div>
                <div class="detail-modal-title-box">
                    <span class="detail-modal-builder">${prop.builderName}</span>
                    <h2 class="detail-modal-name">${prop.name}</h2>
                    <p class="detail-modal-location">${prop.location} | <span style="color: var(--secondary-light); font-weight:700;">${reraTag}</span></p>
                </div>
                ${galleryHtml}
            </div>
            <div class="detail-modal-body">
                <div class="detail-quick-specs">
                    <div class="spec-block">
                        <label>Property Status</label>
                        <span style="color: var(--secondary-color); text-transform: capitalize;">${prop.status.replace(/-/g, ' ')}</span>
                    </div>
                    <div class="spec-block">
                        <label>Investment Size</label>
                        <span>${prop.price}</span>
                    </div>
                    <div class="spec-block">
                        <label>Floor Layout</label>
                        <span>${prop.bhkText || 'Commercial Unit'}</span>
                    </div>
                    <div class="spec-block">
                        <label>Sector Area</label>
                        <span>${prop.size || 'Flexible Size'}</span>
                    </div>
                </div>

                <div class="detail-text-section">
                    <h4>Architectural Overview</h4>
                    <p>${prop.description}</p>
                </div>

                <div class="detail-text-section">
                    <h4>Premium Amenities included</h4>
                    <div class="detail-amenities-list">
                        ${prop.amenities.map(amenity => `
                            <div class="amenity-item">
                                <svg class="amenity-icon-check" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                                <span>${amenity}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="detail-modal-footer">
                    <div style="text-align: left;">
                        <span style="font-family: var(--font-body); font-size:12px; text-transform:uppercase; color: var(--text-muted); font-weight: 700; letter-spacing:0.5px;">Premium Offerings</span>
                        <h5 style="font-family: var(--font-heading); font-size: 20px; color: var(--primary-color); margin-top: 2px;">Consult Portfolio Manager</h5>
                    </div>
                    <div style="display:flex; gap:12px;">
                        <a href="https://wa.me/919729255525?text=Hi%20BB%20Realty%2C%20I%20am%20interested%20in%20${encodeURIComponent(prop.name)}%20in%20${encodeURIComponent(prop.location)}.%20Please%20send%20brochure%20and%20pricing." 
                           target="_blank" class="btn btn-whatsapp" style="border-radius: 8px;">
                            Chat Brochure
                        </a>
                        <button class="btn btn-gold btn-detail-ghl-submit" data-project="${prop.name}" data-builder="${prop.builderName}" style="border-radius: 8px;">
                            Book Private Site Visit
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Wire interactive thumbnail swaps
        if (hasGallery) {
            const detailHeroImg = document.getElementById('detailHeroImg');
            const thumbs = detailCard.querySelectorAll('.detail-gallery-thumb');
            thumbs.forEach(thumb => {
                thumb.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const newSrc = thumb.getAttribute('data-img');
                    detailHeroImg.src = newSrc;
                    thumbs.forEach(t => t.classList.remove('active'));
                    thumb.classList.add('active');
                });
            });
        }

        // Open modal
        detailModal.classList.add('open');
        document.body.style.overflow = 'hidden';

        // Close triggers
        const closeBtn = document.getElementById('detailCloseBtn');
        closeBtn.addEventListener('click', closeDetailModal);
        
        const ghlSubmitBtn = detailCard.querySelector('.btn-detail-ghl-submit');
        ghlSubmitBtn.addEventListener('click', (e) => {
            const project = e.currentTarget.getAttribute('data-project');
            const builder = e.currentTarget.getAttribute('data-builder');
            triggerGhlRedirect(project, builder, 'portal_detail_modal');
        });
    }

    function closeDetailModal() {
        detailModal.classList.remove('open');
        document.body.style.overflow = '';
    }

    // Modal background overlay dismiss
    detailModal.addEventListener('click', (e) => {
        if (e.target === detailModal) closeDetailModal();
    });

    const standardModals = document.querySelectorAll('.modal-dialog-overlay');
    standardModals.forEach(m => {
        m.addEventListener('click', (e) => {
            if (e.target === m && m.id !== 'property-detail-modal') {
                m.classList.remove('open');
                document.body.style.overflow = '';
            }
        });
        
        const closes = m.querySelectorAll('.modal-close, .modal-close-success');
        closes.forEach(c => {
            c.addEventListener('click', () => {
                m.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
    });


    // ==========================================================================
    // 5. Admin Authorization Console Toggles & Password Gate
    // ==========================================================================
    adminLockBtn.addEventListener('click', () => {
        if (isAuthenticated) {
            // Already logged in - show confirm option or toggle dashboard
            if (adminDashboard.style.display === 'none') {
                adminDashboard.style.display = 'flex';
                adminDashboard.scrollIntoView({ behavior: 'smooth' });
            } else {
                adminDashboard.style.display = 'none';
            }
        } else {
            // Unauthenticated - open PIN verification dialog
            authModal.classList.add('open');
            pinInput.value = '';
            authError.style.display = 'none';
            pinInput.focus();
            document.body.style.overflow = 'hidden';
        }
    });

    btnSubmitPin.addEventListener('click', verifyAdminPin);
    pinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') verifyAdminPin();
    });

    function verifyAdminPin() {
        const pin = pinInput.value;
        if (pin === 'admin123') {
            // Log in successfully
            sessionStorage.setItem('bb_admin_auth', 'true');
            isAuthenticated = true;
            authModal.classList.remove('open');
            document.body.style.overflow = '';
            
            // Set styles & render
            checkAuthState();
            renderListings(filteredList);

            // Scroll to dashboard
            setTimeout(() => {
                adminDashboard.style.display = 'flex';
                adminDashboard.scrollIntoView({ behavior: 'smooth' });
            }, 300);
        } else {
            authError.innerText = "Invalid PIN authentication. Please try again.";
            authError.style.display = 'block';
            pinInput.focus();
        }
    }

    btnLogoutAdmin.addEventListener('click', () => {
        sessionStorage.removeItem('bb_admin_auth');
        isAuthenticated = false;
        checkAuthState();
        renderListings(filteredList);
    });

    function checkAuthState() {
        if (isAuthenticated) {
            adminLockBtn.classList.add('authenticated');
            adminLockBtn.innerHTML = `
                <svg style="width:22px;height:22px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
            `;
            adminLockBtn.title = "Admin Mode Active - Manage Projects";
            adminDashboard.style.display = 'flex';
        } else {
            adminLockBtn.classList.remove('authenticated');
            adminLockBtn.innerHTML = `
                <svg style="width:22px;height:22px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
            `;
            adminLockBtn.title = "Admin Console Access";
            adminDashboard.style.display = 'none';
        }
    }


    // ==========================================================================
    // 6. Admin Form: Drag & Drop Base64 Image Processing
    // ==========================================================================
    // ==========================================================================
    // 6. Admin Form: Drag & Drop Base64 Image Processing
    // ==========================================================================
    // ==========================================================================
    // 6. Admin Form: Drag & Drop Base64 Image Processing
    // ==========================================================================
    btnShowAddModal.addEventListener('click', () => {
        editingPropertyId = null;
        addProjectModal.querySelector('.modal-title').innerText = "Publish Premium Real Estate Project";
        addProjectModal.querySelector('.modal-desc').innerText = "Append a new development to the BB Realty database listings portal. All fields are parsed dynamically.";
        addProjectModal.querySelector('button[type="submit"]').innerText = "Publish Listing";

        // Hide Owner Contact Group & remove required attributes
        ownerContactGroup.style.display = 'none';
        ownerNameInput.required = false;
        ownerPhoneInput.required = false;
        if (ownerUserTypeSelect) ownerUserTypeSelect.required = false;

        addProjectModal.classList.add('open');
        document.body.style.overflow = 'hidden';
        addProjectForm.reset();
        clearAllPreviews();
    });

    if (btnShowPublicAddModal) {
        btnShowPublicAddModal.addEventListener('click', () => {
            editingPropertyId = null;
            addProjectModal.querySelector('.modal-title').innerText = "List Your Property - Post Free Ad";
            addProjectModal.querySelector('.modal-desc').innerText = "Reach thousands of premium high-net-worth buyers in Gurgaon instantly. Fill in details below.";
            addProjectModal.querySelector('button[type="submit"]').innerText = "Publish Property";

            // Show Owner Contact Group & require contact info
            ownerContactGroup.style.display = 'grid';
            ownerNameInput.required = true;
            ownerPhoneInput.required = true;
            if (ownerUserTypeSelect) ownerUserTypeSelect.required = true;

            addProjectModal.classList.add('open');
            document.body.style.overflow = 'hidden';
            addProjectForm.reset();
            clearAllPreviews();
        });
    }

    function openEditModal(id) {
        const prop = propertiesList.find(p => String(p.id) === String(id));
        if (!prop) return;

        editingPropertyId = prop.id;

        // Set Modal Dynamic Titles
        addProjectModal.querySelector('.modal-title').innerText = "Update Real Estate Project";
        addProjectModal.querySelector('.modal-desc').innerText = "Modify listing parameters for the project. Outdated assets are swept automatically.";
        addProjectModal.querySelector('button[type="submit"]').innerText = "Save Updates";

        // Hide Owner Contact Group & remove required attributes
        ownerContactGroup.style.display = 'none';
        ownerNameInput.required = false;
        ownerPhoneInput.required = false;
        if (ownerUserTypeSelect) ownerUserTypeSelect.required = false;

        // Populate Form Fields
        document.getElementById('projName').value = prop.name;
        document.getElementById('projBuilder').value = prop.builderName;
        document.getElementById('projType').value = prop.type;
        document.getElementById('projStatus').value = prop.status;
        document.getElementById('projLocation').value = prop.location;
        document.getElementById('projBhkText').value = prop.bhkText || "";
        document.getElementById('projPriceNum').value = prop.priceNum || "";
        
        // Size numeric parsing (extract number from e.g. "3950 sq.ft.")
        const sizeNum = prop.size ? parseInt(prop.size.replace(/[^0-9]/g, ''), 10) : "";
        document.getElementById('projSize').value = sizeNum;
        
        document.getElementById('projRera').value = prop.rera || "";
        document.getElementById('projDesc').value = prop.description || "";

        // Populate Amenities checkboxes
        document.querySelectorAll('.amenity-form-checkbox').forEach(cb => {
            cb.checked = prop.amenities.includes(cb.value);
        });

        // Set Image Previews
        base64ImagePayload1 = "";
        base64ImagePayload2 = "";
        base64ImagePayload3 = "";
        image2Cleared = false;
        image3Cleared = false;

        // Populate Slot 1
        if (prop.image) {
            previewImg1.src = prop.image;
            previewContainer1.style.display = 'block';
            dropzone1.style.display = 'none';
        } else {
            previewImg1.src = "";
            previewContainer1.style.display = 'none';
            dropzone1.style.display = 'flex';
        }

        // Populate Slot 2
        if (prop.image2) {
            previewImg2.src = prop.image2;
            previewContainer2.style.display = 'block';
            dropzone2.style.display = 'none';
        } else {
            previewImg2.src = "";
            previewContainer2.style.display = 'none';
            dropzone2.style.display = 'flex';
        }

        // Populate Slot 3
        if (prop.image3) {
            previewImg3.src = prop.image3;
            previewContainer3.style.display = 'block';
            dropzone3.style.display = 'none';
        } else {
            previewImg3.src = "";
            previewContainer3.style.display = 'none';
            dropzone3.style.display = 'flex';
        }

        // Open Modal
        addProjectModal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    // Generic function to wire file dropzone and preview logic for any slot
    function wireSlotUpload(slotNum, dropzoneEl, fileInputEl, previewContainerEl, previewImgEl, btnRemoveEl) {
        if (!dropzoneEl || !fileInputEl || !previewContainerEl || !previewImgEl || !btnRemoveEl) return;

        // Dragover styles
        ['dragenter', 'dragover'].forEach(eventName => {
            dropzoneEl.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzoneEl.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzoneEl.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzoneEl.classList.remove('dragover');
            }, false);
        });

        // Handle dropped files
        dropzoneEl.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                handleUploadedFile(files[0], slotNum, dropzoneEl, previewContainerEl, previewImgEl);
            }
        });

        // Handle input field files
        fileInputEl.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleUploadedFile(e.target.files[0], slotNum, dropzoneEl, previewContainerEl, previewImgEl);
            }
        });

        btnRemoveEl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            clearUploadPreview(slotNum, dropzoneEl, fileInputEl, previewContainerEl, previewImgEl);
        });
    }

    function handleUploadedFile(file, slotNum, dropzoneEl, previewContainerEl, previewImgEl) {
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file (PNG, JPG, WEBP).');
            return;
        }

        // Limit size (e.g. 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image is too large. Max size allowed is 5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target.result;
            if (slotNum === 1) {
                base64ImagePayload1 = result;
            } else if (slotNum === 2) {
                base64ImagePayload2 = result;
                image2Cleared = false;
            } else if (slotNum === 3) {
                base64ImagePayload3 = result;
                image3Cleared = false;
            }
            
            // Show preview
            previewImgEl.src = result;
            previewContainerEl.style.display = 'block';
            dropzoneEl.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    function clearUploadPreview(slotNum, dropzoneEl, fileInputEl, previewContainerEl, previewImgEl) {
        if (slotNum === 1) {
            base64ImagePayload1 = "";
        } else if (slotNum === 2) {
            base64ImagePayload2 = "";
            image2Cleared = true;
        } else if (slotNum === 3) {
            base64ImagePayload3 = "";
            image3Cleared = true;
        }
        fileInputEl.value = "";
        previewImgEl.src = "";
        previewContainerEl.style.display = 'none';
        dropzoneEl.style.display = 'flex';
    }

    function clearAllPreviews() {
        clearUploadPreview(1, dropzone1, fileInput1, previewContainer1, previewImg1);
        clearUploadPreview(2, dropzone2, fileInput2, previewContainer2, previewImg2);
        clearUploadPreview(3, dropzone3, fileInput3, previewContainer3, previewImg3);
        image2Cleared = false;
        image3Cleared = false;
    }

    // Initialize all 3 dropzone slots
    wireSlotUpload(1, dropzone1, fileInput1, previewContainer1, previewImg1, btnRemovePreview1);
    wireSlotUpload(2, dropzone2, fileInput2, previewContainer2, previewImg2, btnRemovePreview2);
    wireSlotUpload(3, dropzone3, fileInput3, previewContainer3, previewImg3, btnRemovePreview3);


    // ==========================================================================
    // 7. Admin Add/Update Property Form Submit Action
    // ==========================================================================
    addProjectForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Gather amenities list
        const amenities = [];
        document.querySelectorAll('.amenity-form-checkbox:checked').forEach(cb => {
            amenities.push(cb.value);
        });

        // 2. Compute numeric price for filters
        const priceVal = parseFloat(document.getElementById('projPriceNum').value);
        const priceText = `₹${priceVal} Cr* Onwards`;

        // 3. Assemble JSON Payload
        const payload = {
            name: document.getElementById('projName').value.trim(),
            builderName: document.getElementById('projBuilder').value.trim(),
            builder: document.getElementById('projBuilder').value.toLowerCase().replace(/[^a-z0-9]/g, ''),
            type: document.getElementById('projType').value,
            status: document.getElementById('projStatus').value,
            location: document.getElementById('projLocation').value.trim(),
            price: priceText,
            priceNum: priceVal,
            size: document.getElementById('projSize').value.trim() + " sq.ft.",
            description: document.getElementById('projDesc').value.trim(),
            rera: document.getElementById('projRera').value.trim(),
            amenities: amenities,
            bhkText: document.getElementById('projBhkText').value.trim(),
            imageFilePayload: base64ImagePayload1, // Slot 1 Showcase
            image2FilePayload: base64ImagePayload2, // Slot 2 Gallery
            image3FilePayload: base64ImagePayload3, // Slot 3 Gallery
            image2Cleared: image2Cleared,
            image3Cleared: image3Cleared,
            ownerName: ownerNameInput.value.trim() || "",
            ownerPhone: ownerPhoneInput.value.trim() || "",
            ownerUserType: (ownerContactGroup.style.display === 'grid') ? (ownerUserTypeSelect ? ownerUserTypeSelect.value : "") : "admin"
        };

        // BHK array extraction
        const bhkMatch = payload.bhkText.match(/\b\d+(\.\d+)?\b/g);
        if (bhkMatch) {
            payload.bhk = bhkMatch.map(val => parseFloat(val));
        } else {
            payload.bhk = [];
        }

        // Validate mandatory upload image (only for new creations)
        if (!editingPropertyId && !base64ImagePayload1) {
            alert('Please select or upload a premium property showcase image.');
            return;
        }

        // Show spinner / loading status in button
        const submitBtn = addProjectForm.querySelector('button[type="submit"]');
        const origText = submitBtn.innerText;
        submitBtn.disabled = true;
        submitBtn.innerText = editingPropertyId ? "Saving Project Updates..." : "Uploading Project Assets...";

        try {
            let url = API_BASE_URL;
            let method = 'POST';
            
            if (editingPropertyId) {
                payload.id = editingPropertyId;
                method = 'PUT';
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('API request failed');
            
            // Reload and refresh
            await loadProperties();

            // Dismiss modal
            addProjectModal.classList.remove('open');
            document.body.style.overflow = '';

            // Toggle Success modal titles depending on action
            const successTitle = successModal.querySelector('h3');
            const successDesc = successModal.querySelector('p');
            if (editingPropertyId) {
                successTitle.innerText = "Project Listing Updated!";
                successDesc.innerText = "The project metadata and properties have been updated on the BB Realty database listings grid successfully.";
            } else if (ownerContactGroup.style.display === 'grid') {
                successTitle.innerText = "Property Listing Received!";
                successDesc.innerText = "Your premium development has been successfully posted to the BB Realty Portal. Our Gurgaon portfolio managers will verify the details shortly.";
            } else {
                successTitle.innerText = "Project Listing Published!";
                successDesc.innerText = "The new premium development has been compiled and saved permanently into the BB Realty database listings grid on the live server.";
            }
            
            // Display success modal
            successModal.classList.add('open');
            document.body.style.overflow = 'hidden';

        } catch (error) {
            console.error('Failed to submit property:', error);
            alert('Error saving project to database. Please make sure the Node server is running.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = origText;
            editingPropertyId = null; // reset
        }
    });


    // ==========================================================================
    // 8. Admin Property Deletion Action
    // ==========================================================================
    async function confirmAndDeleteProperty(id) {
        const prop = propertiesList.find(p => String(p.id) === String(id));
        if (!prop) return;

        const confirmMsg = `Are you sure you want to permanently delete "${prop.name}" from the BB Realty Listings database?\nThis action cannot be undone.`;
        if (confirm(confirmMsg)) {
            try {
                const response = await fetch(`${API_BASE_URL}?id=${id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) throw new Error('Deletion failed');
                
                // Refresh local listings
                await loadProperties();
            } catch (error) {
                console.error('Failed to delete property:', error);
                alert('Connection issue. Could not delete project listing.');
            }
        }
    }

    // Trigger Initial Fetch on page mount
    loadProperties();
});
