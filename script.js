/**
 * BB Realty - Premium Real Estate Website Scripts
 * Features: Sticky Navbar, Mobile Drawer, Property Filter, Location Corridor Filter, Modals, Forms validation
 */

document.addEventListener('DOMContentLoaded', () => {

    /* ==========================================================================
       1. Sticky Header & Active Nav Indicators on Scroll
       ========================================================================== */
    const header = document.querySelector('.site-header');
    const backToTop = document.getElementById('backToTop');
    
    window.addEventListener('scroll', () => {
        // Sticky Header class
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Back to top button visibility
        if (window.scrollY > 500) {
            backToTop.classList.add('show');
        } else {
            backToTop.classList.remove('show');
        }
        
        // Active Nav Indicator based on Section Scroll
        updateActiveNavLink();
    });

    // Scroll to Top action
    backToTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    function updateActiveNavLink() {
        let currentSectionId = '';
        const scrollPosition = window.scrollY + 120; // offset header height

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                currentSectionId = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active');
            } else if (scrollPosition < 500 && link.getAttribute('href') === '#') {
                // If we are at the top, activate the home link
                link.classList.add('active');
            }
        });
    }

    /* ==========================================================================
       2. Mobile Navigation Drawer Toggle
       ========================================================================== */
    const menuToggle = document.getElementById('menuToggle');
    const drawerClose = document.getElementById('drawerClose');
    const mobileDrawer = document.getElementById('mobileDrawer');
    const drawerOverlay = document.getElementById('drawerOverlay');
    const drawerLinks = document.querySelectorAll('.drawer-link');

    function openDrawer() {
        mobileDrawer.classList.add('open');
        drawerOverlay.classList.add('open');
        document.body.style.overflow = 'hidden'; // Disable background scrolling
    }

    function closeDrawer() {
        mobileDrawer.classList.remove('open');
        drawerOverlay.classList.remove('open');
        document.body.style.overflow = ''; // Restore scroll
    }

    menuToggle.addEventListener('click', openDrawer);
    drawerClose.addEventListener('click', closeDrawer);
    drawerOverlay.addEventListener('click', closeDrawer);

    // Close drawer when a link is clicked
    drawerLinks.forEach(link => {
        link.addEventListener('click', closeDrawer);
    });


    /* ==========================================================================
       3. Quick Interactive Search Console
       ========================================================================== */
    const tabButtons = document.querySelectorAll('.tab-btn');
    let activeAction = 'buy'; // Default search context

    tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            tabButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            activeAction = e.target.getAttribute('data-action');
        });
    });

    const btnConsoleSearch = document.getElementById('btnConsoleSearch');
    btnConsoleSearch.addEventListener('click', () => {
        const propType = document.getElementById('consoleType').value;
        const locationVal = document.getElementById('consoleLoc').value;
        const budgetVal = document.getElementById('consoleBudget').value;

        // Visual scroll transition to Featured Projects section
        const projectsSection = document.getElementById('projects');
        projectsSection.scrollIntoView({ behavior: 'smooth' });

        // Apply filters to Featured Projects list based on selections
        filterFeaturedProjects(propType, locationVal);
    });

    function filterFeaturedProjects(type, location) {
        const cards = document.querySelectorAll('.project-card');
        let visibleCount = 0;

        cards.forEach(card => {
            const cardType = card.getAttribute('data-type');
            const cardMetaText = card.querySelector('.project-meta').innerText.toLowerCase();
            
            let matchesType = (type === 'all' || cardType === type);
            let matchesLocation = true;
            
            if (location !== 'all') {
                if (location === 'dxp') {
                    matchesLocation = cardMetaText.includes('dwarka expressway');
                } else if (location === 'new-gurgaon') {
                    // New Gurgaon covers sectors 81–92 and Sector 9 Manesar
                    matchesLocation = cardMetaText.includes('new gurgaon') ||
                                      cardMetaText.includes('sector 81') ||
                                      cardMetaText.includes('sector 82') ||
                                      cardMetaText.includes('sector 83') ||
                                      cardMetaText.includes('sector 84') ||
                                      cardMetaText.includes('sector 85') ||
                                      cardMetaText.includes('sector 88') ||
                                      cardMetaText.includes('sector 89') ||
                                      cardMetaText.includes('sector 90') ||
                                      cardMetaText.includes('sector 92') ||
                                      cardMetaText.includes('sector 9') ||
                                      cardMetaText.includes('manesar');
                } else if (location === 'spr') {
                    // SPR Road covers sectors 78–80 and SPR Road label
                    matchesLocation = cardMetaText.includes('spr road') ||
                                      cardMetaText.includes('sector 78') ||
                                      cardMetaText.includes('sector 79') ||
                                      cardMetaText.includes('sector 80');
                } else {
                    matchesLocation = cardMetaText.includes(`sector ${location}`);
                }
            }

            if (matchesType && matchesLocation) {
                card.style.display = 'flex';
                // Trigger smooth appearance
                card.style.opacity = '1';
                card.style.transform = 'scale(1)';
                visibleCount++;
            } else {
                card.style.opacity = '0';
                card.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    if (card.style.opacity === '0') {
                        card.style.display = 'none';
                    }
                }, 300);
            }
        });

        // Set 'All Projects' filter button active as reset if console search was performed
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => btn.classList.remove('active'));
        document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
    }


    /* ==========================================================================
       4. Featured Projects Filters
       ========================================================================== */
    const filterBtns = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            const filterValue = e.target.getAttribute('data-filter');

            projectCards.forEach(card => {
                const cardBuilder = card.getAttribute('data-builder');
                
                if (filterValue === 'all' || cardBuilder === filterValue) {
                    card.style.display = 'flex';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'scale(1)';
                    }, 50);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        if (card.style.opacity === '0') {
                            card.style.display = 'none';
                        }
                    }, 300);
                }
            });
        });
    });


    /* ==========================================================================
       5. Location Corridor Filter
       ========================================================================== */
    const locToggleBtns = document.querySelectorAll('.loc-toggle-btn');
    const locationCards = document.querySelectorAll('.location-card');

    locToggleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            locToggleBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            const corridorVal = e.target.getAttribute('data-corridor');

            locationCards.forEach(card => {
                const cardCorridor = card.getAttribute('data-corridor');

                if (corridorVal === 'all' || cardCorridor === corridorVal) {
                    card.style.display = 'block';
                    card.style.opacity = '1';
                } else {
                    card.style.opacity = '0';
                    setTimeout(() => {
                        if (card.style.opacity === '0') {
                            card.style.display = 'none';
                        }
                    }, 200);
                }
            });
        });
    });


    /* ==========================================================================
       6. Modals Operations (Open, Dynamic Fill, Close)
       ========================================================================== */
    const modals = document.querySelectorAll('.modal-dialog-overlay');
    const modalTriggers = document.querySelectorAll('.modal-trigger');
    const modalCloseBtns = document.querySelectorAll('.modal-close');

    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            const targetId = e.currentTarget.getAttribute('data-target');
            const modal = document.getElementById(targetId);

            if (modal) {
                modal.classList.add('open');
                document.body.style.overflow = 'hidden';

                // If it is the enquiry modal, dynamically populate the GHL iframe src with project context
                if (targetId === 'enquiry-modal') {
                    const project = e.currentTarget.getAttribute('data-project') || '';
                    const builder = e.currentTarget.getAttribute('data-builder') || '';
                    const source  = e.currentTarget.getAttribute('data-source')  || 'website';
                    const iframe  = document.getElementById('inline-nwHklUMHGDfLp7UoKtBb');
                    const loader  = document.getElementById('ghl-modal-loader');
                    if (iframe) {
                        // Hide iframe and show skeleton shimmer loader during transition
                        if (loader) loader.style.display = 'flex';
                        iframe.style.opacity = '0';

                        const baseSrc = "https://link.msgsndr.com/widget/form/nwHklUMHGDfLp7UoKtBb";
                        let params = `tag=${encodeURIComponent(source)}&source=${encodeURIComponent(source)}&Source=${encodeURIComponent(source)}&utm_source=${encodeURIComponent(source)}`;
                        if (project) {
                            params += `&project=${encodeURIComponent(project)}` +
                                      `&Project=${encodeURIComponent(project)}` +
                                      `&project_name=${encodeURIComponent(project)}` +
                                      `&Project_Name=${encodeURIComponent(project)}` +
                                      `&projectName=${encodeURIComponent(project)}` +
                                      `&ProjectName=${encodeURIComponent(project)}` +
                                      `&property=${encodeURIComponent(project)}` +
                                      `&Property=${encodeURIComponent(project)}` +
                                      `&property_name=${encodeURIComponent(project)}` +
                                      `&Property_Name=${encodeURIComponent(project)}` +
                                      `&propertyName=${encodeURIComponent(project)}` +
                                      `&PropertyName=${encodeURIComponent(project)}` +
                                      `&selected_project=${encodeURIComponent(project)}` +
                                      `&selected_property=${encodeURIComponent(project)}` +
                                      `&selectedProject=${encodeURIComponent(project)}` +
                                      `&selectedProperty=${encodeURIComponent(project)}` +
                                      `&interested_project=${encodeURIComponent(project)}` +
                                      `&interestedProject=${encodeURIComponent(project)}` +
                                      `&interested_property=${encodeURIComponent(project)}` +
                                      `&interestedProperty=${encodeURIComponent(project)}`;
                        }
                        if (builder) {
                            params += `&builder=${encodeURIComponent(builder)}` +
                                      `&Builder=${encodeURIComponent(builder)}` +
                                      `&builder_name=${encodeURIComponent(builder)}` +
                                      `&Builder_Name=${encodeURIComponent(builder)}` +
                                      `&builderName=${encodeURIComponent(builder)}` +
                                      `&BuilderName=${encodeURIComponent(builder)}` +
                                      `&selected_builder=${encodeURIComponent(builder)}` +
                                      `&selectedBuilder=${encodeURIComponent(builder)}`;
                        }

                        // Smooth transition once the new dynamic GHL form loads
                        iframe.onload = () => {
                            if (loader) loader.style.display = 'none';
                            iframe.style.opacity = '1';
                        };

                        iframe.src = `${baseSrc}?${params}`;
                    }
                }
            }
        });
    });

    function closeModal(modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }

    modalCloseBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal-dialog-overlay');
            closeModal(modal);
        });
    });

    // Close on overlay backdrop click
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal);
            }
        });
    });

    // Close on success finish button click
    const modalCloseSuccess = document.querySelector('.modal-close-success');
    if (modalCloseSuccess) {
        modalCloseSuccess.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal-dialog-overlay');
            closeModal(modal);
        });
    }


    /* ==========================================================================
       7. All leads are now captured via GHL (GoHighLevel) iframe forms.
          The old custom form handlers have been removed.
       ========================================================================== */




    /* ==========================================================================
       8. Stats Count-Up Animation
       ========================================================================== */
    const statNumbers = document.querySelectorAll('.stat-number');
    let animated = false;

    const animateStats = () => {
        statNumbers.forEach(stat => {
            const target = parseInt(stat.getAttribute('data-count'), 10);
            let count = 0;
            const speed = target / 30; // speed increments

            const counter = setInterval(() => {
                count += speed;
                if (count >= target) {
                    stat.innerText = target + '+';
                    clearInterval(counter);
                } else {
                    stat.innerText = Math.floor(count) + '+';
                }
            }, 30);
        });
    };

    // Trigger only when statistics section is in view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !animated) {
                animateStats();
                animated = true;
            }
        });
    }, { threshold: 0.5 });

    const statsSection = document.querySelector('.stats-bar-section');
    if (statsSection) {
        observer.observe(statsSection);
    }

    /* ==========================================================================
       10. GHL Iframes Initial Load Optimization (Skeleton Dismissal)
       ========================================================================== */
    const consultationIframe = document.getElementById('inline-consultation-nwHklUMHGDfLp7UoKtBb');
    const consultationLoader = document.getElementById('ghl-consultation-loader');
    if (consultationIframe) {
        consultationIframe.onload = () => {
            if (consultationLoader) consultationLoader.style.display = 'none';
            consultationIframe.style.opacity = '1';
        };
    }

    const modalIframe = document.getElementById('inline-nwHklUMHGDfLp7UoKtBb');
    const modalLoader = document.getElementById('ghl-modal-loader');
    if (modalIframe) {
        modalIframe.onload = () => {
            if (modalLoader) modalLoader.style.display = 'none';
            modalIframe.style.opacity = '1';
        };
    }
});
