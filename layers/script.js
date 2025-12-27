const images = [
    '14', '13', '12', '11', '10', '09', '08',
    '07', '06', '05', '04', '03', '02', '01'
];

const col1 = document.getElementById('col1');
const col2 = document.getElementById('col2');
const col3 = document.getElementById('col3');

const loadImage = (imageName, index) => {
    return new Promise((resolve) => {
        const item = document.createElement('div');
        item.className = 'grid-item';
        
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
        
        img.onload = () => {
            resolve({
                element: item,
                height: img.naturalHeight,
                index: index
            });
        };

        img.onerror = () => {
            console.warn(`Failed to load image: ${imageName}`);
            // Try fallback to AVIF if WebP fails
            if (img.src.includes('.webp')) {
                img.src = `assets/${imageName}.avif`;
            } else {
                // Hide the item if both formats fail
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

Promise.all(images.map((name, idx) => loadImage(name, idx)))
.then(loadedImages => {
    let col1Height = 0;
    let col2Height = 0;
    let col3Height = 0;

    // Distribute to columns based on height
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