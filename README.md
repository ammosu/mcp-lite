# MCP Lite

A lightweight MCP (Model Context Protocol) client with LLM integration, supporting standard MCP configuration formats.

> **Compatible with Claude Code/Cline**: Uses the same configuration format as other MCP clients for easy migration.

## Features

- 🤖 **Multi-LLM Support**: OpenAI, Anthropic (Google coming soon)
- 🔧 **Standard MCP Format**: Compatible with Claude Code/Cline configuration
- 📡 **Multiple Transports**: STDIO and SSE (Server-Sent Events) support
- 💬 **Dual Interface**: Both CLI and web-based chat interfaces
- 🌐 **Modern Web UI**: Streaming responses, collapsible tool details, responsive design
- ⚙️ **Easy Configuration**: Environment-based configuration
- 🛠️ **Tool Auto-Execution**: Automatic execution of MCP tools with detailed I/O display
- 🔄 **Backward Compatible**: Supports legacy configuration formats

## Quick Start

### 1. Installation

Clone and install the project:

```bash
git clone https://github.com/your-username/mcp-lite.git
cd mcp-lite
npm install
```

### 2. Configuration

Copy the environment template:
```bash
cp .env.example .env
```

Edit `.env` with your API key and preferences:
```bash
# Choose your LLM provider
LLM_PROVIDER=openai
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Or use Anthropic
# LLM_PROVIDER=anthropic
# ANTHROPIC_API_KEY=your_api_key_here
# ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

### 3. Add MCP Servers

Add your first MCP server:
```bash
npm run dev add-server
```

Example MCP servers you can try:

**STDIO Servers (Local processes):**
- **File System**: `npx @modelcontextprotocol/server-filesystem /path/to/directory`
- **Git**: `npx @modelcontextprotocol/server-git /path/to/repo`
- **Brave Search**: `npx @modelcontextprotocol/server-brave-search`

**SSE Servers (Remote endpoints):**
- Any MCP server running with SSE transport
- Example: `http://localhost:3000/sse` if you have a server running locally

### 4. Start Chatting

**CLI Interface:**
```bash
npm run dev chat
```

**Web Interface:**
```bash
npm run dev:web
```
Then open http://localhost:3000 in your browser.

**Custom Port:**
```bash
npm run dev:web --port 8080
```

## Commands

### Chat Commands
**CLI Interface:**
- `npm run dev chat` - Start interactive CLI chat
- `npm run dev chat --temperature 0.9` - Set creativity level
- `npm run dev chat --no-auto-tools` - Manual tool execution

**Web Interface:**
- `npm run dev:web` - Start web server (default port 3000)
- `npm run dev:web --port 8080` - Start on custom port

### Server Management
- `npm run dev servers` - List configured servers
- `npm run dev add-server` - Add new MCP server
- `npm run dev config` - Show current configuration

### Chat Session Commands
**Available in both CLI and Web interfaces:**
- `/help` - Show available commands
- `/tools` - List available MCP tools and resources
- `/clear` - Clear chat history
- `/status` - Show session status

**CLI Only:**
- `exit` - Exit chat session

**Web Only:**
- Quick command buttons in sidebar
- Collapsible tool descriptions
- Auto-disappearing system messages

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CLI Interface │    │   Web Server    │    │   Chat Engine   │
│                 │    │   (Express.js)  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Config Manager  │    │    MCP Hub      │    │   LLM Factory   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  MCP Servers    │◄───┤  Tool Execution │    │  LLM Providers  │
│  Configuration  │    │   & Resources   │    │ (OpenAI,        │
└─────────────────┘    └─────────────────┘    │  Anthropic)     │
                                              └─────────────────┘
