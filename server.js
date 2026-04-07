#!/usr/bin/env node
/**
 * GHL MCP Server for Claude.ai (Railway Deployment)
 * Pure Node.js — no TypeScript, no build step required
 * LinkBuffer Studios — Made by LinkBuffer Studios
 */

const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 8080;
const GHL_API_KEY = process.env.GHL_API_KEY || '';
const GHL_BASE_URL = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const DEFAULT_LOCATION_ID = process.env.GHL_LOCATION_ID || '';

// ─── GHL API Helper ───────────────────────────────────────────────────────────
function ghlRequest(method, path, body, locationId) {
  return new Promise((resolve, reject) => {
    const locId = locationId || DEFAULT_LOCATION_ID;
    const url = new URL(GHL_BASE_URL + path);
    const postData = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
        'Accept': 'application/json',
      }
    };
    if (locId) options.headers['locationId'] = locId;
    if (postData) options.headers['Content-Length'] = Buffer.byteLength(postData);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

// ─── Tool Definitions ─────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'ghl_get_contacts',
    description: 'Get contacts from a GoHighLevel sub-account. Supports search by name, email, phone, or tag.',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: { type: 'string', description: 'Sub-account location ID (overrides default)' },
        query: { type: 'string', description: 'Search query (name, email, phone)' },
        limit: { type: 'number', description: 'Number of results (default 20, max 100)' },
        tags: { type: 'string', description: 'Filter by tag' },
      }
    }
  },
  {
    name: 'ghl_get_contact',
    description: 'Get a single contact by ID from GoHighLevel.',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: { type: 'string', description: 'The contact ID' },
        locationId: { type: 'string', description: 'Sub-account location ID (overrides default)' },
      },
      required: ['contactId']
    }
  },
  {
    name: 'ghl_create_contact',
    description: 'Create a new contact in GoHighLevel.',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: { type: 'string', description: 'Sub-account location ID (overrides default)' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        source: { type: 'string' },
        customFields: { type: 'array', description: 'Array of {id, value} custom field objects' },
      }
    }
  },
  {
    name: 'ghl_update_contact',
    description: 'Update an existing contact in GoHighLevel.',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: { type: 'string', description: 'The contact ID to update' },
        locationId: { type: 'string', description: 'Sub-account location ID (overrides default)' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['contactId']
    }
  },
  {
    name: 'ghl_add_tags',
    description: 'Add tags to a contact in GoHighLevel.',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: { type: 'string' },
        locationId: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags to add' },
      },
      required: ['contactId', 'tags']
    }
  },
  {
    name: 'ghl_remove_tags',
    description: 'Remove tags from a contact in GoHighLevel.',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: { type: 'string' },
        locationId: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags to remove' },
      },
      required: ['contactId', 'tags']
    }
  },
  {
    name: 'ghl_get_opportunities',
    description: 'Search opportunities/deals in a GoHighLevel pipeline.',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: { type: 'string' },
        pipelineId: { type: 'string', description: 'Filter by pipeline ID' },
        stageId: { type: 'string', description: 'Filter by pipeline stage ID' },
        status: { type: 'string', description: 'open, won, lost, abandoned' },
        query: { type: 'string', description: 'Search by contact name or opportunity name' },
        limit: { type: 'number', description: 'Number of results (default 20)' },
      }
    }
  },
  {
    name: 'ghl_get_pipelines',
    description: 'Get all pipelines for a GoHighLevel sub-account.',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: { type: 'string' },
      }
    }
  },
  {
    name: 'ghl_create_opportunity',
    description: 'Create a new opportunity in GoHighLevel.',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: { type: 'string' },
        pipelineId: { type: 'string' },
        stageId: { type: 'string' },
        contactId: { type: 'string' },
        name: { type: 'string' },
        status: { type: 'string', description: 'open, won, lost, abandoned' },
        monetaryValue: { type: 'number' },
        assignedTo: { type: 'string', description: 'User ID to assign to' },
      },
      required: ['pipelineId', 'stageId', 'contactId', 'name']
    }
  },
  {
    name: 'ghl_update_opportunity',
    description: 'Update an opportunity in GoHighLevel.',
    inputSchema: {
      type: 'object',
      properties: {
        opportunityId: { type: 'string' },
        locationId: { type: 'string' },
        stageId: { type: 'string' },
        status: { type: 'string' },
        monetaryValue: { type: 'number' },
        name: { type: 'string' },
      },
      required: ['opportunityId']
    }
  },
  {
    name: 'ghl_get_conversations',
    description: 'Search conversations/messages in GoHighLevel.',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: { type: 'string' },
        contactId: { type: 'string', description: 'Filter by contact ID' },
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Number of results (default 20)' },
      }
    }
  },
  {
    name: 'ghl_get_messages',
    description: 'Get messages for a specific conversation in GoHighLevel.',
    inputSchema: {
      type: 'object',
      properties: {
        conversationId: { type: 'string' },
        locationId: { type: 'string' },
      },
      required: ['conversationId']
    }
  },
  {
    name: 'ghl_send_message',
    description: 'Send an SMS or email message to a contact in GoHighLevel.',
    inputSchema: {
      type: 'object',
      properties: {
        conversationId: { type: 'string' },
        locationId: { type: 'string' },
        type: { type: 'string', description: 'SMS or Email' },
        message: { type: 'string', description: 'Message body' },
        subject: { type: 'string', description: 'Email subject (for email type)' },
        emailFrom: { type: 'string', description: 'From email (for email type)' },
      },
      required: ['conversationId', 'type', 'message']
    }
  },
  {
    name: 'ghl_get_calendar_events',
    description: 'Get calendar events for a GoHighLevel sub-account.',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: { type: 'string' },
        calendarId: { type: 'string' },
        startTime: { type: 'string', description: 'Start datetime (ISO 8601)' },
        endTime: { type: 'string', description: 'End datetime (ISO 8601)' },
      }
    }
  },
  {
    name: 'ghl_get_location',
    description: 'Get details about a GoHighLevel sub-account/location.',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: { type: 'string' },
      }
    }
  },
  {
    name: 'ghl_get_custom_fields',
    description: 'Get custom field definitions for a GoHighLevel sub-account.',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: { type: 'string' },
      }
    }
  },
  {
    name: 'ghl_list_transactions',
    description: 'List payment transactions for a GoHighLevel sub-account.',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: { type: 'string' },
        startAt: { type: 'string', description: 'Start date (ISO 8601)' },
        endAt: { type: 'string', description: 'End date (ISO 8601)' },
        limit: { type: 'number' },
      }
    }
  },
  {
    name: 'ghl_create_blog_post',
    description: 'Create a blog post in GoHighLevel.',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: { type: 'string' },
        blogId: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        rawHTML: { type: 'string', description: 'HTML content of the blog post' },
        status: { type: 'string', description: 'DRAFT or PUBLISHED' },
        authorId: { type: 'string' },
        categoryIds: { type: 'array', items: { type: 'string' } },
        urlSlug: { type: 'string' },
      },
      required: ['blogId', 'title']
    }
  },
  {
    name: 'ghl_get_blogs',
    description: 'Get all blogs for a GoHighLevel sub-account.',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: { type: 'string' },
        skip: { type: 'number' },
        limit: { type: 'number' },
      }
    }
  },
  {
    name: 'ghl_create_social_post',
    description: 'Create a social media post in GoHighLevel.',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: { type: 'string' },
        content: { type: 'string', description: 'Post content/caption' },
        scheduleDate: { type: 'string', description: 'Scheduled publish datetime (ISO 8601)' },
        accountIds: { type: 'array', items: { type: 'string' }, description: 'Social account IDs to post to' },
        postType: { type: 'string', description: 'scheduled or now' },
      },
      required: ['content', 'accountIds']
    }
  },
  {
    name: 'ghl_get_social_accounts',
    description: 'Get connected social media accounts for a GoHighLevel sub-account.',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: { type: 'string' },
      }
    }
  },
  {
    name: 'ghl_add_contact_to_workflow',
    description: 'Add a contact to a GoHighLevel workflow/automation.',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: { type: 'string' },
        workflowId: { type: 'string' },
        locationId: { type: 'string' },
      },
      required: ['contactId', 'workflowId']
    }
  },
];

