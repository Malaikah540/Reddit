// Suggests subreddits relevant to a client's own website content, for
// genuine community/audience research — not for scripting or disguising
// coordinated posting. Uses a real AI call when ANTHROPIC_API_KEY is set,
// otherwise falls back to keyword matching against a curated category list.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';

const CATEGORY_MAP = [
  {
    keywords: ['saas', 'software', 'startup', 'b2b', 'platform', 'app', 'cloud', 'dashboard'],
    subreddits: [
      { subreddit: 'SaaS', reason: 'Community for SaaS builders and operators discussing growth and product.' },
      { subreddit: 'startups', reason: 'General startup audience relevant to a software product launch.' },
      { subreddit: 'EntrepreneurRideAlong', reason: 'Founders sharing and discussing product journeys.' },
    ],
  },
  {
    keywords: ['ai', 'artificial intelligence', 'machine learning', 'gpt', 'chatbot', 'llm', 'automation'],
    subreddits: [
      { subreddit: 'artificial', reason: "Site mentions AI/automation — this is a general AI-interest community." },
      { subreddit: 'ArtificialInteligence', reason: 'Broad AI audience for tool discovery and discussion.' },
      { subreddit: 'ChatGPT', reason: 'Active community if the product relates to conversational AI tools.' },
    ],
  },
  {
    keywords: ['marketing', 'advertising', 'ads', 'campaign', 'seo', 'branding', 'agency'],
    subreddits: [
      { subreddit: 'marketing', reason: 'Site content centers on marketing/advertising services.' },
      { subreddit: 'PPC', reason: 'Relevant if the product touches paid advertising.' },
      { subreddit: 'SEO', reason: 'Relevant if the product touches organic search/content marketing.' },
    ],
  },
  {
    keywords: ['ecommerce', 'e-commerce', 'shop', 'store', 'retail', 'shopify'],
    subreddits: [
      { subreddit: 'ecommerce', reason: 'Site content indicates an online retail/store focus.' },
      { subreddit: 'shopify', reason: 'Relevant if the store is built on or compares to Shopify.' },
    ],
  },
  {
    keywords: ['fashion', 'apparel', 'clothing', 'wear', 'style', 'accessories'],
    subreddits: [
      { subreddit: 'fashion', reason: 'General fashion/apparel audience.' },
      { subreddit: 'streetwear', reason: 'Relevant if the product leans casual/contemporary apparel.' },
    ],
  },
  {
    keywords: ['game', 'gaming', 'esports', 'player', 'console'],
    subreddits: [
      { subreddit: 'gaming', reason: 'Broad gaming audience.' },
      { subreddit: 'IndieGaming', reason: 'Relevant if the product is an independently developed game.' },
    ],
  },
  {
    keywords: ['crypto', 'blockchain', 'nft', 'web3', 'defi', 'token'],
    subreddits: [
      { subreddit: 'CryptoCurrency', reason: 'Site content relates to crypto/blockchain.' },
      { subreddit: 'web3', reason: 'Relevant if the product is a Web3/decentralized app.' },
    ],
  },
  {
    keywords: ['finance', 'investing', 'bank', 'fintech', 'loan', 'budget'],
    subreddits: [
      { subreddit: 'fintech', reason: 'Site content relates to financial products/services.' },
      { subreddit: 'personalfinance', reason: 'Relevant if the product helps individuals manage money.' },
    ],
  },
  {
    keywords: ['health', 'fitness', 'wellness', 'workout', 'nutrition', 'gym'],
    subreddits: [
      { subreddit: 'fitness', reason: 'Site content relates to health/fitness.' },
      { subreddit: 'nutrition', reason: 'Relevant if the product touches diet/nutrition.' },
    ],
  },
  {
    keywords: ['travel', 'trip', 'vacation', 'flight', 'hotel', 'destination'],
    subreddits: [
      { subreddit: 'travel', reason: 'Site content relates to travel/trip planning.' },
      { subreddit: 'solotravel', reason: 'Relevant if the product targets independent travelers.' },
    ],
  },
  {
    keywords: ['real estate', 'property', 'housing', 'home buying', 'realtor'],
    subreddits: [
      { subreddit: 'RealEstate', reason: 'Site content relates to real estate/property.' },
      { subreddit: 'FirstTimeHomeBuyer', reason: 'Relevant if the product targets home buyers.' },
    ],
  },
  {
    keywords: ['beauty', 'skincare', 'makeup', 'cosmetics'],
    subreddits: [
      { subreddit: 'SkincareAddiction', reason: 'Site content relates to skincare/beauty.' },
      { subreddit: 'MakeupAddiction', reason: 'Relevant if the product is cosmetics-focused.' },
    ],
  },
  {
    keywords: ['pet', 'dog', 'cat', 'animal'],
    subreddits: [
      { subreddit: 'pets', reason: 'Site content relates to pets/animals.' },
      { subreddit: 'dogs', reason: 'Relevant if the product is dog-specific.' },
    ],
  },
  {
    keywords: ['furry', 'fursona', 'anthro', 'avatar', 'character design'],
    subreddits: [
      { subreddit: 'furry', reason: 'Site content relates to furry fandom/fursona creation.' },
      { subreddit: 'FurryArtSchool', reason: 'Relevant if the product involves character art/design.' },
    ],
  },
  {
    keywords: ['sustainability', 'eco', 'environment', 'climate', 'ocean', 'green'],
    subreddits: [
      { subreddit: 'sustainability', reason: 'Site content relates to environmental/sustainability topics.' },
      { subreddit: 'ZeroWaste', reason: 'Relevant if the product supports eco-conscious lifestyles.' },
    ],
  },
  {
    keywords: ['education', 'learning', 'course', 'student', 'teach'],
    subreddits: [
      { subreddit: 'education', reason: 'Site content relates to learning/teaching.' },
      { subreddit: 'edtech', reason: 'Relevant if the product is an educational technology tool.' },
    ],
  },
  {
    keywords: ['design', 'creative', 'art', 'illustration', 'graphic'],
    subreddits: [
      { subreddit: 'design', reason: 'Site content relates to design/creative work.' },
      { subreddit: 'graphic_design', reason: 'Relevant if the product involves visual/graphic design.' },
    ],
  },
  {
    keywords: ['photography', 'photo', 'camera'],
    subreddits: [{ subreddit: 'photography', reason: 'Site content relates to photography.' }],
  },
  {
    keywords: ['music', 'audio', 'sound', 'artist', 'song'],
    subreddits: [{ subreddit: 'WeAreTheMusicMakers', reason: 'Site content relates to music creation.' }],
  },
];

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMeta(html, name) {
  const re = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i');
  const match = html.match(re);
  return match ? match[1] : '';
}

