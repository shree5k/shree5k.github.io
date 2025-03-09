let showTagIds = false;
let hoverBackground = null;
let projectsContainer = null;
let projectItems = null;

async function fetchRepositoryTopics() {
    projectsContainer = document.getElementById('projects-container');
    const toggleIcon = document.getElementById('display-toggle');

    function moveBackground(item) {
        const { offsetTop, offsetHeight, offsetWidth, offsetLeft } = item;
        hoverBackground.style.top = offsetTop + 'px';
        hoverBackground.style.left = offsetLeft + -8 + 'px';
        hoverBackground.style.width = offsetWidth + 'px';
        hoverBackground.style.height = offsetHeight + 'px';
        hoverBackground.style.opacity = '1';
        hoverBackground.style.zIndex = '-1';
    }

    function hideBackground() {
        hoverBackground.style.opacity = '0';
    }

    try {
        const reposResponse = await fetch('data.json');

        if (!reposResponse.ok) throw new Error('Failed to load repository data.');

        const repos = await reposResponse.json();

        if (!repos || repos.length === 0) {
            projectsContainer.innerHTML = '<div class="error-message">No repositories found.</div>';
            return;
        }

        function updateDisplay() {
            projectsContainer.innerHTML = '';

            repos.forEach(repo => {
                const topicLink = document.createElement('a');
                topicLink.href = repo.link;
                topicLink.target = '_blank';
                topicLink.className = 'topic-item';
                topicLink.textContent = showTagIds ? repo.tag_id : repo.name;
                topicLink.addEventListener('mouseenter', () => moveBackground(topicLink));
                topicLink.addEventListener('mouseleave', () => hideBackground());

                projectsContainer.appendChild(topicLink);
            });

            toggleIcon.src = showTagIds ? 'assets/icons/eye-closed.svg' : 'assets/icons/eye.svg';

            setupHoverEffect();
        }

        updateDisplay();

        toggleIcon.addEventListener('click', () => {
            showTagIds = !showTagIds;
            updateDisplay();
        });

    } catch (error) {
        console.error('Error fetching repositories:', error);
        projectsContainer.innerHTML = `<div class="error-message">${error.message}</div>`;
    }
}

function setupHoverEffect() {
    projectItems = document.querySelectorAll('.topic-item');

    if (!hoverBackground) {
        hoverBackground = document.createElement('div');
        hoverBackground.className = 'projects-hover-bg';
        projectsContainer.appendChild(hoverBackground);
    }

    projectItems.forEach(item => {
        item.addEventListener('mouseenter', () => moveBackground(item));
        item.addEventListener('mouseleave', () => hideBackground());
    });
}

function populateGallery() {
    const galleryGrid = document.querySelector('.gallery-grid');
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
    fetchRepositoryTopics();
    populateGallery();
});