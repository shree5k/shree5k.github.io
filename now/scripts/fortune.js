(function () {
    function isTyping() {
        const tag = document.activeElement?.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA';
    }

    window.bindFortuneOpen = function ({ trigger, openRandom, isOpen }) {
        trigger.addEventListener('click', openRandom);
        window.addEventListener('keydown', (e) => {
            if (e.key !== 'f' || isOpen()) return;
            if (isTyping()) return;
            e.preventDefault();
            openRandom();
        });
    };
})();
