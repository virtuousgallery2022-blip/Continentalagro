const header = document.querySelector("[data-header]");
const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector("[data-nav]");
const navLinks = document.querySelectorAll(".site-nav a");
const siteFooter = document.querySelector(".site-footer");
const form = document.querySelector("#contactForm");
const statusText = document.querySelector("#formStatus");
const loader = document.querySelector("[data-loader]");
const slides = [...document.querySelectorAll(".hero-slide")];
const slideButtons = [...document.querySelectorAll("[data-slide]")];
const revealItems = [...document.querySelectorAll(".reveal")];
const galleryButtons = [...document.querySelectorAll("[data-gallery]")];
const lightbox = document.querySelector("[data-lightbox]");
const lightboxImage = document.querySelector("[data-lightbox-image]");
const lightboxClose = document.querySelector("[data-lightbox-close]");
const accordionButtons = [...document.querySelectorAll("[data-accordion-trigger]")];

if (siteFooter) {
  siteFooter.innerHTML = `
    <div class="footer-watermark" aria-hidden="true">
      <img src="assets/brand-mark-clean.png" alt="" />
      <span>Continental</span>
    </div>
    <div class="container footer-grid">
      <div class="footer-contact">
        <div class="footer-line">
          <span class="footer-icon">OFF</span>
          <p><strong>Plant & Office</strong>Mohanpur Japti, Puranpur<br />District Pilibhit, Uttar Pradesh - 262122</p>
        </div>
        <div class="footer-line">
          <span class="footer-icon">TEL</span>
          <p><strong>Helpline</strong><a href="tel:18001202845">1800 120 2845</a></p>
        </div>
        <div class="footer-line">
          <span class="footer-icon">MAIL</span>
          <p><strong>Email</strong><a href="mailto:Customerservices@continentalagro.com">Customerservices@continentalagro.com</a></p>
        </div>
        <div class="footer-line">
          <span class="footer-icon">HRS</span>
          <p><strong>Working Hours</strong>Mon - Sat: 9:30 AM - 6:00 PM</p>
        </div>
      </div>

      <div class="footer-column">
        <strong>Products</strong>
        <a href="products.html">Wheat Seeds</a>
        <a href="products.html#future">Future Categories</a>
        <a href="products.html">40 kg Seed Pack</a>
      </div>

      <div class="footer-column">
        <strong>Sales</strong>
        <a href="distribution.html">Dealer Network</a>
        <a href="distribution.html">Bulk Supply</a>
        <a href="contact.html">International Enquiry</a>
      </div>

      <div class="footer-column">
        <strong>Resources</strong>
        <a href="research.html">Research & Quality</a>
        <a href="production.html">Production Flow</a>
        <a href="gallery.html">Plant Gallery</a>
      </div>

      <div class="footer-column">
        <strong>Quick Links</strong>
        <a href="about.html">About Us</a>
        <a href="contact.html">Contact Us</a>
        <a href="contact.html">Careers / Enquiry</a>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="container footer-bottom-inner">
        <p>&copy; <span id="year"></span> Continental Agro Tarai Seeds | All Rights Reserved</p>
        <div class="footer-social" aria-label="Quick contact links">
          <a href="mailto:Customerservices@continentalagro.com" aria-label="Email Continental Agro">mail</a>
          <a href="tel:18001202845" aria-label="Call Continental Agro">call</a>
          <a href="contact.html" aria-label="Open enquiry form">enq</a>
        </div>
      </div>
    </div>
    <a class="back-to-top" href="#" aria-label="Back to top">&#8593;</a>
  `;
}

const year = document.querySelector("#year");

let activeSlide = 0;
let slideTimer;

document.body.classList.add("is-loading");
if (year) year.textContent = new Date().getFullYear();

window.addEventListener("load", () => {
  window.setTimeout(() => {
    loader?.classList.add("is-hidden");
    document.body.classList.remove("is-loading");
  }, 350);
});

function updateHeader() {
  header?.classList.toggle("is-scrolled", window.scrollY > 26);
}

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

navToggle?.addEventListener("click", () => {
  const isOpen = header.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

navLinks.forEach((link) => {
  const pageName = window.location.pathname.split("/").pop() || "index.html";
  if (link.getAttribute("href") === pageName) link.classList.add("is-active");
  link.addEventListener("click", () => {
    header?.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

accordionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const item = button.closest(".accordion-item");
    const list = button.closest(".accordion-list");
    if (!item || !list) return;

    list.querySelectorAll(".accordion-item").forEach((entry) => {
      if (entry !== item) entry.classList.remove("is-open");
    });

    item.classList.toggle("is-open");
  });
});

function showSlide(index) {
  if (!slides.length) return;
  activeSlide = (index + slides.length) % slides.length;
  slides.forEach((slide, slideIndex) => slide.classList.toggle("is-active", slideIndex === activeSlide));
  slideButtons.forEach((button, buttonIndex) => button.classList.toggle("is-active", buttonIndex === activeSlide));
}

function startHeroSlider() {
  if (!slides.length) return;
  window.clearInterval(slideTimer);
  slideTimer = window.setInterval(() => showSlide(activeSlide + 1), 5200);
}

slideButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showSlide(Number(button.dataset.slide));
    startHeroSlider();
  });
});
startHeroSlider();

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.14, rootMargin: "0px 0px -34px 0px" }
);

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index % 5, 4) * 0.07}s`;
  revealObserver.observe(item);
});

galleryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!lightbox || !lightboxImage) return;
    const image = button.querySelector("img");
    lightboxImage.src = button.dataset.gallery;
    lightboxImage.alt = image?.alt || "";
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
  });
});

function closeLightbox() {
  lightbox?.classList.remove("is-open");
  lightbox?.setAttribute("aria-hidden", "true");
}

lightboxClose?.addEventListener("click", closeLightbox);
lightbox?.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && lightbox?.classList.contains("is-open")) closeLightbox();
});

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const name = formData.get("name").trim();
  const phone = formData.get("phone").trim();
  const email = formData.get("email").trim();
  const location = formData.get("location").trim();
  const enquiryType = formData.get("enquiryType").trim();
  const message = formData.get("message").trim();

  statusText?.classList.remove("error");
  if (!name || !phone || !email || !location || !enquiryType || !message) {
    statusText.textContent = "Please complete all fields before sending your enquiry.";
    statusText.classList.add("error");
    return;
  }

  const subject = `New ${enquiryType} enquiry from ${name}`;
  const body = [
    "Hello Continental Agro Tarai Seeds team,",
    "",
    "I am interested in discussing the following enquiry:",
    "",
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Email: ${email}`,
    `City / Country: ${location}`,
    `Enquiry Type: ${enquiryType}`,
    "",
    "Message:",
    message,
    "",
    "Regards,",
    name
  ].join("\n");

  statusText.textContent = "Opening your email app with a ready-to-send enquiry.";
  window.location.href = `mailto:Customerservices@continentalagro.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
