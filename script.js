import { triggerStaggeredAnimation } from '/module-scripts/animations.js';
import { setupExternalLinks } from '/module-scripts/externalLinks.js';
import { setupHoverEffect } from '/module-scripts/hoverEffect.js';

let projectsContainer = null;

async function fetchData(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load data from ${url}.`);
    return await response.json();
}

async function fetchText(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load text from ${url}.`);
    return await response.text();
}

function displayMessage(container, message) {
    container.innerHTML = `<div class="error-message">${message}</div>`;
}

function renderProjects(data) {
    const fragment = document.createDocumentFragment();
    
    data.projects.forEach((repo, index) => {
        const projectWrapper = document.createElement('div');
        projectWrapper.className = 'project-item-wrapper animated-item';

        const line = document.createElement('span');
        line.className = 'project-line';

        const number = document.createElement('span');
        number.className = 'project-number';
        number.textContent = String(index + 1).padStart(2, '0');

        const topicLink = document.createElement('a');
        topicLink.className = 'topic-item hover-effect';
        topicLink.href = repo.link;
        topicLink.target = repo.openInNewTab ? '_blank' : '_self';
        topicLink.textContent = repo.name;

        if (repo.images) {
            repo.images.forEach((imgSrc) => {
                const imgElement = document.createElement('img');
                imgElement.src = imgSrc;
                imgElement.className = 'hover-image projects-hover-image-width';
                imgElement.alt = `${repo.name} icon`;
                topicLink.appendChild(imgElement);
            });
        }
        
        projectWrapper.appendChild(topicLink);
        projectWrapper.appendChild(line);
        projectWrapper.appendChild(number);

        fragment.appendChild(projectWrapper);
    });

    projectsContainer.innerHTML = '';
    projectsContainer.appendChild(fragment);
    setupHoverEffect(projectsContainer);
}

async function fetchProjects() {
    projectsContainer = document.getElementById('projects-container');

    try {
        const data = await fetchData('data.json');

        if (!data || !data.projects || data.projects.length === 0) {
            displayMessage(projectsContainer, 'No projects found.');
            return;
        }

        renderProjects(data);
    } catch (error) {
        console.error('Error fetching data:', error);
        displayMessage(projectsContainer, error.message);
    }
}

async function loadIntroContainer() {
    const introPlaceholder = document.getElementById('intro-placeholder');
    try {
        const introHTML = await fetchText('/module-views/introContainer.html');
        introPlaceholder.innerHTML = introHTML;
    } catch (error) {
        console.error('Error loading intro container:', error);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const contentLoadingPromises = [
        loadIntroContainer(),
        fetchProjects(),
        setupExternalLinks(setupHoverEffect)
    ];

    await Promise.all(contentLoadingPromises);

    triggerStaggeredAnimation();
});