document.addEventListener('DOMContentLoaded', function () {
    const root = document.querySelector('[data-services-morph]');
    if (!root || !window.gsap || !window.MorphSVGPlugin) return;

    const gsap = window.gsap;
    gsap.registerPlugin(window.MorphSVGPlugin);

    const shapes = Array.from(root.querySelectorAll('[data-morph-shape]'), function (template) {
        const paths = Array.from(template.content.querySelectorAll('path'));
        if (!paths.length) return null;
        // Compound paths preserve the separate pieces of each custom icon.
        return {
            label: template.dataset.morphLabel || '',
            d: paths.map(function (path) { return path.getAttribute('d'); }).join(' '),
            fill: paths[0].getAttribute('fill'),
            rule: paths.some(function (path) { return path.getAttribute('fill-rule') === 'evenodd'; }) ? 'evenodd' : 'nonzero'
        };
    }).filter(Boolean);
    if (shapes.length < 2) return;

    const svg = root.querySelector('[data-morph-display] svg');
    const label = root.querySelector('p[data-morph-label]');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svg.replaceChildren(path);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const hold = 1.5; // Seconds to display each icon.
    const duration = 0.8; // Seconds spent morphing between icons.
    const labelFade = Math.min(0.2, duration / 2); // Seconds for each text fade.
    const ease = 'power2.inOut';
    let visible = !('IntersectionObserver' in window);
    let timeline = null;

    function showFirstShape() {
        path.setAttribute('d', shapes[0].d);
        path.setAttribute('fill', shapes[0].fill);
        path.setAttribute('fill-rule', shapes[0].rule);
        if (label) {
            label.textContent = shapes[0].label;
            gsap.set(label, { opacity: 1 });
        }
    }

    function createTimeline() {
        const animation = gsap.timeline({ paused: true, repeat: -1 });
        shapes.forEach(function (_, index) {
            const next = shapes[(index + 1) % shapes.length];
            const start = index * (hold + duration) + hold;
            animation.to(path, {
                duration: duration,
                ease: ease,
                morphSVG: { shape: next.d, type: 'rotational', shapeIndex: 'auto' },
                fill: next.fill
            }, start);
            animation.set(path, { attr: { 'fill-rule': next.rule } }, start + duration);
            if (label) {
                animation.to(label, { opacity: 0, duration: labelFade, ease: 'power1.in' }, start);
                animation.set(label, { textContent: next.label }, start + duration - labelFade);
                animation.to(label, { opacity: 1, duration: labelFade, ease: 'power1.out' }, start + duration - labelFade);
            }
        });
        return animation;
    }

    function updatePlayback() {
        if (motion.matches) {
            if (timeline) timeline.kill();
            timeline = null;
            showFirstShape();
        } else if (visible && !document.hidden) {
            if (!timeline) timeline = createTimeline();
            timeline.play();
        } else if (timeline) {
            timeline.pause();
        }
    }

    showFirstShape();
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            visible = entries[0].isIntersecting;
            updatePlayback();
        }).observe(root);
    }
    motion.addEventListener('change', updatePlayback);
    document.addEventListener('visibilitychange', updatePlayback);
    updatePlayback();
});
