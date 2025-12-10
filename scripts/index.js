// Dark mode default
document.body.classList.add('dark');

// Dark mode toggle
const toggleBtn = document.getElementById('darkModeBtn');
toggleBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  const icon = toggleBtn.querySelector('i');
  icon.classList.toggle('fa-lightbulb');
  icon.classList.toggle('fa-moon');
  // Switch logo based on mode
  const brandLogo = document.getElementById('brandLogo');
  if (document.body.classList.contains('dark')) {
    brandLogo.src = 'images/stumps_circle_dark.png';
  } else {
    brandLogo.src = 'images/stumps_circle_light.png';
  }
});

// Session type toggle
const toggleContainer = document.getElementById('sessionTypeToggle');
const options = toggleContainer.querySelectorAll('.toggle-option');
options.forEach(opt => {
  opt.addEventListener('click', () => {
    options.forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
  });
});

// Side tray controls
const menuBtn = document.getElementById('menuBtn');
const closeTray = document.getElementById('closeTray');
const sideTray = document.getElementById('sideTray');
const homeBtn = document.getElementById('homeBtn');
const contactBtn = document.getElementById('contactBtn');
const bookBtn = document.getElementById('bookBtn');

menuBtn.addEventListener('click', () => {
  sideTray.classList.add('open');
});
closeTray.addEventListener('click', () => {
  sideTray.classList.remove('open');
});
homeBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  sideTray.classList.remove('open');
});
contactBtn.addEventListener('click', () => {
  document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
  sideTray.classList.remove('open');
});

// Shared open/close modal functions
const bookingModal = document.getElementById('bookingModal');
const modalOverlay = document.getElementById('modalOverlay');
function openModal() {
  bookingModal.style.display = 'flex';
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    bookingModal.classList.add('open');
  });
  sideTray.classList.remove('open');
}
function closeModal() {
  bookingModal.classList.remove('open');
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
  bookingModal.addEventListener('transitionend', () => {
    bookingModal.style.display = 'none';
  }, {once: true});
}
bookBtn.addEventListener('click', openModal);

// Carousel book button
const carouselBookBtn = document.getElementById('carouselBookBtn');
carouselBookBtn.addEventListener('click', openModal);

// Close booking
const closeBooking = document.getElementById('closeBooking');
closeBooking.addEventListener('click', closeModal);

// Optional: Close on overlay click
modalOverlay.addEventListener('click', closeModal);

// Carousel auto progress + dot controls
const slides = document.querySelectorAll('.carousel-slide');
const dots = document.querySelectorAll('.dot');
let currentSlide = 0;
let interval;
function showSlide(n) {
  slides[currentSlide].classList.remove('active');
  dots[currentSlide].classList.remove('active');
  currentSlide = (n + slides.length) % slides.length;
  slides[currentSlide].classList.add('active');
  dots[currentSlide].classList.add('active');
}
function startInterval() {
  interval = setInterval(() => showSlide(currentSlide + 1), 5000);
}

// Initial start
startInterval();

// Dot click
dots.forEach((dot, i) => {
  dot.addEventListener('click', () => {
    clearInterval(interval);
    showSlide(i);
    startInterval();
  });
});

// Restart interval on any interaction with carousel
document.querySelector('.carousel').addEventListener('click', () => {
  clearInterval(interval);
  startInterval();
});