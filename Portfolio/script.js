/**
 * Portfolio - Staggered Card Animation
 * Uses Intersection Observer for scroll-triggered animations
 */

document.addEventListener('DOMContentLoaded', () => {
    initCardAnimations();
});

/**
 * Initialize card entrance animations with stagger effect
 */
function initCardAnimations() {
    const cards = document.querySelectorAll('.card');

    // Intersection Observer configuration
    const observerOptions = {
        root: null, // viewport
        rootMargin: '0px 0px -50px 0px', // trigger slightly before fully visible
        threshold: 0.1 // 10% visible
    };

    // Create observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const card = entry.target;
                const delay = parseInt(card.dataset.delay) || 0;

                // Apply staggered delay
                setTimeout(() => {
                    card.classList.add('visible');
                }, delay);

                // Stop observing once animated
                observer.unobserve(card);
            }
        });
    }, observerOptions);

    // Observe all cards
    cards.forEach((card) => {
        observer.observe(card);
    });
}

/**
 * Smooth scroll for navigation links
 */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

/**
 * Header background on scroll
 */
let lastScrollY = 0;
const header = document.querySelector('.header');

window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;

    if (currentScrollY > 100) {
        header.style.borderBottomColor = 'rgba(210, 210, 215, 1)';
    } else {
        header.style.borderBottomColor = 'rgba(210, 210, 215, 0.5)';
    }

    lastScrollY = currentScrollY;
}, { passive: true });

/**
 * QR Code Modal
 */
const qrcodeModal = document.getElementById('qrcodeModal');
const gzhLink = document.getElementById('gzhLink');
const qrcodeClose = document.getElementById('qrcodeClose');

if (gzhLink && qrcodeModal) {
    gzhLink.addEventListener('click', () => {
        qrcodeModal.classList.add('show');
    });

    qrcodeClose.addEventListener('click', () => {
        qrcodeModal.classList.remove('show');
    });

    qrcodeModal.addEventListener('click', (e) => {
        if (e.target === qrcodeModal) {
            qrcodeModal.classList.remove('show');
        }
    });
}
