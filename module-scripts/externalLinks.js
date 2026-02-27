export function setupExternalLinks(data, setupHoverEffect) {
    const externalLinksContainer = document.getElementById('external-links-container');

    if (!data || !data.externalLinks || data.externalLinks.length === 0) {
        console.error('No external links found in data');
        return;
    }

    externalLinksContainer.innerHTML = '';
    externalLinksContainer.classList.add('links-row');

    data.externalLinks.forEach((link, index) => {
        const linkElement = document.createElement('a');
        linkElement.href = link.link;
        const shouldOpenInNewTab = link.openInNewTab ?? true;
        linkElement.target = shouldOpenInNewTab ? '_blank' : '_self';
        linkElement.className = 'topic-item hover-effect animated-item';
        const num = String(index + 1).padStart(2, '0');
        const numSpan = document.createElement('span');
        numSpan.className = 'project-number';
        numSpan.textContent = `[${num}]`;
        numSpan.style.marginRight = '2px';
        linkElement.appendChild(numSpan);
        linkElement.appendChild(document.createTextNode(link.name));

        link.images.forEach((imgSrc) => {
            const imgElement = document.createElement('img');
            imgElement.src = imgSrc;
            imgElement.className = 'hover-image';
            imgElement.alt = `${link.name} icon`;
            imgElement.loading = 'lazy';
            imgElement.decoding = 'async';
            linkElement.appendChild(imgElement);
        });

        externalLinksContainer.appendChild(linkElement);
    });

    setupHoverEffect(externalLinksContainer);
}