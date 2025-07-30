export function setupHoverEffect(container) {
    const items = container.querySelectorAll('.topic-item');
    let hoverBackground = container.querySelector('.hover-bg');

    if (!hoverBackground) {
        hoverBackground = document.createElement('div');
        hoverBackground.className = 'hover-bg';
        container.appendChild(hoverBackground);
    }

    function moveBackground(item) {
        const { offsetTop, offsetHeight, offsetWidth, offsetLeft } = item;
        hoverBackground.style.top = offsetTop + 1 + 'px';
        hoverBackground.style.left = offsetLeft + -8 + 'px';
        hoverBackground.style.width = offsetWidth + 'px';
        hoverBackground.style.height = offsetHeight + 'px';
        hoverBackground.style.opacity = '1';
        hoverBackground.style.zIndex = '-1';
    }

    function hideBackground() {
        hoverBackground.style.opacity = '0';
    }

    items.forEach(item => {
        item.addEventListener('mouseenter', () => moveBackground(item));
        item.addEventListener('mouseleave', () => hideBackground());
    });
}