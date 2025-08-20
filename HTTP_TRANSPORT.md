# HTTP Transport Support

MCP Lite now supports **HTTP (Streamable HTTP)** transport in addition to STDIO and SSE transports.

## Overview

HTTP transport allows MCP servers to run as standalone web services, making them accessible over HTTP endpoints. This is useful for:

- **Remote servers**: MCP servers running on different machines
- **Containerized deployments**: Servers running in Docker containers
- **Load balancing**: Multiple server instances behind a load balancer
- **Web-based integrations**: Easier integration with web applications

## Transport Comparison

| Transport | Use Case | Connection Type | Examples |
|-----------|----------|-----------------|-----------|
| **STDIO** | Local processes | Process pipes | `npx @modelcontextprotocol/server-filesystem` |
| **SSE** | Remote servers | Server-Sent Events | Event streaming endpoints |
| **HTTP** | Remote servers | HTTP requests | REST-like endpoints |

## Configuration

### Adding HTTP Servers

**CLI Method:**
```bash
npm run dev add-server
# Choose: "HTTP (Streamable HTTP)"
# Enter server name: my-http-server
# Enter HTTP endpoint URL: http://localhost:4000/mcp
```

**Manual Configuration:**
Add to `~/.mcp-lite/mcp-servers.json`:

```json
{
  "mcpServers": {
    "http-server": {
      "type": "http",
      "url": "http://localhost:4000/mcp",
      "disabled": false,
      "timeout": 60,
      "autoApprove": []
    }
  }
}
```

## Testing HTTP Transport

### 1. Start Example Server

```bash
cd examples
npm install
npm start
```

This starts an HTTP MCP server on port 4000 with two example tools:
- `echo` - Echo back text input
- `get_time` - Get current timestamp

### 2. Add Server to MCP Lite

```bash
npm run dev add-server
```

Configure as:
- **Transport**: HTTP (Streamable HTTP)
- **Name**: example-http-server
- **URL**: http://localhost:4000/mcp

### 3. Test in Chat

```bash
npm run dev chat
```

Try these commands:
- `tools` - List available tools
- `Echo hello world` - Test the echo tool
- `What's the current time?` - Test the get_time tool

## Creating HTTP MCP Servers

### Basic Structure

```javascript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServer } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';

// Create MCP server
const server = new Server({
  name: 'my-http-server',
  version: '1.0.0',
}, {
  capabilities: { tools: {} }
});

// Add tools
server.setRequestHandler('tools/list', async () => ({
  tools: [/* your tools */]
}));

server.setRequestHandler('tools/call', async (request) => {
  // Handle tool calls
});

// Create Express app and mount MCP
const app = express();
const httpTransport = new StreamableHTTPServer(server);
app.use('/mcp', httpTransport.createExpressRouter());

// Start server
app.listen(4000);
```

### Best Practices

1. **Health Checks**: Include health check endpoints
2. **Error Handling**: Proper error responses and logging
3. **CORS**: Enable CORS if needed for web clients
4. **Authentication**: Implement auth if required
5. **Rate Limiting**: Protect against abuse

## Deployment Options

### Docker Container
```dockerfile
FROM node:18
COPY . /app
WORKDIR /app
RUN npm install
EXPOSE 4000
CMD ["npm", "start"]
```

### Cloud Services
- **AWS Lambda**: Serverless HTTP MCP servers
- **Google Cloud Run**: Containerized deployments
- **Railway/Render**: Simple deployment platforms

### Load Balancing
Multiple HTTP MCP server instances can run behind:
- **nginx**: Reverse proxy and load balancer
- **AWS ALB**: Application Load Balancer
- **Cloudflare**: Edge load balancing

## Troubleshooting

### Common Issues

1. **Connection refused**
   - Check server is running on correct port
   - Verify firewall settings
   - Ensure URL is accessible

2. **Timeout errors**
   - Increase timeout in configuration
   - Check server response times
   - Monitor server resources

3. **CORS errors** (web clients)
   - Enable CORS on server
   - Set appropriate origins
   - Handle preflight requests

### Debug Mode

Enable debug logging:
```bash
export DEBUG=mcp-lite:*
npm run dev chat
```

## Examples

See `examples/http-server.js` for a complete working example of an HTTP MCP server.

### Available Examples

- **Basic HTTP Server**: Simple echo and time tools
- **File Operations**: HTTP-based file management tools
- **Database Integration**: Connect to databases via HTTP
- **Web API Wrapper**: Expose web APIs as MCP tools

## Migration Guide

### From STDIO to HTTP

1. **Wrap existing server**: Add HTTP transport layer
2. **Update configuration**: Change transport type to 'http'
3. **Test thoroughly**: Ensure all tools work correctly
4. **Monitor performance**: HTTP has different characteristics than STDIO

### From SSE to HTTP

1. **Change transport**: Update from SSEClientTransport to StreamableHTTPClientTransport
2. **Update endpoints**: HTTP typically uses different URL patterns
3. **Review implementation**: HTTP may have different error handling

## Performance Notes

- **HTTP**: Higher latency than STDIO, but better for remote scenarios
- **Concurrency**: HTTP servers can handle multiple concurrent requests
- **Caching**: Consider caching for frequently accessed tools
- **Streaming**: HTTP transport supports streaming responses