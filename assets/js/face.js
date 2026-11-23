
document.addEventListener("DOMContentLoaded", () => {
    const svg = document.querySelector(".face-logo svg");
    if (!svg) return;

    const eyes = [
        {
            pupil: svg.querySelector("#left-pupil"),
            shape: svg.querySelector("#left-eye"),
            x: 11.5,
            y: 18.5
        },
        {
            pupil: svg.querySelector("#right-pupil"),
            shape: svg.querySelector("#right-eye"),
            x: 36.5,
            y: 18.5
        }
    ];

    const maxMovement = 2;
    const sensitivity = 0.08;
    const smoothing = 0.12;

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    // Clip pupils to the exact white eye shapes.
    const defs = document.createElementNS(
        "http://www.w3.org/2000/svg", "defs"
    );

    eyes.forEach((eye, index) => {
        const clip = document.createElementNS(
            "http://www.w3.org/2000/svg", "clipPath"
        );

        clip.id = `face-eye-clip-${index}`;
        clip.setAttribute("clipPathUnits", "userSpaceOnUse");

        const shape = eye.shape.cloneNode(true);
        shape.removeAttribute("id");
        clip.appendChild(shape);
        defs.appendChild(clip);

        eye.pupil.setAttribute(
            "clip-path", `url(#${clip.id})`
        );

        eye.currentX = 0;
        eye.currentY = 0;
        eye.targetX = 0;
        eye.targetY = 0;
    });

    svg.insertBefore(defs, svg.firstChild);

    // Convert screen coordinates into SVG coordinates.

    function lookAt(clientX, clientY) {
        if (reducedMotion) return;

        const matrix = svg.getScreenCTM();
        if (!matrix) return;

        const point = new DOMPoint(
            clientX,
            clientY
        ).matrixTransform(matrix.inverse());

        eyes.forEach((eye) => {
            const dx = point.x - eye.x;
            const dy = point.y - eye.y;
            const distance = Math.hypot(dx, dy);

            const movement = Math.min(
                distance * sensitivity,
                maxMovement
            );

            const angle = Math.atan2(dy, dx);

            eye.targetX = Math.cos(angle) * movement;
            eye.targetY = Math.sin(angle) * movement;
        });
    }

    // Desktop: follow the mouse
    document.addEventListener("pointermove", (event) => {
        if (event.pointerType === "mouse" ||
            event.pointerType === "pen") {
            lookAt(event.clientX, event.clientY);
        }
    });

    // Mobile: look wherever the screen is touched
    document.addEventListener("pointerdown", (event) => {
        lookAt(event.clientX, event.clientY);
    });

    // Mobile: follow the finger while touching the screen
    document.addEventListener("touchmove", (event) => {
        const touch = event.touches[0];
        if (!touch) return;

        lookAt(touch.clientX, touch.clientY);
    }, { passive: true });


    function animate() {
        eyes.forEach((eye) => {
            eye.currentX +=
                (eye.targetX - eye.currentX) * smoothing;

            eye.currentY +=
                (eye.targetY - eye.currentY) * smoothing;

            eye.pupil.setAttribute(
                "transform",
                `translate(${eye.currentX} ${eye.currentY})`
            );
        });

        requestAnimationFrame(animate);
    }

    if (!reducedMotion) {
        animate();
    }
    // --- BLINKING ---

    const svgNS = "http://www.w3.org/2000/svg";

    const blinkDuration = 160;
    const minBlinkDelay = 2000;
    const maxBlinkDelay = 6000;


    const eyelids = eyes.map((eye, index) => {
        const bounds = eye.shape.getBBox();

        // Create a group clipped to the eye shape.
        const group = document.createElementNS(svgNS, "g");

        group.setAttribute(
            "clip-path",
            `url(#face-eye-clip-${index})`
        );

        // Create the moving eyelid inside the group.
        const eyelid = document.createElementNS(svgNS, "rect");

        eyelid.setAttribute("x", bounds.x);
        eyelid.setAttribute("y", bounds.y);
        eyelid.setAttribute("width", bounds.width);
        eyelid.setAttribute("height", bounds.height);

        eyelid.setAttribute(
            "fill",
            index === 0 ? "#02C3E6" : "#FD645E"
        );

        // Start above the visible eye.
        eyelid.setAttribute(
            "transform",
            `translate(0 ${-bounds.height})`
        );

        group.appendChild(eyelid);

        // Add the clipped group above the pupils.
        eye.pupil.parentNode.appendChild(group);

        return {
            element: eyelid,
            height: bounds.height
        };
    });



    function blink() {
        if (reducedMotion) return;

        const start = performance.now();

        function animateBlink(now) {
            const progress = Math.min(
                (now - start) / blinkDuration,
                1
            );

            // 0 → 1 → 0
            const closed = Math.sin(progress * Math.PI);

            eyelids.forEach(({ element, height }) => {
                const offset = -height * (1 - closed);

                element.setAttribute(
                    "transform",
                    `translate(0 ${offset})`
                );
            });

            if (progress < 1) {
                requestAnimationFrame(animateBlink);
            }
        }

        requestAnimationFrame(animateBlink);
    }


    function scheduleBlink() {
        const delay = minBlinkDelay +
            Math.random() * (maxBlinkDelay - minBlinkDelay);

        setTimeout(() => {
            blink();

            // 15% chance of a double blink.
            if (Math.random() < 0.15) {
                setTimeout(blink, 230);
            }

            scheduleBlink();
        }, delay);
    }

    if (!reducedMotion) {
        // First blink at 0.5 seconds
        setTimeout(blink, 500);

        // Second blink at 1 second
        setTimeout(() => {
            blink();

            // Start random blinking after the second blink
            scheduleBlink();
        }, 1000);
    }
});


