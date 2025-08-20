# Setup Guide

## Prerequisites

- Node.js 18+ 
- npm or yarn
- API key for your chosen LLM provider

## Installation

```bash
git clone https://github.com/your-username/mcp-lite.git
cd mcp-lite
npm install
```

## Configuration

1. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Configure your LLM provider in `.env`:**
   
   For OpenAI:
   ```bash
   LLM_PROVIDER=openai
   OPENAI_API_KEY=sk-your-key-here
   OPENAI_MODEL=gpt-4o-mini
   ```
   
   For Anthropic:
   ```bash
   LLM_PROVIDER=anthropic
   ANTHROPIC_API_KEY=your-key-here
   ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
   ```

## Testing the Setup

### 1. Check Configuration
```bash
npm run dev config
```

### 2. Add a Simple MCP Server
```bash
npm run dev add-server
```

Example server configurations:

**STDIO Filesystem Server:**
- Transport: `STDIO (Local process)`
- Name: `filesystem`
- Command: `npx`
- Arguments: `@modelcontextprotocol/server-filesystem /tmp`

**STDIO Git Server:**
- Transport: `STDIO (Local process)`
- Name: `git`  
- Command: `npx`
- Arguments: `@modelcontextprotocol/server-git ~/git_project/mcp-lite`

**SSE Remote Server:**
- Transport: `SSE (Server-Sent Events)`
- Name: `remote-server`
- SSE endpoint URL: `http://localhost:3000/sse`

### 3. Test Chat
```bash
npm run dev chat
```

Try these commands:
- `tools` - See available MCP tools
- `What files are in the directory?` - Test filesystem tool
- `clear` - Clear chat history
- `exit` - Exit chat

## Troubleshooting

### Common Issues

1. **"API key not set" error:**
   - Check your `.env` file
   - Ensure the correct `LLM_PROVIDER` is set
   - Verify API key format

2. **MCP server connection failed:**
   - Ensure the MCP server package is installed globally
   - Check command and arguments are correct
   - Verify directory paths exist

3. **Tool execution timeout:**
   - Increase `MCP_TIMEOUT_MS` in `.env`
   - Check MCP server responsiveness

### Debugging

Enable verbose logging by setting:
```bash
export DEBUG=mcp-lite:*
```

## Next Steps

1. **Install MCP servers:**
   ```bash
   # Popular MCP servers
   npm install -g @modelcontextprotocol/server-filesystem
   npm install -g @modelcontextprotocol/server-git
   npm install -g @modelcontextprotocol/server-brave-search
   ```

2. **Configure multiple servers** for different capabilities

3. **Explore tool combinations** in chat sessions

4. **Build custom workflows** using available tools