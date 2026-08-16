import { triggerStaggeredAnimation } from '/module-scripts/animations.js';
import { fetchArticleDocument } from '/module-scripts/workArticleMetadata.js';

const ARTICLE_DEFAULT = "lab-thinking-out-loud";
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxVideo = document.getElementById("lightbox-video");
const lightboxClose = document.getElementById("lightbox-close");
let activeInlineVideo = null;
let shouldResumeInlineVideo = false;
let lightboxResetTimeout = null;

function getArticleSlugFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("article") || ARTICLE_DEFAULT;
}

function setupArticleBackLink() {
  const backLink = document.getElementById("article-back-link");
  if (!backLink) return;

  const params = new URLSearchParams(window.location.search);
  backLink.href = params.get("from") === "work" ? "/work" : "/";
}

// ── Inline markdown formatting ──────────────────────────────────────
// Converts **strong text** → <strong>, *italic* → <em>
// Escapes HTML first to prevent injection
function formatInlineMarkdown(text, { highlightStrong = false } = {}) {
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

  // Strong text: **text**; paragraphs use the existing highlight treatment.
  html = html.replace(
    /\*\*(.+?)\*\*/g,
    highlightStrong ? '<mark class="work-highlight">$1</mark>' : "<strong>$1</strong>"
  );

  // Italic: *text* (but not inside **)
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Highlight: ==text==
  html = html.replace(/==(.+?)==/g, '<mark class="work-highlight">$1</mark>');

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code class="work-inline-code">$1</code>');

  // File references: [path/to/file.ext]
  html = html.replace(
    /\[([A-Za-z0-9_./-]+)\]/g,
    '<code class="work-inline-code">$1</code>'
  );

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
  let listBuffer = null;
  let codeBlock = null;

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

  function flushList() {
    if (!listBuffer) return;
    blocks.push(listBuffer);
    listBuffer = null;
  }

  function flushCodeBlock() {
    if (!codeBlock) return;
    blocks.push(codeBlock);
    codeBlock = null;
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

    if (codeBlock) {
      if (/^```\s*$/.test(line)) {
        flushCodeBlock();
      } else {
        codeBlock.code.push(rawLine);
      }
      continue;
    }

    const codeFence = line.match(/^```([a-z0-9+-]*)\s*$/i);
    if (codeFence) {
      flushParagraph();
      flushMedia();
      flushStats();
      flushList();
      codeBlock = {
        type: "code",
        language: codeFence[1].toLowerCase(),
        code: [],
      };
      continue;
    }

    // Blank line → flush everything
    if (!line) {
      flushParagraph();
      flushMedia();
      flushStats();
      flushList();
      continue;
    }

    // Media line?
    const media = parseMediaLine(line);
    if (media) {
      flushParagraph();
      flushList();
      mediaBuffer.push(media);
      continue;
    }

    // If we had media buffered and this isn't a media line, flush media first
    flushMedia();
    if (!line.startsWith(":: ")) flushStats();

    const listContinuation = rawLine.match(/^\s{2,}(.+)$/);
    if (listBuffer && listContinuation) {
      listBuffer.items[listBuffer.items.length - 1].continuation.push(listContinuation[1].trim());
      continue;
    }

    const orderedListItem = line.match(/^\d+\.\s+(.+)$/);
    const unorderedListItem = line.match(/^[-*+]\s+(.+)$/);
    if (orderedListItem || unorderedListItem) {
      flushParagraph();
      const type = orderedListItem ? "ordered-list" : "unordered-list";
      if (!listBuffer || listBuffer.type !== type) {
        flushList();
        listBuffer = { type, items: [] };
      }
      listBuffer.items.push({
        text: (orderedListItem || unorderedListItem)[1],
        continuation: [],
      });
      if (orderedListItem && listBuffer.items.length === 1) {
        listBuffer.start = Number(line.match(/^(\d+)\./)[1]);
      }
      continue;
    }

    flushList();

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
  flushList();
  flushCodeBlock();
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
  if (lightboxResetTimeout) {
    window.clearTimeout(lightboxResetTimeout);
    lightboxResetTimeout = null;
  }
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

function setVideoLightboxTransitionOrigin(inlineVideo) {
  const inlineRect = inlineVideo.getBoundingClientRect();
  const lightboxRect = lightboxVideo.getBoundingClientRect();
  if (!inlineRect.width || !inlineRect.height || !lightboxRect.width || !lightboxRect.height) return;

  const inlineCenterX = inlineRect.left + inlineRect.width / 2;
  const inlineCenterY = inlineRect.top + inlineRect.height / 2;
  const lightboxCenterX = lightboxRect.left + lightboxRect.width / 2;
  const lightboxCenterY = lightboxRect.top + lightboxRect.height / 2;
  const scale = Math.min(inlineRect.width / lightboxRect.width, inlineRect.height / lightboxRect.height);

  lightboxVideo.style.setProperty("--lightbox-origin-x", `${inlineCenterX - lightboxCenterX}px`);
  lightboxVideo.style.setProperty("--lightbox-origin-y", `${inlineCenterY - lightboxCenterY}px`);
  lightboxVideo.style.setProperty("--lightbox-origin-scale", String(scale));
  lightboxVideo.classList.add("lightbox-video-transition");
}

function resetLightboxMedia() {
  lightboxResetTimeout = null;
  lightboxImg.src = "";
  lightboxImg.alt = "";
  lightboxImg.style.display = "";
  lightboxVideo.controls = false;
  lightboxVideo.removeAttribute("src");
  lightboxVideo.removeAttribute("aria-label");
  lightboxVideo.style.display = "none";
  lightboxVideo.classList.remove("lightbox-video-transition");
  lightboxVideo.style.removeProperty("--lightbox-origin-x");
  lightboxVideo.style.removeProperty("--lightbox-origin-y");
  lightboxVideo.style.removeProperty("--lightbox-origin-scale");
  lightboxVideo.load();
}

async function openVideoLightbox(inlineVideo) {
  if (!lightbox || !lightboxImg || !lightboxVideo) return;
  if (lightboxResetTimeout) {
    window.clearTimeout(lightboxResetTimeout);
    lightboxResetTimeout = null;
  }
  const startTime = inlineVideo.currentTime;
  activeInlineVideo = inlineVideo;
  shouldResumeInlineVideo = !inlineVideo.paused && !inlineVideo.ended;
  inlineVideo.pause();

  lightboxImg.style.display = "none";
  lightboxImg.src = "";
  lightboxImg.alt = "";
  lightboxVideo.style.display = "";
  lightboxVideo.muted = true;
  lightboxVideo.controls = true;
  lightboxVideo.loop = inlineVideo.loop;
  lightboxVideo.src = inlineVideo.currentSrc || inlineVideo.src;
  lightboxVideo.setAttribute("aria-label", inlineVideo.getAttribute("aria-label") || "");

  await new Promise((resolve) => {
    if (lightboxVideo.readyState >= HTMLMediaElement.HAVE_METADATA) {
      resolve();
      return;
    }
    lightboxVideo.addEventListener("loadedmetadata", resolve, { once: true });
    lightboxVideo.addEventListener("error", resolve, { once: true });
    lightboxVideo.addEventListener("emptied", resolve, { once: true });
  });

  if (activeInlineVideo !== inlineVideo || lightboxVideo.readyState < HTMLMediaElement.HAVE_METADATA) return;
  lightboxVideo.currentTime = startTime;
  setVideoLightboxTransitionOrigin(inlineVideo);

  requestAnimationFrame(() => {
    if (activeInlineVideo !== inlineVideo) return;
    lightbox.classList.add("active");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-open");
    if (shouldResumeInlineVideo) {
      lightboxVideo.play().catch(() => {});
    }
  });
}

function closeLightbox() {
  if (!lightbox || !lightboxImg || !lightboxVideo) return;
  const inlineVideo = activeInlineVideo;
  const playbackTime = lightboxVideo.currentTime;
  const shouldResume = shouldResumeInlineVideo;
  const shouldAnimateVideoClose = lightboxVideo.classList.contains("lightbox-video-transition");

  lightbox.classList.remove("active");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("lightbox-open");
  lightboxVideo.pause();

  activeInlineVideo = null;
  shouldResumeInlineVideo = false;
  if (inlineVideo && Number.isFinite(playbackTime)) {
    inlineVideo.currentTime = playbackTime;
  }
  if (inlineVideo) {
    inlineVideo.muted = true;
  }
  if (inlineVideo && shouldResume) {
    inlineVideo.play().catch(() => {});
  }

  if (shouldAnimateVideoClose) {
    lightboxResetTimeout = window.setTimeout(resetLightboxMedia, 300);
  } else {
    resetLightboxMedia();
  }
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
        openVideoLightbox(element);
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
      const isSectionSubtext = /^\*\*.+\*\*$/.test(block.text);
      el.className = isSectionSubtext
        ? "work-article-paragraph work-article-section-subtext"
        : "work-article-paragraph";
      el.innerHTML = formatInlineMarkdown(block.text, {
        highlightStrong: !isSectionSubtext,
      });
      container.appendChild(el);
      break;
    }
    case "ordered-list":
    case "unordered-list": {
      const list = document.createElement(block.type === "ordered-list" ? "ol" : "ul");
      list.className = "work-article-list";
      if (block.type === "ordered-list" && block.start > 1) {
        list.start = block.start;
      }
      block.items.forEach((item) => {
        const listItem = document.createElement("li");
        listItem.innerHTML = formatInlineMarkdown(item.text);
        if (item.continuation.length) {
          const description = document.createElement("span");
          description.className = "work-article-list-description";
          description.innerHTML = formatInlineMarkdown(item.continuation.join(" "));
          listItem.appendChild(description);
        }
        list.appendChild(listItem);
      });
      container.appendChild(list);
      break;
    }
    case "code": {
      const pre = document.createElement("pre");
      pre.className = "work-code-block";
      const code = document.createElement("code");
      code.className = block.language ? `language-${block.language}` : "";
      code.textContent = block.code.join("\n");
      pre.appendChild(code);
      container.appendChild(pre);
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

function highlightCodeBlocks(container) {
  if (!window.hljs || !container) return;
  container.querySelectorAll(".work-code-block code").forEach((code) => {
    if (code.dataset.highlighted) return;
    window.hljs.highlightElement(code);
  });
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
    highlightCodeBlocks(container);
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
  setupArticleBackLink();

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

window.addEventListener("load", () => {
  highlightCodeBlocks(document.getElementById("work-article-container"));
});
