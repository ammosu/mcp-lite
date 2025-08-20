# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development Commands
- `npm run dev <command>` - Main CLI entry point using tsx for development
- `npm run dev chat` - Start interactive chat session with connected MCP servers
- `npm run dev add-server` - Interactive wizard to add new MCP servers
- `npm run dev servers` - List all configured MCP servers and their status
- `npm run dev config` - Display current configuration (LLM provider, model, etc.)

### Build and Production
- `npm run build` - Compile TypeScript to JavaScript in `/dist`
- `npm start` - Run the compiled version from `/dist`
- `npm run verify` - Verify project structure and dependencies (runs automatically after install)

### Testing MCP Integration
- Use `npm run dev chat` then type `tools` to see available MCP tools
- Use `npm run dev chat` then type `help` for chat session commands
- For SSE servers, ensure the remote endpoint is running before connecting

## Architecture Overview

MCP Lite is a lightweight MCP (Model Context Protocol) client that bridges LLMs with MCP servers using a modular architecture:

### Core Components

**CLI Interface (`src/cli/index.ts`)**
- Command-line interface using Commander.js
- Handles all user interaction and command routing
- Interactive prompts using Inquirer for server configuration

**Chat Engine (`src/chat/engine.ts`)**
- Orchestrates conversation flow between user, LLM, and MCP tools
- Manages conversation history and context
- Handles automatic tool execution and result processing

**MCP Hub (`src/mcp/hub.ts`)**
- Central connection manager for all MCP servers
- Supports both STDIO (local processes) and SSE (Server-Sent Events) transports
- Manages server lifecycle, tool calls, and resource access
- Uses @modelcontextprotocol/sdk for protocol implementation

**LLM Factory (`src/llm/factory.ts` + providers)**
- Abstraction layer for different LLM providers (OpenAI, Anthropic, Google)
- Consistent interface across all providers via base class (`src/llm/base.ts`)
- Handles tool calling format conversion between LLM and MCP protocols

**Configuration Manager (`src/config/manager.ts`)**
- Manages environment-based LLM configuration
- Handles MCP server persistence in `~/.mcp-lite/mcp-servers.json`
- Supports both standard MCP format and legacy array format for backward compatibility

### Configuration Format

**Standard MCP Configuration (Compatible with Claude Code/Cline):**
- Uses `~/.mcp-lite/mcp-servers.json` with `{ "mcpServers": {...} }` structure
- Each server config includes: `type`, `command`, `args`, `env`, `url`, `disabled`, `timeout`, `autoApprove`
- Supports both `stdio` (local processes) and `sse` (remote endpoints) transports

**Environment Configuration:**
- LLM provider settings in `.env` file
- Supports `LLM_PROVIDER` with values: `openai`, `anthropic`, `google`
- Each provider requires corresponding API key and model configuration

### Key Design Patterns

**Transport Abstraction:**
- MCP servers can use either STDIO or SSE transports transparently
- Transport selection based on `type` field in server configuration
- SSE servers require `url`, STDIO servers require `command` and `args`

**Schema Validation:**
- All configuration uses Zod schemas for type safety and validation
- Separates external config format from internal representation
- `McpServerConfig` vs `McpServerWithName` for different contexts

**Error Handling:**
- Graceful fallbacks for missing MCP servers or failed connections
- Timeout handling for MCP operations (configurable via `MCP_TIMEOUT_MS`)
- Backward compatibility with legacy configuration formats

## Critical Implementation Details

### MCP Server Connection Flow
1. Configuration loaded from `~/.mcp-lite/mcp-servers.json`
2. For STDIO: spawn child process with StdioClientTransport
3. For SSE: create SSEClientTransport with provided URL
4. Client initialization with capabilities exchange
5. Tool and resource discovery via `tools/list` and `resources/list`

### LLM Integration
- Tool calls converted from MCP format to LLM-specific format
- Results converted back from LLM to MCP protocol
- Each LLM provider handles tool calling differently (function calling vs structured output)

### Configuration Migration
- Automatically detects and converts legacy array format to standard format
- Preserves existing user configurations during updates
- Config directory changed from `.small-mcp-host` to `.mcp-lite` (requires manual migration)

## Environment Setup Requirements

1. Copy `.env.example` to `.env` and configure LLM provider
2. Run `npm run dev add-server` to set up first MCP server
3. For SSE servers, ensure remote MCP server is running and accessible
4. Use `npm run dev config` to verify configuration before chatting