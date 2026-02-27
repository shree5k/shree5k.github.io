const videos = [
    'Cover Flow - iPod Classic',
    'Search Bar - Cursor Morph',
    'Search Bar - Pull Down Gesture',
    'Search Bar - Cursor Beam',
    'Browse Watchlist Tray'
];

const col1 = document.getElementById('col1');
const col2 = document.getElementById('col2');
const col3 = document.getElementById('col3');
const lightbox = document.getElementById('lightbox');
const lightboxVideo = document.getElementById('lightbox-video');
const lightboxTitle = document.getElementById('lightbox-title');
let currentIndex = 0;

const loadVideo = (videoName, index) => {
    return new Promise((resolve) => {
        const item = document.createElement('div');
        item.className = 'grid-item';
        item.dataset.index = index;
        
        const video = document.createElement('video');
        video.src = `assets/${videoName}.mp4`;
        video.preload = 'auto';
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.controls = false;
        video.setAttribute('aria-label', `Video ${index + 1}`);
        
        item.appendChild(video);
        
        item.addEventListener('click', () => {
            if (window.innerWidth > 768) {
                currentIndex = index;
                showLightbox();
            }
        });
        
        video.addEventListener('loadedmetadata', () => {
            resolve({
                element: item,
                height: video.videoHeight,
                index: index,
                video: video
            });
        });

        video.onerror = () => {
            console.warn(`Failed to load video: ${videoName}`);
            item.style.display = 'none';
            resolve({
                element: item,
                height: 0,
                index: index
            });
        };
    });
};

const showLightbox = () => {
    const videoName = videos[currentIndex];
    if (lightboxVideo.src) {
        lightboxVideo.pause();
        lightboxVideo.currentTime = 0;
    }
    
    lightboxVideo.src = `assets/${videoName}.mp4`;
    lightboxTitle.textContent = videoName;
    lightbox.classList.add('active');
    document.body.classList.add('lightbox-open');
    
    lightboxVideo.play().catch(err => {
        console.warn('Autoplay prevented:', err);
    });
};

const closeLightbox = () => {
    lightboxVideo.pause();
    lightboxVideo.currentTime = 0;
    lightbox.classList.remove('active');
    document.body.classList.remove('lightbox-open');
};

const navigateLightbox = (direction) => {
    currentIndex = (currentIndex + direction + videos.length) % videos.length;
    showLightbox();
};


lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target.classList.contains('lightbox')) {
        closeLightbox();
    }
});

const closeBtn = document.createElement('div');
closeBtn.className = 'lightbox-close';
closeBtn.addEventListener('click', closeLightbox);

const leftArrow = document.createElement('div');
leftArrow.className = 'lightbox-arrow lightbox-arrow-left';
leftArrow.addEventListener('click', () => navigateLightbox(-1));

const rightArrow = document.createElement('div');
rightArrow.className = 'lightbox-arrow lightbox-arrow-right';
rightArrow.addEventListener('click', () => navigateLightbox(1));

lightbox.appendChild(closeBtn);
lightbox.appendChild(leftArrow);
lightbox.appendChild(rightArrow);

document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    
    if (e.key === 'Escape') {
        closeLightbox();
    } else if (e.key === 'ArrowLeft') {
        navigateLightbox(-1);
    } else if (e.key === 'ArrowRight') {
        navigateLightbox(1);
    }
});

Promise.all(videos.map((name, idx) => loadVideo(name, idx)))
    .then(loadedVideos => {
        let col1Height = 0;
        let col2Height = 0;
        let col3Height = 0;

        loadedVideos.forEach(({ element, height, video }) => {
            if (col1Height <= col2Height && col1Height <= col3Height) {
                col1.appendChild(element);
                col1Height += height;
            } else if (col2Height <= col3Height) {
                col2.appendChild(element);
                col2Height += height;
            } else {
                col3.appendChild(element);
                col3Height += height;
            }
        });
        
        setTimeout(() => {
            document.querySelector('.grid').classList.add('loaded');
            setTimeout(() => {
                loadedVideos.forEach(({ video }) => {
                    video.play().catch(err => {
                        console.warn('Autoplay prevented:', err);
                    });
                });
            }, 400);
        }, 100);
    });