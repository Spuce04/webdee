/*window.adjustNavOpacity = function () {
    const navbar = document.getElementById('headerNavbar');
    if (!navbar) return;

    const maxScroll = 100;

    const opacity = Math.min(window.scrollY / maxScroll, 1);
    console.log(opacity.toString());
    navbar.style.backgroundColor = `rgba(var(--main-bg-color-rgb), ${opacity})`;
}*/

document.addEventListener('DOMContentLoaded', function () {

    // Target the collapsible div, not the whole nav
    const menu = document.getElementById('navbarSupportedContent');
    const navbar = document.querySelector('.navbar');

    if (menu) {
        menu.addEventListener('show.bs.collapse', function () {
            navbar.classList.add('bg-main');
            console.log('Navbar background added');
        });

        menu.addEventListener('hidden.bs.collapse', function () {
            navbar.classList.remove('bg-main');
            console.log('Navbar background removed');
        });
    }
    else {
        console.warn('Navbar menu element not found');
    }


    // 1. Initial run to set the header's starting opacity based on current scroll position (0)
    adjustNavOpacity();

    // 2. Set up the scroll listener for future changes
    window.addEventListener('scroll', adjustNavOpacity);
});
