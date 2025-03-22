let showTagIds = false;
let projectsContainer = null;
let externalLinksContainer = null;

function setupHoverEffect(container) {
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

async function fetchProjects() {
    projectsContainer = document.getElementById('projects-container');

    try {
        const reposResponse = await fetch('data.json');
        
        if (!reposResponse.ok) throw new Error('Failed to load repository data.');
        
        const repos = await reposResponse.json();
        
        if (!repos || repos.length === 0) {
            projectsContainer.innerHTML = '<div class="error-message">No repositories found.</div>';
            return;
        }
        
        projectsContainer.innerHTML = '';
        
        repos.forEach(repo => {
            const topicLink = document.createElement('a');
            topicLink.href = repo.link;
            topicLink.target = '_blank';
            topicLink.className = 'topic-item';
            topicLink.textContent = repo.name;
            
            projectsContainer.appendChild(topicLink);
        });
        
        setupHoverEffect(projectsContainer);
    } catch (error) {
        console.error('Error fetching repositories:', error);
        projectsContainer.innerHTML = `<div class="error-message">${error.message}</div>`;
    }
}

function setupExternalLinks() {
    externalLinksContainer = document.getElementById('external-links-container');
    
    const externalLinks = [
        {
            name: "Layers",
            link: "https://layers.to/shreeramk",
            images: ["assets/work/work-1.png", "assets/work/work-2.png", "assets/work/work-3.png"]
        },
        {
            name: "Twitter/X",
            link: "https://x.com/shree5k",
            images: ["assets/work/twitter-1.png", "assets/work/twitter-2.png"]
        },
        {
            name: "GitHub",
            link: "https://github.com/shree5k",
            images: ["assets/work/github-2.png", "assets/work/github-1.png"]
        }
    ];
    
    externalLinksContainer.innerHTML = '';

    externalLinks.forEach(link => {
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
}

function populateGallery() {
    const galleryGrid = document.querySelector('.gallery-grid');
    if (!galleryGrid) return;
    
    const imageCount = 9;

    for (let i = 1; i <= imageCount; i++) {
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        
        const img = document.createElement('img');
        img.src = `assets/work/${i}.png`;
        img.alt = `Work sample ${i}`;
        img.loading = 'lazy';
        
        galleryItem.appendChild(img);
        galleryGrid.appendChild(galleryItem);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchProjects();
    setupExternalLinks();
    populateGallery();
});