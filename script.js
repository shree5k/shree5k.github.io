let showTagIds = false; // Global state to track display mode

async function fetchRepositoryTopics() {
    const topicsContainer = document.getElementById('projects-container');
    const toggleIcon = document.getElementById('display-toggle');

    try {
        const reposResponse = await fetch('data.json'); // Load data from JSON file

        if (!reposResponse.ok) throw new Error('Failed to load repository data.');

        const repos = await reposResponse.json();

        // Check if repos is empty
        if (!repos || repos.length === 0) {
            topicsContainer.innerHTML = '<div class="error-message">No repositories found.</div>';
            return; // Exit if no repositories
        }

        function updateDisplay() {
            topicsContainer.innerHTML = ''; // Clear previous content
            repos.forEach(repo => {
                // Create anchor element
                const topicLink = document.createElement('a');
                topicLink.href = repo.link; // Set the URL for the repository (changed from repo.url to repo.link)
                topicLink.target = '_blank'; // Open link in new tab
                topicLink.className = 'topic-item'; // Add class for styling
                
                // Display either tag_id or name based on toggle state
                topicLink.textContent = showTagIds ? repo.tag_id : repo.name;

                topicsContainer.appendChild(topicLink); // Append link to container
            });

            // Update icon based on state
            toggleIcon.src = showTagIds ? 'assets/icons/eye-closed.svg' : 'assets/icons/eye.svg';
        }

        // Initial display
        updateDisplay();

        // Set up toggle button functionality
        toggleIcon.addEventListener('click', () => {
            showTagIds = !showTagIds;
            updateDisplay();
        });

    } catch (error) {
        console.error('Error fetching repositories:', error);
        topicsContainer.innerHTML = `<div class="error-message">${error.message}</div>`;
    }
}

document.addEventListener('DOMContentLoaded', fetchRepositoryTopics);