// ─── Tool Executors ───────────────────────────────────────────────────────────
async function executeTool(name, args) {
  const loc = args.locationId || DEFAULT_LOCATION_ID;

  switch (name) {

    case 'ghl_get_contacts': {
      const params = new URLSearchParams();
      if (loc) params.set('locationId', loc);
      if (args.query) params.set('query', args.query);
      if (args.tags) params.set('tags', args.tags);
      params.set('limit', String(args.limit || 20));
      return await ghlRequest('GET', `/contacts/?${params}`, null, loc);
    }

    case 'ghl_get_contact':
      return await ghlRequest('GET', `/contacts/${args.contactId}`, null, loc);

    case 'ghl_create_contact': {
      const body = { locationId: loc };
      ['firstName','lastName','email','phone','tags','source','customFields'].forEach(k => {
        if (args[k] !== undefined) body[k] = args[k];
      });
      return await ghlRequest('POST', `/contacts/`, body, loc);
    }

    case 'ghl_update_contact': {
      const body = {};
      ['firstName','lastName','email','phone','tags'].forEach(k => {
        if (args[k] !== undefined) body[k] = args[k];
      });
      return await ghlRequest('PUT', `/contacts/${args.contactId}`, body, loc);
    }

    case 'ghl_add_tags':
      return await ghlRequest('POST', `/contacts/${args.contactId}/tags`, { tags: args.tags }, loc);

    case 'ghl_remove_tags':
      return await ghlRequest('DELETE', `/contacts/${args.contactId}/tags`, { tags: args.tags }, loc);

    case 'ghl_get_opportunities': {
      const params = new URLSearchParams();
      params.set('location_id', loc);
      if (args.pipelineId) params.set('pipeline_id', args.pipelineId);
      if (args.stageId) params.set('pipeline_stage_id', args.stageId);
      if (args.status) params.set('status', args.status);
      if (args.query) params.set('q', args.query);
      params.set('limit', String(args.limit || 20));
      return await ghlRequest('GET', `/opportunities/search?${params}`, null, loc);
    }

    case 'ghl_get_pipelines': {
      const params = new URLSearchParams({ locationId: loc });
      return await ghlRequest('GET', `/opportunities/pipelines?${params}`, null, loc);
    }

    case 'ghl_create_opportunity': {
      const body = { locationId: loc };
      ['pipelineId','stageId','contactId','name','status','monetaryValue','assignedTo'].forEach(k => {
        if (args[k] !== undefined) body[k] = args[k];
      });
      return await ghlRequest('POST', `/opportunities/`, body, loc);
    }

    case 'ghl_update_opportunity': {
      const body = {};
      ['stageId','status','monetaryValue','name'].forEach(k => {
        if (args[k] !== undefined) body[k] = args[k];
      });
      return await ghlRequest('PUT', `/opportunities/${args.opportunityId}`, body, loc);
    }

    case 'ghl_get_conversations': {
      const params = new URLSearchParams({ locationId: loc });
      if (args.contactId) params.set('contactId', args.contactId);
      if (args.query) params.set('query', args.query);
      params.set('limit', String(args.limit || 20));
      return await ghlRequest('GET', `/conversations/search?${params}`, null, loc);
    }

    case 'ghl_get_messages':
      return await ghlRequest('GET', `/conversations/${args.conversationId}/messages`, null, loc);

    case 'ghl_send_message': {
      const body = { type: args.type, message: args.message };
      if (args.subject) body.subject = args.subject;
      if (args.emailFrom) body.emailFrom = args.emailFrom;
      return await ghlRequest('POST', `/conversations/${args.conversationId}/messages`, body, loc);
    }

    case 'ghl_get_calendar_events': {
      const params = new URLSearchParams({ locationId: loc });
      if (args.calendarId) params.set('calendarId', args.calendarId);
      if (args.startTime) params.set('startTime', args.startTime);
      if (args.endTime) params.set('endTime', args.endTime);
      return await ghlRequest('GET', `/calendars/events?${params}`, null, loc);
    }

    case 'ghl_get_location':
      return await ghlRequest('GET', `/locations/${loc}`, null, loc);

    case 'ghl_get_custom_fields': {
      const params = new URLSearchParams({ locationId: loc });
      return await ghlRequest('GET', `/locations/customFields?${params}`, null, loc);
    }

    case 'ghl_list_transactions': {
      const params = new URLSearchParams({ locationId: loc });
      if (args.startAt) params.set('startAt', args.startAt);
      if (args.endAt) params.set('endAt', args.endAt);
      if (args.limit) params.set('limit', String(args.limit));
      return await ghlRequest('GET', `/payments/transactions?${params}`, null, loc);
    }

    case 'ghl_get_blogs': {
      const params = new URLSearchParams({ locationId: loc });
      if (args.skip) params.set('skip', String(args.skip));
      if (args.limit) params.set('limit', String(args.limit));
      return await ghlRequest('GET', `/blogs/?${params}`, null, loc);
    }

    case 'ghl_create_blog_post': {
      const body = { locationId: loc };
      ['blogId','title','description','rawHTML','status','authorId','categoryIds','urlSlug'].forEach(k => {
        if (args[k] !== undefined) body[k] = args[k];
      });
      return await ghlRequest('POST', `/blogs/posts`, body, loc);
    }

    case 'ghl_get_social_accounts': {
      const params = new URLSearchParams({ locationId: loc });
      return await ghlRequest('GET', `/social-media-posting/accounts?${params}`, null, loc);
    }

    case 'ghl_create_social_post': {
      const body = { locationId: loc, content: args.content, accountIds: args.accountIds };
      if (args.scheduleDate) body.scheduleDate = args.scheduleDate;
      if (args.postType) body.postType = args.postType;
      return await ghlRequest('POST', `/social-media-posting/posts`, body, loc);
    }

    case 'ghl_add_contact_to_workflow':
      return await ghlRequest('POST', `/contacts/${args.contactId}/workflow/${args.workflowId}`, {}, loc);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── JSON-RPC Handler ─────────────────────────────────────────────────────────
function jsonRpcResponse(id, result) {
  return JSON.stringify({ jsonrpc: '2.0', id, result });
}
function jsonRpcError(id, code, message) {
  return JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } });
}

