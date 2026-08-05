import { triggerStaggeredAnimation } from '/module-scripts/animations.js';
import { fetchArticleDocument } from '/module-scripts/workArticleMetadata.js';

const ARTICLE_DEFAULT = "lab-thinking-out-loud";
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxVideo = document.getElementById("lightbox-video");
const lightboxClose = document.getElementById("lightbox-close");

function getArticleSlugFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("article") || ARTICLE_DEFAULT;
}

// ── Inline markdown formatting ──────────────────────────────────────
// Converts **bold** → <strong>, *italic* → <em>
// Escapes HTML first to prevent injection
function formatInlineMarkdown(text) {
  // Escape HTML entities
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
    const isExternal = /^(https?:)?\/\//.test(url) || url.startsWith("mailto:");
    const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";
    return `<a href="${url}"${target}>${label}</a>`;
  });

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic: *text* (but not inside **)
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Highlight: ==text==
  html = html.replace(/==(.+?)==/g, '<mark class="work-highlight">$1</mark>');

  return html;
}

// ── Markdown → blocks parser ────────────────────────────────────────
// Supports: # h1, ## h2, ### h3, paragraphs, ![alt](src), ![video:alt](src)
// Consecutive media lines (no blank line between) become a single "media-row" block
function parseMarkdownToBlocks(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let paragraphLines = [];
  let mediaBuffer = []; // collect consecutive media lines
  let statBuffer = []; // collect consecutive :: stat lines

  function flushParagraph() {
    if (!paragraphLines.length) return;
    const text = paragraphLines.join(" ").trim();
    if (text) blocks.push({ type: "paragraph", text });
    paragraphLines = [];
  }

  function flushMedia() {
    if (!mediaBuffer.length) return;
    if (mediaBuffer.length === 1) {
      blocks.push(mediaBuffer[0]); // single media block
    } else {
      blocks.push({ type: "media-row", items: mediaBuffer }); // side-by-side
    }
    mediaBuffer = [];
  }

  function flushStats() {
    if (!statBuffer.length) return;
    blocks.push({ type: "stat-list", items: statBuffer });
    statBuffer = [];
  }

  function parseMediaLine(line) {
    const match = line.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (!match) return null;
    const [, alt, src] = match;

    // Video convention: ![video:description](/path/to/file.mp4)
    if (alt.startsWith("video:")) {
      return {
        type: "media",
        mediaType: "video",
        src,
        alt: alt.replace(/^video:\s*/, ""),
      };
    }
    return { type: "media", mediaType: "image", src, alt };
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Blank line → flush everything
    if (!line) {
      flushParagraph();
      flushMedia();
      flushStats();
      continue;
    }

    // Media line?
    const media = parseMediaLine(line);
    if (media) {
      flushParagraph();
      mediaBuffer.push(media);
      continue;
    }

    // If we had media buffered and this isn't a media line, flush media first
    flushMedia();
    if (!line.startsWith(":: ")) flushStats();

    // Headings (check longest prefix first)
    if (line.startsWith("### ")) {
      flushParagraph();
      blocks.push({ type: "subheading", level: 3, label: line.slice(4) });
      continue;
    }
    if (line.startsWith("## ")) {
      flushParagraph();
      blocks.push({ type: "subheading", level: 2, label: line.slice(3) });
      continue;
    }
    if (line.startsWith("# ")) {
      flushParagraph();
      blocks.push({ type: "heading", level: 1, text: line.slice(2) });
      continue;
    }

    // Divider
    if (line === "---") {
      flushParagraph();
      blocks.push({ type: "divider" });
      continue;
    }

    // Pull quote
    if (line.startsWith("> ")) {
      flushParagraph();
      blocks.push({ type: "pull-quote", text: line.slice(2).trim() });
      continue;
    }

    // Stat row — buffer consecutive lines
    if (line.startsWith(":: ")) {
      flushParagraph();
      const rest = line.slice(3);
      const pipeIdx = rest.indexOf(" | ");
      if (pipeIdx !== -1) {
        statBuffer.push({
          value: rest.slice(0, pipeIdx).trim(),
          description: rest.slice(pipeIdx + 3).trim(),
        });
      }
      continue;
    }

    // Default: paragraph text
    paragraphLines.push(line);
  }

  flushParagraph();
  flushMedia();
  flushStats();
  return blocks;
}

