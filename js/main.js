function ToggleNav(){
    document.getElementById('nav-list').classList.toggle('hidden'); 
    document.getElementById('nav-list').classList.toggle('flex');
    document.getElementById('nav-backdrop').classList.toggle('hidden');

    const iconUpper = document.getElementById('icon-upper');
    const iconMiddle = document.getElementById('icon-middle');
    const iconLower = document.getElementById('icon-lower');

    iconUpper.classList.toggle('top-0');
    iconUpper.classList.toggle('rotate-45');
    iconUpper.classList.toggle('top-1/2');
    iconUpper.classList.toggle('-translate-y-1/2');

    iconMiddle.classList.toggle('opacity-0');
    iconMiddle.classList.toggle('opacity-100');

    iconLower.classList.toggle('bottom-0');
    iconLower.classList.toggle('-rotate-45');
    iconLower.classList.toggle('top-1/2');
    iconLower.classList.toggle('-translate-y-1/2');
}

if ('ontouchstart' in window) {
    document.addEventListener('touchstart', e => {
      const hovered = document.querySelector(':hover');
      // If something is hovered and the touch isn't on it or its children
      if (hovered && !hovered.contains(e.target)) {
        hovered.style.pointerEvents = 'none';
        // Force layout flush so browser drops the hover state
        void hovered.offsetHeight;
        hovered.style.pointerEvents = '';
      }
    }, {passive: true});
  }