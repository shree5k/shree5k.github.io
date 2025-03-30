import { setupHoverEffect } from '/module-scripts/hoverEffect.js';

let pluginsData = null;

async function fetchData(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load data from ${url}.`);
    return await response.json();
}

function displayPlugins(data) {
    const pluginsContainer = document.getElementById('plugins-container');
    if (!pluginsContainer) {
        console.error('Plugins container not found');
        return;
    }
    
    pluginsContainer.innerHTML = ''; // Clear existing content
    
    data.plugins.forEach(plugin => {
        const pluginLink = document.createElement('a');
        pluginLink.className = 'topic-item';
        pluginLink.href = plugin.link;
        pluginLink.target = '_blank';
        
        const linkContent = document.createElement('div');
        linkContent.className = 'link-content';
        
        // Create image element
        const image = document.createElement('img');
        image.className = 'plugin-image';
        image.src = plugin.image;
        image.alt = plugin.name;
        
        // Create a container for title and description
        const textContainer = document.createElement('div');
        textContainer.className = 'plugin-text';
        
        const title = document.createElement('span');
        title.className = 'title';
        title.textContent = plugin.name;
        
        const description = document.createElement('span');
        description.className = 'description';
        description.textContent = plugin.description;
        
        textContainer.appendChild(title);
        textContainer.appendChild(description);
        
        // Add elements to link content: image | text
        linkContent.appendChild(image);
        linkContent.appendChild(textContainer);
        pluginLink.appendChild(linkContent);
        pluginsContainer.appendChild(pluginLink);
    });
}

async function loadPlugins() {
    try {
        pluginsData = await fetchData('data.json');
        if (!pluginsData || !pluginsData.plugins || pluginsData.plugins.length === 0) {
            console.error('No plugins found in data');
            return;
        }
        displayPlugins(pluginsData);
        setupHoverEffect(document.getElementById('plugins-container'));
    } catch (error) {
        console.error('Error loading plugins:', error);
    }
}

// Initialize plugins when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    loadPlugins();
});