// ── DOM helpers ─────────────────────────────────────────────────────

function createMediaElement(block) {
  const figure = document.createElement("figure");
  figure.className = "work-article-media";

  if (block.mediaType === "video") {
    const video = document.createElement("video");
    video.src = block.src;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("aria-label", block.alt || "");
    video.className = "work-article-media-element";
    figure.appendChild(video);
  } else {
    const img = document.createElement("img");
    img.src = block.src;
    img.alt = block.alt || "";
    img.loading = "lazy";
    img.className = "work-article-media-element";
    figure.appendChild(img);
  }

  if (block.caption) {
    const cap = document.createElement("figcaption");
    cap.className = "work-article-media-caption";
    cap.textContent = block.caption;
    figure.appendChild(cap);
  }

  return figure;
}

function openImageLightbox(src, alt) {
  if (!lightbox || !lightboxImg || !lightboxVideo) return;
  lightboxVideo.pause();
  lightboxVideo.removeAttribute("src");
  lightboxVideo.load();
  lightboxVideo.style.display = "none";
  lightboxImg.style.display = "";
  lightboxImg.src = src;
  lightboxImg.alt = alt || "";
  lightbox.classList.add("active");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("lightbox-open");
}

function openVideoLightbox(src, alt) {
  if (!lightbox || !lightboxImg || !lightboxVideo) return;
  lightboxImg.style.display = "none";
  lightboxImg.src = "";
  lightboxImg.alt = "";
  lightboxVideo.style.display = "";
  lightboxVideo.src = src;
  lightboxVideo.setAttribute("aria-label", alt || "");
  lightbox.classList.add("active");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("lightbox-open");
  lightboxVideo.play().catch(() => {});
}

function closeLightbox() {
  if (!lightbox || !lightboxImg || !lightboxVideo) return;
  lightbox.classList.remove("active");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("lightbox-open");
  lightboxImg.src = "";
  lightboxImg.alt = "";
  lightboxImg.style.display = "";
  lightboxVideo.pause();
  lightboxVideo.removeAttribute("src");
  lightboxVideo.removeAttribute("aria-label");
  lightboxVideo.load();
  lightboxVideo.style.display = "none";
}

function setupArticleImageLightbox(container) {
  if (!container) return;

  const mediaElements = container.querySelectorAll(".work-article-media-element");
  mediaElements.forEach((element) => {
    element.addEventListener("click", () => {
      if (element.tagName === "IMG") {
        openImageLightbox(element.currentSrc || element.src, element.alt);
        return;
      }

      if (element.tagName === "VIDEO") {
        openVideoLightbox(element.currentSrc || element.src, element.getAttribute("aria-label") || "");
      }
    });
  });
}

