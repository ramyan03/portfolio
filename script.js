function toggleMenu() {
    const menu = document.querySelector(".menu-links");
    const icon = document.querySelector(".hamburger-icon");
    menu.classList.toggle("open");
    icon.classList.toggle("open");
}

// Reveal sections on scroll
const observer = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
            }
        });
    },
    { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
);

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

// Close mobile menu on outside click
document.addEventListener("click", (e) => {
    const nav = document.getElementById("hamburger-nav");
    if (nav && !nav.contains(e.target)) {
        document.querySelector(".menu-links")?.classList.remove("open");
        document.querySelector(".hamburger-icon")?.classList.remove("open");
    }
});
