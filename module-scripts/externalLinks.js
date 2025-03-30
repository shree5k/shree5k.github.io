export async function setupExternalLinks(setupHoverEffect) {
    const externalLinksContainer = document.getElementById('external-links-container');
    
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('Failed to load data');
        const data = await response.json();
        
        if (!data || !data.externalLinks || data.externalLinks.length === 0) {
            console.error('No external links found in data');
            return;
        }

        externalLinksContainer.innerHTML = '';

        data.externalLinks.forEach(link => {
            const linkElement = document.createElement('a');
            linkElement.href = link.link;
            linkElement.target = '_blank';
            linkElement.className = 'topic-item hover-effect';
            linkElement.textContent = link.name;

            link.images.forEach((imgSrc) => {
                const imgElement = document.createElement('img');
                imgElement.src = imgSrc;
                imgElement.className = 'hover-image';
                imgElement.alt = `${link.name} icon`;
                linkElement.appendChild(imgElement);
            });

            externalLinksContainer.appendChild(linkElement);
        });
        
        setupHoverEffect(externalLinksContainer);
    } catch (error) {
        console.error('Error loading external links:', error);
    }
}