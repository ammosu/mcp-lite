# MCP Lite

A lightweight MCP (Model Context Protocol) client with LLM integration, supporting standard MCP configuration formats.

> **Compatible with Claude Code/Cline**: Uses the same configuration format as other MCP clients for easy migration.

## Features

- 🤖 **Multi-LLM Support**: OpenAI, Anthropic (Google coming soon)
- 🔧 **Standard MCP Format**: Compatible with Claude Code/Cline configuration
- 📡 **Multiple Transports**: STDIO and SSE (Server-Sent Events) support
- 💬 **Interactive Chat**: Command-line chat interface
- ⚙️ **Easy Configuration**: Environment-based configuration
- 🛠️ **Tool Auto-Execution**: Automatic execution of MCP tools
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

```bash
npm run dev chat
```

## Commands

### Chat Commands
- `npm run dev chat` - Start interactive chat
- `npm run dev chat --temperature 0.9` - Set creativity level
- `npm run dev chat --no-auto-tools` - Manual tool execution

### Server Management
- `npm run dev servers` - List configured servers
- `npm run dev add-server` - Add new MCP server
- `npm run dev config` - Show current configuration

### Chat Session Commands
- `help` - Show available commands
- `tools` - List available MCP tools and resources
- `clear` - Clear chat history
- `exit` - Exit chat

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CLI Interface │    │   Chat Engine   │    │   LLM Factory   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Config Manager  │    │    MCP Hub      │    │  LLM Providers  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  MCP Servers    │◄───┤  Tool Execution │    │    OpenAI       │
│  Configuration  │    │   & Resources   │    │   Anthropic     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Key Components

### 1. **MCP Hub** (`src/mcp/hub.ts`)
- Manages connections to MCP servers
- Handles tool calls and resource access
- Similar to Cline's McpHub

### 2. **Chat Engine** (`src/chat/engine.ts`)
- Orchestrates conversation flow
- Integrates LLM responses with MCP tool execution
- Handles multi-turn conversations

### 3. **LLM Factory** (`src/llm/factory.ts`)
- Abstract interface for different LLM providers
- Consistent API across OpenAI, Anthropic, etc.
- Tool calling support

### 4. **Config Manager** (`src/config/manager.ts`)
- Environment-based configuration
- MCP server persistence
- User settings management

## Example Usage

### Basic Chat
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
# Development mode
npm run dev

# Build
npm run build

# Production
npm start
```

## Inspired By

This project is inspired by [Cline](https://github.com/clinebot/cline)'s MCP integration architecture, particularly:
- MCP Hub pattern for server management
- Tool execution flow
- Configuration management
- Multi-provider LLM support