// Analyzes a comment a person already wrote (possibly with a little AI help)
// and flags genuine risk signals — never rewrites or generates text. The
// goal is to help someone notice their draft reads as generic, spammy, or
// too similar to something already posted, so they can fix it in their own
// voice before posting it themselves.

const AI_PHRASES = [
  'as an ai',
  'i hope this helps',
  'in conclusion',
  'furthermore',
  "it's worth noting",
  'on the other hand',
  'delve into',
  'navigate the complexities',
  "in today's fast-paced world",
  'unlock the potential',
  'game-changer',
  'game changer',
  'seamless',
  'boost your',
  'elevate your',
  'dive into',
  'when it comes to',
  'at the end of the day',
];

const CTA_PHRASES = ['check out', 'sign up', 'visit our', 'click here', 'try it now', 'buy now', 'link in bio'];

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'on', 'for',
  'it', 'this', 'that', 'i', 'you', 'your', 'my', 'me', 'be', 'with', 'as', 'at', 'by', 'so', 'if',
]);

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordSet(text) {
  const words = normalize(text)
    .split(' ')
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  return new Set(words);
}

function jaccard(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const w of setA) if (setB.has(w)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Score starts at 100 and loses points per issue found. This is a plain
// weighted sum over the same flags/notes below — not a trained model, just
// a transparent way to turn "how many things look off" into one number.
const HIGH_FLAG_PENALTY = 50;
const MEDIUM_FLAG_PENALTY = 25;
const TONE_NOTE_PENALTY = 5;

function computeSafety(flags, toneNotes) {
  let score = 100;
  for (const f of flags) {
    score -= f.level === 'high' ? HIGH_FLAG_PENALTY : MEDIUM_FLAG_PENALTY;
  }
  score -= toneNotes.length * TONE_NOTE_PENALTY;
  score = Math.max(0, Math.min(100, score));

  const level = score >= 85 ? 'low' : score >= 50 ? 'medium' : 'high';
  return { score, level };
}

function analyzeComment(text) {
  const flags = [];
  const toneNotes = [];
  const lower = text.toLowerCase();
  const trimmed = text.trim();

  const phraseHits = AI_PHRASES.filter((p) => lower.includes(p));
  if (phraseHits.length >= 2) {
    flags.push({
      type: 'generic-phrasing',
      level: 'medium',
      message: `Contains common AI-sounding phrases (${phraseHits.slice(0, 3).join(', ')}). Add a specific detail from your own experience so it reads naturally.`,
    });
  } else if (phraseHits.length === 1) {
    toneNotes.push(`The phrase "${phraseHits[0]}" reads a little generic — consider rewording it in your own voice.`);
  }

  const hasLink = /https?:\/\//i.test(text);
  const ctaHit = CTA_PHRASES.find((p) => lower.includes(p));
  const exclCount = (text.match(/!/g) || []).length;
  if (hasLink || ctaHit || exclCount >= 3) {
    flags.push({
      type: 'self-promo-risk',
      level: 'high',
      message:
        'Reads as promotional (a link, call-to-action wording, or heavy exclamation marks). Many subreddits remove or ban unsolicited self-promotion — check the sub\'s rules and disclose any affiliation.',
    });
  }

  if (trimmed.length < 15) {
    flags.push({
      type: 'low-effort',
      level: 'medium',
      message: 'Very short — low-effort comments are often removed or downvoted. Add more substance.',
    });
  } else if (trimmed.length > 900) {
    toneNotes.push('Quite long for a comment — consider trimming to your main point.');
  }

  if (!/\b(i|i've|i'm|my|me)\b/i.test(text)) {
    toneNotes.push(
      'No first-person language in here — grounding it in your own experience or opinion (e.g. "In my experience...") tends to read more genuine.'
    );
  }

  const { score, level } = computeSafety(flags, toneNotes);

  return { riskLevel: level, safetyScore: score, flags, toneNotes };
}

// Optional upgrade: ask Claude for a few coaching notes on the SAME draft.
// The prompt explicitly forbids rewriting the comment — this must stay
// feedback the author acts on themselves, never text ready to paste in.
async function aiFeedback(text) {
  if (!ANTHROPIC_API_KEY) return null;

  const prompt = `You are coaching someone on a Reddit comment they already drafted themselves. Give 2-4 short, specific notes on how to make it read more genuine, better-toned, and safer to post (e.g. sounds scripted, could add a concrete personal detail, phrasing that might read as promotional, mismatched tone for Reddit).

Do NOT rewrite the comment or provide an alternate version of it. Only give coaching feedback about the existing draft.

Draft:
"""
${text.slice(0, 2000)}
"""

Respond ONLY with a JSON array of short strings, e.g. ["note one", "note two"].`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) return null;

    const json = await res.json();
    const responseText = json.content && json.content[0] && json.content[0].text;
    const match = responseText && responseText.match(/\[[\s\S]*\]/);
    if (!match) return null;

    const notes = JSON.parse(match[0]);
    return Array.isArray(notes) ? notes.filter((n) => typeof n === 'string') : null;
  } catch {
    return null;
  }
}

module.exports = { analyzeComment, computeSafety, wordSet, jaccard, normalize, aiFeedback };
