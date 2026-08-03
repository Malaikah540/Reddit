# Reddit Account Checker

A small web tool that looks up a Reddit username via Reddit's public JSON API
and reports karma, recent activity stats, and personalized suggestions for
improving the account.

## How it works

- The frontend (`public/`) is a plain HTML/CSS/JS page with a username form.
- The backend (`server.js`, Express) fetches from Reddit's public,
  unauthenticated JSON endpoints server-side (to avoid browser CORS
  restrictions and to send a proper `User-Agent`, which Reddit requires):
  - `GET /user/<username>/about.json` — karma, account age, verified email, etc.
  - `GET /user/<username>/submitted.json` — recent posts
  - `GET /user/<username>/comments.json` — recent comments
- Stats computed: total/post/comment karma, average post/comment score,
  average upvote ratio, top subreddits, activity in the last 30 days, and
  negative-scored content.
- Suggestions are generated from simple heuristics over those stats (e.g. low
  karma, one-sided karma ratio, low average scores, inactive account, no
  verified email, single-subreddit concentration).

## Run locally

```bash
npm install
npm start
```

Then open http://localhost:3000 and enter a Reddit username.

## Notes

- Only public data available on a user's Reddit profile is used — no login or
  API credentials are required.
- Private, suspended, or nonexistent accounts return a clear error message.
- Suggestions are based on a snapshot of the user's ~100 most recent posts and
  comments, not their full history.
