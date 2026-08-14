# Reddit Account Checker

A small internal web tool with three parts, linked from the sidebar:

- **Account Checker** — look up any public Reddit username and see karma,
  recent activity stats, and personalized suggestions for improving the
  account.
- **Team Dashboard** — track which teammate owns which (their own, disclosed)
  Reddit account, with real live stats and a shared internal focus note.
- **Clients** — keep client details on file and get subreddit suggestions
  based on that client's own website content.

## How it works

- The frontend (`public/`) is a plain HTML/CSS/JS page with a username form.
- The backend (`server.js`, Express) authenticates as an app (not as any
  particular Reddit user) via Reddit's OAuth "client credentials" flow, then
  fetches from `oauth.reddit.com`:
  - `GET /user/<username>/about.json` — karma, account age, verified email, etc.
  - `GET /user/<username>/submitted.json` — recent posts
  - `GET /user/<username>/comments.json` — recent comments

  Reddit blocks most unauthenticated `www.reddit.com/*.json` requests now, so
  app-only OAuth against `oauth.reddit.com` is the reliable way to read this
  public data — see setup below.
- Stats computed: total/post/comment karma, average post/comment score,
  average upvote ratio, top subreddits, activity in the last 30 days, and
  negative-scored content.
- Suggestions are generated from simple heuristics over those stats (e.g. low
  karma, one-sided karma ratio, low average scores, inactive account, no
  verified email, single-subreddit concentration).

## Setup

1. Create a free Reddit API app:
   - Go to https://www.reddit.com/prefs/apps (log in first)
   - Click "create app" / "create another app"
   - Name: anything (e.g. "account-checker")
   - Type: select **script**
   - Redirect URI: `http://localhost:3000` (required field, not actually used)
   - Click "create app"
   - You'll see a client ID (the string under the app name, left of "personal
     use script") and a **secret**.
2. Copy `.env.example` to `.env` and fill in your client ID/secret and Reddit
   username:
   ```bash
   cp .env.example .env
   ```
   (On Windows PowerShell: `copy .env.example .env`)

## Run locally

```bash
npm install
npm start
```

Then open http://localhost:3000 and enter a Reddit username.

## Notes

- Only public data available on a user's Reddit profile is used. The app
  authenticates itself to Reddit (via your API app's client ID/secret) — it
  never asks for or uses anyone's Reddit login.
- Private, suspended, or nonexistent accounts return a clear error message.
- Suggestions are based on a snapshot of the user's ~100 most recent posts and
  comments, not their full history.

## Team dashboard

`team.html` (linked from the top nav) lets a team track their own accounts:

- Add employees, and assign each one to a Reddit account **they genuinely own
  and post as themselves**.
- Pull real, live status (karma, activity, upvote ratio, subreddits they
  already participate in) for each assigned account via the same checker
  logic above.
- Keep a shared "focus note" per assignment — internal talking points only.

This intentionally does **not** generate, ghostwrite, or schedule comments,
and does not take screenshots or automate posting. Any public activity must
be written by the account owner in their own words; if it's on behalf of a
brand, disclose that per Reddit's rules. Data is stored locally in
`data/store.json` (git-ignored) — there's no shared backend, so each person
running the server locally has their own local list.

## Clients

`clients.html` keeps each client's name, website, and notes on file, and
suggests subreddits that are topically relevant to that client's own public
site content — a research starting point, not a targeting or posting engine.

- Click "Suggest subreddits" on a client to fetch their site and get a short
  list of relevant subreddits with a one-line reason each.
- **Without** an `ANTHROPIC_API_KEY` set, this uses a keyword-matching
  fallback (see `subreddit-suggester.js`) against a curated list of common
  industries/categories — works immediately, no setup required.
- **With** an `ANTHROPIC_API_KEY` set in `.env` (see `.env.example`), the same
  button instead sends the site's title/description/text to Claude for
  open-ended, more accurate suggestions. No code changes needed to switch —
  it upgrades automatically once the key is present.
- Results only ever reflect what's already genuinely relevant to a client's
  own site. Any actual participation in a suggested subreddit should be
  written by a real person, in their own voice, following that subreddit's
  self-promotion rules and disclosure norms.
