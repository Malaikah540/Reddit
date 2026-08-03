const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const USER_AGENT = 'RedditAccountChecker/1.0 (by /u/account-checker-tool)';

async function redditGet(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });
  return res;
}

async function fetchAbout(username) {
  const res = await redditGet(`https://www.reddit.com/user/${encodeURIComponent(username)}/about.json`);
  if (res.status === 404) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  if (res.status === 403) {
    const err = new Error('This account is private, suspended, or banned');
    err.status = 403;
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`Reddit API error (${res.status})`);
    err.status = 502;
    throw err;
  }
  const json = await res.json();
  return json.data;
}

async function fetchListing(username, kind) {
  const res = await redditGet(
    `https://www.reddit.com/user/${encodeURIComponent(username)}/${kind}.json?limit=100&raw_json=1`
  );
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data && json.data.children) || [];
}

function daysSince(unixSeconds) {
  return (Date.now() / 1000 - unixSeconds) / 86400;
}

function computeStats(about, posts, comments) {
  const accountAgeDays = daysSince(about.created_utc);

  const postScores = posts.map((p) => p.data.score);
  const commentScores = comments.map((c) => c.data.score);

  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  const avgPostScore = avg(postScores);
  const avgCommentScore = avg(commentScores);

  const subredditCounts = {};
  for (const p of posts) {
    const sr = p.data.subreddit;
    subredditCounts[sr] = (subredditCounts[sr] || 0) + 1;
  }
  for (const c of comments) {
    const sr = c.data.subreddit;
    subredditCounts[sr] = (subredditCounts[sr] || 0) + 1;
  }
  const topSubreddits = Object.entries(subredditCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([subreddit, count]) => ({ subreddit, count }));

  const allTimestamps = [
    ...posts.map((p) => p.data.created_utc),
    ...comments.map((c) => c.data.created_utc),
  ].sort((a, b) => b - a);

  const recentWindow = 30 * 86400;
  const nowSec = Date.now() / 1000;
  const activityLast30Days = allTimestamps.filter((t) => nowSec - t <= recentWindow).length;

  const negativeScorePosts = postScores.filter((s) => s < 0).length;
  const negativeScoreComments = commentScores.filter((s) => s < 0).length;

  const upvoteRatios = posts.map((p) => p.data.upvote_ratio).filter((r) => typeof r === 'number');
  const avgUpvoteRatio = avg(upvoteRatios);

  return {
    accountAgeDays: Math.round(accountAgeDays),
    linkKarma: about.link_karma,
    commentKarma: about.comment_karma,
    totalKarma: about.link_karma + about.comment_karma,
    awardeeKarma: about.awardee_karma || 0,
    awarderKarma: about.awarder_karma || 0,
    hasVerifiedEmail: !!about.has_verified_email,
    isMod: !!about.is_mod,
    isGold: !!about.is_gold,
    postCountSampled: posts.length,
    commentCountSampled: comments.length,
    avgPostScore: Math.round(avgPostScore * 10) / 10,
    avgCommentScore: Math.round(avgCommentScore * 10) / 10,
    avgUpvoteRatio: Math.round(avgUpvoteRatio * 100) / 100,
    negativeScorePosts,
    negativeScoreComments,
    topSubreddits,
    activityLast30Days,
  };
}

