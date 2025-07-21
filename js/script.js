function toggleMobileMenu() {
    const navLinks = document.getElementById('navLinks');
    navLinks.classList.toggle('active');
}

// Close mobile menu when clicking outside
document.addEventListener('click', function(event) {
    const nav = document.querySelector('.nav');
    const navLinks = document.getElementById('navLinks');
    
    // Check if the clicked element is outside the nav and the navLinks are open
    if (!nav.contains(event.target) && navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
    }
});

// Smooth scrolling for anchor links (only applies to index.html internal links)
document.addEventListener('click', function(event) {
    // Check if the clicked element is an anchor tag and its href starts with '#'
    if (event.target.tagName === 'A' && event.target.getAttribute('href') && event.target.getAttribute('href').startsWith('#')) {
        // Prevent default anchor behavior
        event.preventDefault();
        
        // Get the target element's ID from the href
        const targetId = event.target.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        
        // If the target element exists, scroll to it smoothly
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth' });
        }
    }
});