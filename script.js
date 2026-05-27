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
            }
        });
    });

    function closeModal(modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
        
        // Reset success state screens after closure delay
        setTimeout(() => {
            const successState = modal.querySelector('.modal-success-state');
            const form = modal.querySelector('.modal-form');
            if (successState && form) {
                successState.classList.remove('active');
                form.style.display = 'flex';
                form.reset();
            }
        }, 300);
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
       7. Lead Forms Validation, WhatsApp Routing & Web3Forms Integration
       ========================================================================== */
    
    // Config: Set your WhatsApp number (with country code, no symbols) and optional Web3Forms Key
    const CONFIG = {
        whatsappNumber: '919729255525', // Default recipient number
        web3FormsAccessKey: '' // Paste your Web3Forms access key here to receive email alerts on info@bbrealty.in
    };

    // Helper to format and redirect to WhatsApp
    function sendWhatsAppLead(data) {
        let message = `*New Lead Enquiry - BB Realty*\n\n`;
        message += `*Name:* ${data.name}\n`;
        message += `*Phone:* ${data.phone}\n`;
        message += `*Property Type:* ${data.property_type}\n`;
        message += `*Budget:* ${data.budget}\n`;
        message += `*Location:* ${data.location}\n`;
        
        if (data.project && data.project !== 'General Inquiry') {
            message += `*Project interest:* ${data.project} (by ${data.builder})\n`;
        }

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodedMessage}`;
        
        // Open WhatsApp in a new tab
        window.open(whatsappUrl, '_blank');
    }

    // Helper to send data to Web3Forms if Access Key is configured
    async function sendEmailLead(data) {
        if (!CONFIG.web3FormsAccessKey) return;

        const formData = new FormData();
        formData.append('access_key', CONFIG.web3FormsAccessKey);
        formData.append('subject', `New BB Realty Lead: ${data.name}`);
        formData.append('name', data.name);
        formData.append('phone', data.phone);
        formData.append('property_type', data.property_type);
        formData.append('budget', data.budget);
        formData.append('location', data.location);
        
        if (data.project) {
            formData.append('selected_project', data.project);
            formData.append('selected_builder', data.builder);
        }

        try {
            await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                body: formData
            });
            console.log('Lead emailed successfully via Web3Forms');
        } catch (error) {
            console.error('Error sending email lead:', error);
        }
    }
    
    // Bottom Lead Form
    const leadForm = document.getElementById('leadForm');
    const formSuccessState = document.getElementById('formSuccessState');
    const btnResetForm = document.getElementById('btnResetForm');

    leadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = leadForm.querySelector('.btn-submit');
        submitBtn.innerText = 'Routing Lead...';
        submitBtn.disabled = true;

        const leadData = {
            name: document.getElementById('formName').value,
            phone: document.getElementById('formPhone').value,
            property_type: document.getElementById('formProperty').value,
            budget: document.getElementById('formBudget').value,
            location: document.getElementById('formLocation').value,
            project: 'General Inquiry',
            builder: 'BB Realty'
        };

        // Send Email notifications if API key is configured
        await sendEmailLead(leadData);

        // Open WhatsApp chat prefilled with info
        sendWhatsAppLead(leadData);

        setTimeout(() => {
            leadForm.style.display = 'none';
            formSuccessState.classList.add('active');
            
            submitBtn.innerText = 'Request Callback';
            submitBtn.disabled = false;
        }, 1000);
    });

    btnResetForm.addEventListener('click', () => {
        formSuccessState.classList.remove('active');
        leadForm.style.display = 'flex';
        leadForm.reset();
    });




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
});
