async function fetchRepositoryTopics() {
    const topicsContainer = document.getElementById('projects-container');

    try {
        const reposResponse = await fetch('data.json'); // Load data from JSON file

        if (!reposResponse.ok) throw new Error('Failed to load repository data.');

        const repos = await reposResponse.json();

        // Check if repos is empty
        if (!repos || repos.length === 0) {
            topicsContainer.innerHTML = '<div class="error-message">No repositories found.</div>';
            return; // Exit if no repositories
        }

        topicsContainer.innerHTML = ''; // Clear previous content
        repos.forEach(repo => {
            // Create anchor element
            const topicLink = document.createElement('a');
            topicLink.href = repo.link; // Set the URL for the repository (changed from repo.url to repo.link)
            topicLink.target = '_blank'; // Open link in new tab
            topicLink.className = 'topic-item'; // Add class for styling
            topicLink.textContent = repo.tag_id; // Display tag_id

            // Create tooltip element
            const tooltipElement = document.createElement('span');
            tooltipElement.className = 'tooltip';
            tooltipElement.textContent = repo.name; // Show name in tooltip

            topicLink.appendChild(tooltipElement); // Append tooltip to link
            topicsContainer.appendChild(topicLink); // Append link to container
        });

    } catch (error) {
        console.error('Error fetching repositories:', error);
        topicsContainer.innerHTML = `<div class="error-message">${error.message}</div>`;
    }
}

document.addEventListener('DOMContentLoaded', fetchRepositoryTopics);
