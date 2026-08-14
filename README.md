# Reddit Account Checker

A small web tool that looks up a Reddit username via Reddit's public JSON API
and reports karma, recent activity stats, and personalized suggestions for
improving the account.

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
