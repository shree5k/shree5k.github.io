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

function preloadLogo() {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load logo image'));
        img.src = 'assets/logo.png';
    });
}

function displayMessage(container, message) {
    container.innerHTML = `<div class="error-message">${message}</div>`;
}

function renderProjects(data) {
    const fragment = document.createDocumentFragment();
    
    data.projects.forEach(repo => {
        const topicLink = document.createElement('a');
        topicLink.className = 'topic-item hover-effect';
        topicLink.href = repo.link;
        topicLink.target = repo.openInNewTab ? '_blank' : '_self';
        topicLink.textContent = repo.name;

        // Add project images from the images array
        if (repo.images) {
            repo.images.forEach((imgSrc) => {
                const imgElement = document.createElement('img');
                imgElement.src = imgSrc;
                imgElement.className = 'hover-image projects-hover-image-width';
                imgElement.alt = `${repo.name} icon`;
                topicLink.appendChild(imgElement);
            });
        }

        fragment.appendChild(topicLink);
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

async function initializePage() {
    try {
        await preloadLogo();
        
        await loadIntroContainer();
        await fetchProjects();
        setupExternalLinks(setupHoverEffect);
    } catch (error) {
        console.error('Error during page initialization:', error);
        await loadIntroContainer();
        await fetchProjects();
        setupExternalLinks(setupHoverEffect);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializePage();
});