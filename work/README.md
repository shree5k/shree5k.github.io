# Work — Article System

Each article is a single `.md` file in this folder. The page at `article.html` reads the markdown and renders it automatically.

## Creating a new article

1. Create a file like `my-new-article.md` in `work/`.
2. Add a link to it in `work/index.html` inside the `.hover-effect-container`:

```html
<a href="/work/article.html?article=my-new-article" class="topic-item animated-item">
    <div class="link-content">
        <span class="title">Article Title</span>
        <span class="description">Short description</span>
    </div>
</a>
```

3. Visit `/work/article.html?article=my-new-article`.

## Markdown syntax

### Headings

```
# Article Title        → page title (shown in the header, not repeated in body)
## Section Heading     → h2
### Sub-section        → h3
```

### Text formatting

```
Regular paragraph text.

*italic text* renders as italic.
**bold text** renders as bold.
```

Consecutive lines (no blank line between) merge into one paragraph. Separate paragraphs with a blank line.

## Adding media

### Single full-width image

Put it on its own line with blank lines around it:

```
Some paragraph above.

![Alt text](/assets/work/image.webp)

Some paragraph below.
```

### Side-by-side images (row)

Put multiple image lines together with **no blank line** between them:

```
![Left image](/assets/work/a.webp)
![Right image](/assets/work/b.webp)
```

They will render in a flex row, evenly sized. Works with 2, 3, or more.

### Video

Prefix the alt text with `video:`:

```
![video:Demo of the interaction](/assets/work/demo.mp4)
```

### Side-by-side video + image

Same rule — consecutive media lines group into a row:

```
![video:App demo](/assets/work/demo.mp4)
![Screenshot](/assets/work/screenshot.webp)
```

## File structure

```
work/
├── index.html              ← list of articles (links)
├── article.html            ← article template (loads .md dynamically)
├── styles.css              ← work-specific styles
├── README.md               ← this file
├── lab-thinking-out-loud.md  ← first article
└── (future articles).md
```
