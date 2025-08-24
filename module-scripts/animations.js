export function triggerStaggeredAnimation() {
    const items = document.querySelectorAll('.animated-item');
    const staggerDelay = 100; 

    items.forEach((item, index) => {
        setTimeout(() => {
            item.classList.add('visible');
        }, index * staggerDelay);
    });
}