async function handleJsonRpc(body) {
  const { id, method, params } = body;

  if (method === 'initialize') {
    return jsonRpcResponse(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'ghl-mcp-server', version: '1.0.0' }
    });
  }

  if (method === 'tools/list') {
    return jsonRpcResponse(id, { tools: TOOLS });
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params;
    try {
      const result = await executeTool(name, args || {});
      return jsonRpcResponse(id, {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      });
    } catch (err) {
      return jsonRpcResponse(id, {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true
      });
    }
  }

  if (method === 'notifications/initialized') {
    return null; // no response needed
  }

  return jsonRpcError(id, -32601, `Method not found: ${method}`);
}

// ─── SSE Transport ────────────────────────────────────────────────────────────
const sseClients = new Map();
let clientIdCounter = 0;

function setupSSE(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const clientId = ++clientIdCounter;
  sseClients.set(clientId, res);

  // Send endpoint info
  const baseUrl = `https://${req.headers.host}`;
  res.write(`event: endpoint\ndata: ${baseUrl}/message?sessionId=${clientId}\n\n`);

  req.on('close', () => sseClients.delete(clientId));
}

// ─── HTTP Server ──────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // Health check
  if (url.pathname === '/' || url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', server: 'GHL MCP Server', version: '1.0.0', tools: TOOLS.length }));
  }

  // SSE endpoint (Claude.ai connects here first)
  if (url.pathname === '/sse' && req.method === 'GET') {
    return setupSSE(req, res);
  }

  // MCP streamable HTTP endpoint
  if (url.pathname === '/mcp' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body);
        const response = await handleJsonRpc(parsed);
        if (response === null) {
          res.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
          return res.end();
        }
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(response);
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(jsonRpcError(null, -32700, 'Parse error'));
      }
    });
    return;
  }

  // Message endpoint for SSE sessions
  if (url.pathname === '/message' && req.method === 'POST') {
    const sessionId = parseInt(url.searchParams.get('sessionId'));
    const sseRes = sseClients.get(sessionId);

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body);
        const response = await handleJsonRpc(parsed);

        // Acknowledge the POST
        res.writeHead(202, { 'Access-Control-Allow-Origin': '*' });
        res.end('accepted');

        // Send response over SSE if client still connected
        if (response !== null && sseRes && !sseRes.writableEnded) {
          sseRes.write(`event: message\ndata: ${response}\n\n`);
        }
      } catch (err) {
        res.writeHead(400, { 'Access-Control-Allow-Origin': '*' });
        res.end('bad request');
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`GHL MCP Server running on port ${PORT}`);
  console.log(`SSE endpoint: /sse`);
  console.log(`MCP endpoint: /mcp`);
  console.log(`Default location: ${DEFAULT_LOCATION_ID || '(dynamic — pass in prompt)'}`);
  console.log(`Tools available: ${TOOLS.length}`);
});
