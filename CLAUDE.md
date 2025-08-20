# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development Commands
- `npm run dev <command>` - Main CLI entry point using tsx for development
- `npm run dev chat` - Start interactive CLI chat session with connected MCP servers
- `npm run dev:web` - Start web-based chat interface (default port 3000)
- `npm run dev web --port 8080` - Start web interface on custom port
- `npm run dev add-server` - Interactive wizard to add new MCP servers
- `npm run dev servers` - List all configured MCP servers and their status
- `npm run dev config` - Display current configuration (LLM provider, model, etc.)
- `npm run dev batch` - Process questions from CSV file in batch mode with full tool execution tracking

### Build and Production
- `npm run build` - Compile TypeScript to JavaScript in `/dist`
- `npm start` - Run the compiled CLI version from `/dist`
- `npm run start:web` - Run the compiled web interface from `/dist`
- `npm run verify` - Verify project structure and dependencies (runs automatically after install)

### Testing MCP Integration

**CLI Interface:**
- Use `npm run dev chat` then type `tools` to see available MCP tools
- Use `npm run dev chat` then type `help` for chat session commands

**Web Interface:**
- Use `npm run dev:web` then open http://localhost:3000 in your browser
- Use `npm run dev:web --port 8080` for custom port
- Click "Tools" button in sidebar to see available MCP tools with collapsible descriptions
- Use /help, /tools, /clear, /status commands in chat or click quick command buttons
- All MCP tools are automatically accessible through natural chat
- Features streaming responses, collapsible tool execution details, and responsive design
- System messages (like /clear confirmation) auto-disappear after 3 seconds
- Full internationalization support with Traditional Chinese (Taiwan) and English
- Language preferences saved automatically in browser localStorage

**Batch Processing:**
- CSV format: `id,question,context,expectedResult` (context and expectedResult are optional)
- Example: `npm run dev -- batch -i questions.csv -o results.csv -f json -c 3`
- Options: format (csv/json), concurrency, temperature, max-tokens, context inclusion
- Outputs detailed tool execution logs and processing statistics
- Supports both CSV and JSON output formats with comprehensive tool call tracking

**General:**
- For SSE servers, ensure the remote endpoint is running before connecting

## Architecture Overview

MCP Lite is a lightweight MCP (Model Context Protocol) client that bridges LLMs with MCP servers using a modular architecture:

### Core Components

**CLI Interface (`src/cli/index.ts`)**
- Command-line interface using Commander.js
- Handles all user interaction and command routing
- Interactive prompts using Inquirer for server configuration

**Web Server (`src/web/server.ts`)**
- Express.js-based web interface with Server-Sent Events (SSE) for streaming
- Session management for multiple concurrent chat sessions
- Tool execution callbacks for real-time feedback display
- Handles both regular chat and special commands (/help, /tools, /clear, /status)

**Chat Engine (`src/chat/engine.ts`)**
- Orchestrates conversation flow between user, LLM, and MCP tools
- Manages conversation history and context
- Handles automatic tool execution and result processing
- Provides tool execution callbacks with detailed input/output for web interface

**Batch Processor (`src/batch/processor.ts`)**
- Processes questions from CSV files with full tool execution tracking
- Supports concurrent processing with configurable parallelism
- Records detailed tool call logs including input/output and execution time
- Exports results in CSV or JSON format with comprehensive metadata
- Handles error recovery and provides detailed processing statistics

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

## Web Interface Features (v0.2.1+)

### Modern UI/UX Design
- Professional design system with consistent color palette and spacing
- Responsive layout that works on desktop, tablet, and mobile devices
- Smooth animations and transitions for better user experience
- Accessibility features including ARIA labels and keyboard navigation

### Chat Experience
- **Streaming Responses**: See LLM responses appear word by word in real-time
- **Markdown Support**: Rich formatting for code blocks, tables, lists, and links
- **Message Bubbles**: Clean, modern message design with user/assistant distinction
- **Auto-scrolling**: Automatic scroll to keep the latest messages visible

### Tool Execution Display
- **Collapsible Tool Details**: Click to expand/collapse tool execution information
- **Input/Output Display**: See detailed tool call parameters and results
- **Real-time Status**: Watch tool execution progress with status indicators
- **Error Handling**: Clear error messages with proper visual feedback

### Command Interface
- **Quick Commands**: Sidebar buttons for /help, /tools, /clear, /status
- **Slash Commands**: All CLI commands work in web interface with / prefix
- **Auto-completion**: System messages disappear automatically after 3 seconds
- **Command Feedback**: Clear confirmation messages for actions like /clear

### Sidebar Features
- **Collapsible Tool List**: Click to expand tool descriptions when needed
- **Tool Count Display**: Shows number of available tools
- **Independent Scrolling**: Tool list doesn't share scroll with chat area
- **Responsive Behavior**: Adapts to different screen sizes gracefully

### Session Management
- **Multiple Sessions**: Each browser tab maintains separate chat history
- **Session Persistence**: Chat history maintained during browser session
- **Clean State Management**: Proper cleanup when clearing chat history

### Internationalization (i18n)
- **Language Support**: Traditional Chinese (繁體中文, Taiwan) and English
- **Real-time Switching**: Change language instantly without page reload
- **Comprehensive Translation**: All UI elements, commands, and system messages
- **Persistent Settings**: Language preference saved in browser localStorage
- **Default Language**: Traditional Chinese for Taiwan users, with easy English toggle
- **Command Translation**: All slash commands (/help, /tools, etc.) responses translated
- **Localized Formatting**: Appropriate number and date formatting for each locale