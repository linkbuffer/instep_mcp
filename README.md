# GHL MCP Server
**Made by LinkBuffer Studios**

Pure Node.js MCP server for GoHighLevel — no TypeScript, no build step. Deploys to Railway in under 2 minutes.

## Tools Available (22)
- Contacts: get, create, update, add/remove tags
- Opportunities: search, create, update, get pipelines
- Conversations: search, get messages, send SMS/email
- Calendar: get events
- Location: get details, custom fields
- Payments: list transactions
- Blogs: get blogs, create blog post
- Social Media: get accounts, create post
- Workflows: add contact to workflow

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GHL_API_KEY` | ✅ | Private Integration Token from GHL Settings → Private Integrations |
| `GHL_LOCATION_ID` | Optional | Default sub-account location ID (can be passed dynamically per prompt) |
| `GHL_BASE_URL` | Optional | Defaults to `https://services.leadconnectorhq.com` |
| `PORT` | Optional | Defaults to `8080` (Railway sets this automatically) |

## Deploy to Railway

1. Push this repo to GitHub
2. Connect repo in Railway → New Project → Deploy from GitHub
3. Add environment variables above
4. Railway auto-generates your domain
5. Add to Claude.ai connectors using: `https://your-domain.up.railway.app/sse`

## Claude.ai Connector Setup

URL: `https://your-railway-domain.up.railway.app/sse`

## Dynamic Location ID (Agency Use)

Leave `GHL_LOCATION_ID` blank and pass the location ID in your Claude prompt:

> "Working on InStep Physio — locationId: XXXXXXXXXX. Search all contacts tagged as new lead."

## Endpoints

- `GET /` — Health check
- `GET /sse` — SSE endpoint (Claude.ai connects here)
- `POST /mcp` — Streamable HTTP MCP endpoint
- `POST /message?sessionId=N` — SSE message handler