```

## Key Components

### 1. **Web Server** (`src/web/server.ts`)
- Express.js-based web interface
- Server-Sent Events (SSE) for streaming responses
- Tool execution callbacks with detailed I/O display
- Session management for multiple chat sessions

### 2. **MCP Hub** (`src/mcp/hub.ts`)
- Manages connections to MCP servers
- Handles tool calls and resource access
- Similar to Cline's McpHub

### 3. **Chat Engine** (`src/chat/engine.ts`)
- Orchestrates conversation flow
- Integrates LLM responses with MCP tool execution
- Handles multi-turn conversations
- Provides tool execution callbacks for real-time feedback

### 4. **LLM Factory** (`src/llm/factory.ts`)
- Abstract interface for different LLM providers
- Consistent API across OpenAI, Anthropic, etc.
- Tool calling support

### 5. **Config Manager** (`src/config/manager.ts`)
- Environment-based configuration
- MCP server persistence
- User settings management

## Example Usage

### CLI Chat
```bash
$ npm run dev chat
🤖 Initializing MCP Lite...
📋 Loaded config: openai (gpt-4o-mini)
🧠 LLM initialized
✅ Connected to MCP server: filesystem
   Tools: read_file, write_file, list_directory
✅ Ready for chat!

You: What files are in my home directory?
🤔 Thinking...
🔧 Executed 1 tool(s)
   call_abc123: ✅
🤖 Assistant: I can see your home directory contains...
```

### Web Interface

```bash
$ npm run dev:web
🌐 Starting MCP Lite Web Server on port 3000...
🌐 Initializing MCP Lite Web Server...
✅ Connected to MCP server: filesystem
🚀 MCP Lite Web Server running at http://localhost:3000
```

**Features:**
- **Streaming Responses**: See responses appear word by word
- **Tool Execution Display**: Collapsible details showing tool input/output
- **Markdown Support**: Rich formatting for code blocks, tables, lists
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Quick Commands**: Sidebar buttons for /help, /tools, /clear
- **Auto-disappearing Messages**: System messages fade after 3 seconds

### Tool Management
```bash
You: tools
🔧 Available Tools:
  ● read_file
    Read the contents of a file
  ● write_file
    Write content to a file
  ● list_directory
    List files and directories

📁 Available Resources:
  No resources available
```

## Configuration

### Environment Variables
- `LLM_PROVIDER`: Choose between 'openai', 'anthropic', 'google'
- `{PROVIDER}_API_KEY`: API key for your chosen provider
- `{PROVIDER}_MODEL`: Model name to use
- `MCP_TIMEOUT_MS`: Timeout for MCP operations (default: 30000)

### MCP Server Configuration
MCP servers are stored in `~/.mcp-lite/mcp-servers.json` using the standard MCP configuration format:

**Complete Configuration Example:**
```json
{
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user"],
      "disabled": false,
      "timeout": 60,
      "autoApprove": []
    },
    "brave-search": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your_api_key_here"
      },
      "disabled": false,
      "timeout": 60,
      "autoApprove": []
    },
    "rental-server": {
      "type": "sse",
      "url": "http://127.0.0.1:3000/sse",
      "disabled": false,
      "timeout": 60,
      "autoApprove": []
    }
  }
}
```

**Configuration Fields:**
- `type`: Transport type (`stdio` or `sse`)
- `command`: Executable command (required for `stdio`)
- `args`: Command line arguments (optional)
- `env`: Environment variables (optional)
- `url`: Server endpoint URL (required for `sse`)
- `disabled`: Whether the server is disabled (default: `false`)
- `timeout`: Request timeout in seconds (default: `60`)
- `autoApprove`: List of auto-approved tool patterns (default: `[]`)

> **⚠️ Important**: Configuration files are stored in `~/.mcp-lite/` directory, not in the project folder. This keeps your personal settings separate from the code.

## Development

```bash
# Development mode (CLI)
npm run dev chat

# Development mode (Web)
npm run dev:web

# Build for production
npm run build

# Production (CLI)
npm start chat

# Production (Web)
npm run start:web
```

### Build & Production Scripts
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run compiled CLI version
- `npm run start:web` - Run compiled web interface
- `npm run verify` - Verify project structure and dependencies

## Inspired By

This project is inspired by [Cline](https://github.com/clinebot/cline)'s MCP integration architecture, particularly:
- MCP Hub pattern for server management
- Tool execution flow
- Configuration management
- Multi-provider LLM support