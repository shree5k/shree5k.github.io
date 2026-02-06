const images = [
    '16', '15', '14', '13', '12', '11', '10', '09', '08',
    '07', '06', '05', '04', '03', '02', '01'
];

const col1 = document.getElementById('col1');
const col2 = document.getElementById('col2');
const col3 = document.getElementById('col3');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
let currentIndex = 0;

const loadImage = (imageName, index) => {
    return new Promise((resolve) => {
        const item = document.createElement('div');
        item.className = 'grid-item';
        item.dataset.index = index;
        
        const picture = document.createElement('picture');
        const source = document.createElement('source');
        source.srcset = `assets/${imageName}.avif`;
        source.type = 'image/avif';
        
        const img = document.createElement('img');
        img.src = `assets/${imageName}.webp`;
        img.alt = `${index + 1}`;
        
        picture.appendChild(source);
        picture.appendChild(img);
        item.appendChild(picture);
        
        // Click handler (only on desktop)
        item.addEventListener('click', () => {
            if (window.innerWidth > 768) {
                currentIndex = index;
                showLightbox();
            }
        });
        
        img.onload = () => {
            resolve({
                element: item,
                height: img.naturalHeight,
                index: index
            });
        };

        img.onerror = () => {
            console.warn(`Failed to load image: ${imageName}`);
            if (img.src.includes('.webp')) {
                img.src = `assets/${imageName}.avif`;
            } else {
                item.style.display = 'none';
                resolve({
                    element: item,
                    height: 0,
                    index: index
                });
            }
        };
    });
};

const showLightbox = () => {
    const imageName = images[currentIndex];
    // Try AVIF first, fallback to WebP
    lightboxImg.src = `assets/${imageName}.avif`;
    lightboxImg.onerror = () => {
        lightboxImg.src = `assets/${imageName}.webp`;
    };
    lightbox.classList.add('active');
    document.body.classList.add('lightbox-open');
};

const closeLightbox = () => {
    lightbox.classList.remove('active');
    document.body.classList.remove('lightbox-open');
};

const navigateLightbox = (direction) => {
    currentIndex = (currentIndex + direction + images.length) % images.length;
    showLightbox();
};


lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
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

Promise.all(images.map((name, idx) => loadImage(name, idx)))
    .then(loadedImages => {
        let col1Height = 0;
        let col2Height = 0;
        let col3Height = 0;

        loadedImages.forEach(({ element, height }) => {
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
        }, 100);
    });