async function fetchWebsiteText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; account-suite-client-research/1.0)' },
    });
    if (!res.ok) {
      const err = new Error(`Could not fetch website (${res.status})`);
      err.status = 502;
      throw err;
    }
    const html = await res.text();
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : '';
    const description = extractMeta(html, 'description');
    const keywordsMeta = extractMeta(html, 'keywords');
    const bodyText = stripHtml(html).slice(0, 4000);

    return { title, description, keywordsMeta, bodyText };
  } finally {
    clearTimeout(timeout);
  }
}

function keywordSuggest(siteText) {
  const haystack = [siteText.title, siteText.description, siteText.keywordsMeta, siteText.bodyText]
    .join(' ')
    .toLowerCase();

  const matched = [];
  const seen = new Set();

  for (const category of CATEGORY_MAP) {
    const hit = category.keywords.find((kw) => haystack.includes(kw));
    if (!hit) continue;
    for (const s of category.subreddits) {
      if (seen.has(s.subreddit)) continue;
      seen.add(s.subreddit);
      matched.push({ ...s, reason: `Matched keyword "${hit}" on the site — ${s.reason}` });
    }
  }

  if (matched.length === 0) {
    return {
      method: 'keyword',
      suggestions: [],
      note: "Couldn't confidently match this site's content to a category. Try adding more descriptive text/meta tags, or add an ANTHROPIC_API_KEY for open-ended AI suggestions.",
    };
  }

  return { method: 'keyword', suggestions: matched.slice(0, 8), note: null };
}

async function aiSuggest(siteText) {
  const prompt = `You're helping a marketing team find subreddits where genuine, disclosed community engagement fits a client's business. Based on the website content below, suggest 5-8 relevant subreddits.

Title: ${siteText.title}
Meta description: ${siteText.description}
Page text (truncated): ${siteText.bodyText.slice(0, 2000)}

Respond ONLY with a JSON array like:
[{"subreddit": "name_without_r_slash", "reason": "one sentence why it fits"}]`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = new Error(`AI suggestion request failed (${res.status})`);
    err.status = 502;
    throw err;
  }

  const json = await res.json();
  const text = json.content && json.content[0] && json.content[0].text;
  const jsonMatch = text && text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('AI response was not in the expected format.');

  const suggestions = JSON.parse(jsonMatch[0]);
  return { method: 'ai', suggestions, note: null };
}

async function suggestSubreddits(url) {
  const siteText = await fetchWebsiteText(url);

  if (ANTHROPIC_API_KEY) {
    try {
      return await aiSuggest(siteText);
    } catch (err) {
      const fallback = keywordSuggest(siteText);
      fallback.note = `AI suggestion failed (${err.message}); showing keyword-based fallback instead.`;
      return fallback;
    }
  }

  return keywordSuggest(siteText);
}

module.exports = { suggestSubreddits };
