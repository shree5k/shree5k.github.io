import { triggerStaggeredAnimation } from '/module-scripts/animations.js';
import { setupExternalLinks } from '/module-scripts/externalLinks.js';
import { setupHoverEffect } from '/module-scripts/hoverEffect.js';

let projectsContainer = null;
let workArticlesContainer = null;

async function fetchData(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load data from ${url}.`);
    return await response.json();
}

function displayMessage(container, message) {
    container.innerHTML = `<div class="error-message">${message}</div>`;
}

function renderLayersGallery(data) {
    const gallery = document.getElementById('layers-gallery');
    if (!gallery || !data.layersGallery) return;

    const link = document.createElement('a');
    link.href = data.layersGallery.link;
    link.className = 'layers-gallery-link';

    data.layersGallery.images.forEach((imgSrc) => {
        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = 'Layers';
        img.decoding = 'async';
        link.appendChild(img);
    });

    gallery.appendChild(link);
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
                imgElement.loading = 'lazy';
                imgElement.decoding = 'async';
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

function renderWorkArticles(data) {
    if (!workArticlesContainer) return;

    const fragment = document.createDocumentFragment();

    data.articles.forEach((article) => {
        const articleWrapper = document.createElement('div');
        articleWrapper.className = 'project-item-wrapper animated-item';

        const line = document.createElement('span');
        line.className = 'project-line';

        const date = document.createElement('span');
        date.className = 'article-date';
        const [year, month] = String(article.date || '').split('-');
        date.textContent = year && month ? `${month}/${year.slice(-2)}` : '';

        const articleLink = document.createElement('a');
        articleLink.className = 'topic-item';
        articleLink.href = `/work/article.html?article=${article.slug}`;
        articleLink.textContent = article.listTitle || article.title;

        articleWrapper.appendChild(articleLink);
        articleWrapper.appendChild(line);
        articleWrapper.appendChild(date);
        fragment.appendChild(articleWrapper);
    });

    workArticlesContainer.innerHTML = '';
    workArticlesContainer.appendChild(fragment);
    setupHoverEffect(workArticlesContainer);
}

document.addEventListener('DOMContentLoaded', async () => {
    projectsContainer = document.getElementById('projects-container');
    workArticlesContainer = document.getElementById('work-articles-container');

    try {
        const data = await fetchData('data.json');

        if (data && data.projects && data.projects.length > 0) {
            renderProjects(data);
        } else {
            displayMessage(projectsContainer, 'No projects found.');
        }

        if (data && data.articles && data.articles.length > 0) {
            renderWorkArticles(data);
        } else if (workArticlesContainer) {
            displayMessage(workArticlesContainer, 'No articles found.');
        }

        renderLayersGallery(data);
        setupExternalLinks(data, setupHoverEffect);
    } catch (error) {
        console.error('Error fetching data:', error);
        displayMessage(projectsContainer, error.message);
    }

    const bodyAnimationDuration = 350;
    const delayBeforeStaggeredAnimation = bodyAnimationDuration + 50;

    setTimeout(() => {
        triggerStaggeredAnimation();
    }, delayBeforeStaggeredAnimation);
});