function renderBlock(block, container) {
  switch (block.type) {
    case "heading": {
      // Skip H1 in the article body — the page title already shows it
      break;
    }
    case "subheading": {
      const tag = block.level === 3 ? "h3" : "h2";
      const el = document.createElement(tag);
      el.className = `work-article-subheading work-article-subheading-${block.level}`;
      el.textContent = block.label;
      container.appendChild(el);
      break;
    }
    case "paragraph": {
      const el = document.createElement("p");
      el.className = "work-article-paragraph";
      el.innerHTML = formatInlineMarkdown(block.text);
      container.appendChild(el);
      break;
    }
    case "media": {
      container.appendChild(createMediaElement(block));
      break;
    }
    case "media-row": {
      const row = document.createElement("div");
      row.className = "work-media-row";
      block.items.forEach((item) => row.appendChild(createMediaElement(item)));
      container.appendChild(row);
      break;
    }
    case "pull-quote": {
      const el = document.createElement("blockquote");
      el.className = "work-article-pull-quote";
      el.textContent = block.text;
      container.appendChild(el);
      break;
    }
    case "stat-list": {
      const list = document.createElement("div");
      list.className = "work-stat-list";
      block.items.forEach((item) => {
        const row = document.createElement("div");
        row.className = "work-stat-row";
        const val = document.createElement("span");
        val.className = "work-stat-value";
        val.textContent = item.value;
        const desc = document.createElement("span");
        desc.className = "work-stat-desc";
        desc.innerHTML = formatInlineMarkdown(item.description);
        row.appendChild(val);
        row.appendChild(desc);
        list.appendChild(row);
      });
      container.appendChild(list);
      break;
    }
    case "divider": {
      const el = document.createElement("hr");
      el.className = "work-article-divider";
      container.appendChild(el);
      break;
    }
  }
}

// ── Section index ───────────────────────────────────────────────────

function buildSectionIndex(container) {
  const aside = document.querySelector(".home-link-aside");
  if (!aside) return;

  const headings = Array.from(
    container.querySelectorAll(".work-article-subheading-2")
  );
  if (!headings.length) return;

  // Assign slug IDs for anchor targets
  headings.forEach((h) => {
    const slug = h.textContent
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    h.id = slug;
  });

  // Build nav
  const nav = document.createElement("nav");
  nav.className = "work-article-index";

  headings.forEach((h) => {
    const link = document.createElement("a");
    link.href = `#${h.id}`;
    link.className = "work-index-item";
    link.textContent = h.textContent;
    link.addEventListener("click", (e) => {
      e.preventDefault();
      h.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    nav.appendChild(link);
  });

  aside.appendChild(nav);

  // Active state tracking via IntersectionObserver
  const items = Array.from(nav.querySelectorAll(".work-index-item"));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          items.forEach((item) => {
            item.classList.toggle(
              "active",
              item.getAttribute("href") === `#${id}`
            );
          });
        }
      });
    },
    { rootMargin: "-15% 0px -80% 0px", threshold: 0 }
  );

  headings.forEach((h) => observer.observe(h));
}

// ── Load & render ───────────────────────────────────────────────────

async function loadArticle() {
  const container = document.getElementById("work-article-container");
  if (!container) return;

  const slug = getArticleSlugFromUrl();

  try {
    const article = await fetchArticleDocument(slug);
    const blocks = parseMarkdownToBlocks(article.body);

    const titleEl = document.querySelector(".work-article-title");
    if (titleEl && article.title) {
      titleEl.textContent = article.title;
    }

    const subtitleEl = document.querySelector(".work-article-subtitle");
    if (subtitleEl) {
      subtitleEl.textContent = article.articleDateLabel;
      subtitleEl.parentElement.style.display = article.articleDateLabel ? "" : "none";
    }

    // Render blocks
    container.innerHTML = "";
    blocks.forEach((block) => renderBlock(block, container));
    setupArticleImageLightbox(container);

  } catch (error) {
    console.error(error);
    container.innerHTML = "";
    const errorEl = document.createElement("p");
    errorEl.className = "work-article-error";
    errorEl.textContent = "Something went wrong loading this article.";
    container.appendChild(errorEl);
  }
}

// ── Init ────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  if (lightbox) {
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });
  }

  if (lightboxClose) {
    lightboxClose.addEventListener("click", closeLightbox);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && lightbox?.classList.contains("active")) {
      closeLightbox();
    }
  });

  await loadArticle();

  // Reveal everything simultaneously after the page blur-in settles
  setTimeout(() => {
    const container = document.getElementById("work-article-container");
    if (container) {
      buildSectionIndex(container);
      container.classList.add("work-article-visible");
    }
    document.querySelectorAll(".animated-item").forEach((el) => {
      el.classList.add("visible");
    });
  }, 400);
});
