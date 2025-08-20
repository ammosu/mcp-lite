#!/usr/bin/env node

/**
 * Simple HTTP MCP Server Example
 * 
 * This demonstrates how to create an HTTP-based MCP server that can be used
 * with the small_mcp_host project.
 * 
 * Usage:
 *   node examples/http-server.js
 * 
 * Then add this server to your MCP configuration:
 *   Transport: HTTP (Streamable HTTP)
 *   URL: http://localhost:4000/mcp
 */

import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServer } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

const PORT = process.env.MCP_HTTP_PORT || 4000;

// Create MCP server
const server = new Server(
  {
    name: 'example-http-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Add a simple tool
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'echo',
        description: 'Echo back the input text',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to echo back',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'get_time',
        description: 'Get current timestamp',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// Implement tool handlers
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'echo':
      return {
        content: [
          {
            type: 'text',
            text: `Echo: ${args.text}`,
          },
        ],
      };

    case 'get_time':
      return {
        content: [
          {
            type: 'text',
            text: `Current time: ${new Date().toISOString()}`,
          },
        ],
      };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Create Express app
const app = express();

// Create HTTP server transport
const httpTransport = new StreamableHTTPServer(server);

// Mount MCP endpoint
app.use('/mcp', httpTransport.createExpressRouter());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'example-http-server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 HTTP MCP Server running on http://localhost:${PORT}`);
  console.log(`📡 MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log();
  console.log('To use with MCP Lite:');
  console.log('1. Run: npm run dev add-server');
  console.log('2. Choose: HTTP (Streamable HTTP)');
  console.log(`3. URL: http://localhost:${PORT}/mcp`);
  console.log();
  console.log('Available tools: echo, get_time');
});