function buildSuggestions(stats) {
  const suggestions = [];

  if (stats.totalKarma < 100) {
    suggestions.push({
      title: 'Build a karma foundation',
      detail:
        'Your total karma is under 100. Start by leaving genuine, helpful comments in active subreddits before posting your own threads — comment karma is usually faster and lower-risk to build than post karma.',
    });
  }

  if (stats.commentKarma > 0 && stats.linkKarma > 0) {
    const ratio = stats.commentKarma / (stats.linkKarma + stats.commentKarma);
    if (ratio > 0.9) {
      suggestions.push({
        title: 'Diversify into original posts',
        detail:
          'Almost all your karma comes from comments. Try starting a few original discussion or content posts in subreddits you already engage with — it broadens your visibility and karma sources.',
      });
    } else if (ratio < 0.1) {
      suggestions.push({
        title: 'Engage more in comment threads',
        detail:
          'Most of your karma comes from posts, with little from comments. Being active in discussions builds community trust and makes your future posts more likely to be upvoted early.',
      });
    }
  }

  if (stats.postCountSampled > 0 && stats.avgPostScore < 5) {
    suggestions.push({
      title: 'Improve post quality and timing',
      detail:
        'Your recent posts average a low score. Try posting when your target subreddit is most active, use clear and specific titles, and check each subreddit\'s rules before posting to avoid removals.',
    });
  }

  if (stats.commentCountSampled > 0 && stats.avgCommentScore < 1) {
    suggestions.push({
      title: 'Add more value in comments',
      detail:
        'Your comments average a low score. Focus on adding new information, direct answers, or humor that fits the thread, rather than short low-effort replies.',
    });
  }

  if (stats.avgUpvoteRatio && stats.avgUpvoteRatio < 0.6) {
    suggestions.push({
      title: 'Review content fit for your subreddits',
      detail: `Your average upvote ratio is ${(stats.avgUpvoteRatio * 100).toFixed(
        0
      )}%, meaning a good share of voters disagree with or downvote your posts. Double check that your content matches each subreddit's tone and rules before posting.`,
    });
  }

  if (stats.negativeScorePosts + stats.negativeScoreComments > 0) {
    suggestions.push({
      title: 'Learn from downvoted content',
      detail: `You have ${stats.negativeScorePosts + stats.negativeScoreComments} recent post(s)/comment(s) with negative scores. Review them for tone, timing, or subreddit fit to avoid repeating the same patterns.`,
    });
  }

  if (stats.topSubreddits.length > 0 && stats.topSubreddits.length < 3 && (stats.postCountSampled + stats.commentCountSampled) > 10) {
    suggestions.push({
      title: 'Diversify your subreddits',
      detail:
        'Most of your activity is concentrated in one or two subreddits. Exploring a wider range of communities can grow your karma faster and reduce the impact of one subreddit\'s downturn.',
    });
  }

  if (stats.activityLast30Days === 0) {
    suggestions.push({
      title: 'Get active again',
      detail:
        'No posts or comments were found in the last 30 days among your recent history. Consistent activity, even a few quality comments a week, keeps your account growing and visible.',
    });
  } else if (stats.activityLast30Days < 5) {
    suggestions.push({
      title: 'Increase posting consistency',
      detail:
        'Your activity in the last 30 days is fairly low. Setting a light, regular cadence (e.g., a few comments or one post per week) tends to compound karma growth over time.',
    });
  }

  if (!stats.hasVerifiedEmail) {
    suggestions.push({
      title: 'Verify your email',
      detail:
        'Your account does not have a verified email. Verifying unlocks more Reddit features (like posting in some subreddits and account recovery) and signals legitimacy.',
    });
  }

  if (stats.accountAgeDays < 30 && stats.totalKarma > 1000) {
    suggestions.push({
      title: 'Watch your growth pace',
      detail:
        'Your account is very young but already has high karma. Some subreddits flag unusually fast karma growth as spam — keep contributions genuine and varied to stay in good standing.',
    });
  }

  if (stats.accountAgeDays > 365 * 2 && stats.totalKarma < 500) {
    suggestions.push({
      title: 'Long-standing account, room to grow',
      detail:
        'Your account is a couple years old but karma is still modest. This is common for lurker accounts — even occasional quality contributions to a few favorite subreddits will steadily add up.',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      title: 'Solid overall standing',
      detail:
        'Your karma, activity, and scores all look healthy. Keep contributing consistently and engaging genuinely with communities you care about.',
    });
  }

  return suggestions;
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/check/:username', async (req, res) => {
  const username = req.params.username.trim().replace(/^u\//, '');

  if (!/^[A-Za-z0-9_-]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'Enter a valid Reddit username (3-20 characters, letters/numbers/_/-).' });
  }

  try {
    const [about, posts, comments] = await Promise.all([
      fetchAbout(username),
      fetchListing(username, 'submitted'),
      fetchListing(username, 'comments'),
    ]);

    const stats = computeStats(about, posts, comments);
    const suggestions = buildSuggestions(stats);

    res.json({
      username: about.name,
      iconImg: about.icon_img ? about.icon_img.split('?')[0] : null,
      accountCreatedUtc: about.created_utc,
      stats,
      suggestions,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Something went wrong.' });
  }
});

app.listen(PORT, () => {
  console.log(`Reddit Account Checker running on http://localhost:${PORT}`);
});
