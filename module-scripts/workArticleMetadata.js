const ARTICLE_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const CARD_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

let siteDataPromise = null;

export function getArticlePath(slug) {
  return `/work/thoughts/${slug}.md`;
}

export function getArticleUrl(slug) {
  return `/work/article.html?article=${slug}`;
}

function parseFrontmatterValue(rawValue) {
  const value = rawValue.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function extractFrontmatter(markdown) {
  if (!markdown.startsWith("---")) {
    return { metadata: {}, body: markdown };
  }

  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { metadata: {}, body: markdown };
  }

  const metadata = {};
  match[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) return;
      const key = line.slice(0, separatorIndex).trim();
      const value = parseFrontmatterValue(line.slice(separatorIndex + 1));
      if (key) {
        metadata[key] = value;
      }
    });

  return {
    metadata,
    body: markdown.slice(match[0].length),
  };
}

function extractTitle(markdownBody) {
  const headingMatch = markdownBody.match(/^#\s+(.+)$/m);
  return headingMatch ? headingMatch[1].trim() : "";
}

function parseIsoMonth(dateValue) {
  if (!/^\d{4}-\d{2}$/.test(dateValue || "")) return null;

  const [yearString, monthString] = dateValue.split("-");
  const year = Number(yearString);
  const month = Number(monthString);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, 1));
}

function formatDateLabel(dateValue, formatter) {
  const date = parseIsoMonth(dateValue);
  return date ? formatter.format(date) : "";
}

function formatHomeDateLabel(dateValue) {
  const date = parseIsoMonth(dateValue);
  if (!date) return "";

  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${month}/${year}`;
}

function decorateArticleMetadata(article = {}) {
  return {
    ...article,
    listTitle: article.listTitle || article.title || "",
    articleUrl: article.slug ? getArticleUrl(article.slug) : "",
    dateIsoMonth: article.date || "",
    articleDateLabel: formatDateLabel(article.date, ARTICLE_DATE_FORMATTER),
    cardDateLabel: formatDateLabel(article.date, CARD_DATE_FORMATTER),
    homeDateLabel: formatHomeDateLabel(article.date),
  };
}

export async function fetchSiteData() {
  if (!siteDataPromise) {
    siteDataPromise = fetch("/data.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load site data: ${response.status}`);
        }
        return response.json();
      });
  }

  return siteDataPromise;
}

export async function fetchArticlesMetadata() {
  const data = await fetchSiteData();
  return Array.isArray(data.articles)
    ? data.articles.map((article) => decorateArticleMetadata(article))
    : [];
}

export async function fetchArticleMetadata(slug) {
  const articles = await fetchArticlesMetadata();
  return articles.find((article) => article.slug === slug) || null;
}

export function parseArticleDocument(markdown, slug = "") {
  const { metadata, body } = extractFrontmatter(markdown);
  const title = extractTitle(body);

  return {
    slug,
    metadata,
    body,
    title,
    dateIsoMonth: metadata.date || "",
    articleDateLabel: formatDateLabel(metadata.date, ARTICLE_DATE_FORMATTER),
    cardDateLabel: formatDateLabel(metadata.date, CARD_DATE_FORMATTER),
  };
}

export async function fetchArticleDocument(slug) {
  const [articleMetadata, markdown] = await Promise.all([
    fetchArticleMetadata(slug),
    fetch(getArticlePath(slug)).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load article: ${response.status}`);
      }
      return response.text();
    }),
  ]);

  const parsedArticle = parseArticleDocument(markdown, slug);

  if (!articleMetadata) {
    return {
      ...parsedArticle,
      articleUrl: getArticleUrl(slug),
      homeDateLabel: formatHomeDateLabel(parsedArticle.dateIsoMonth),
    };
  }

  return {
    ...parsedArticle,
    ...articleMetadata,
    title: articleMetadata.title || parsedArticle.title,
    dateIsoMonth: articleMetadata.dateIsoMonth || parsedArticle.dateIsoMonth,
    articleDateLabel: articleMetadata.articleDateLabel || parsedArticle.articleDateLabel,
    cardDateLabel: articleMetadata.cardDateLabel || parsedArticle.cardDateLabel,
  };
}
