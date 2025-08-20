# MCP Lite Examples and Test Files

This directory contains example files and test data for MCP Lite's batch processing feature.

## Test CSV Files

### 🚀 quick-test.csv
**Purpose**: Quick functionality test with 3 simple questions
**Use case**: Initial testing and validation
```bash
npm run dev -- batch -i examples/quick-test.csv -o results-quick.csv
```

### 🧪 comprehensive-test.csv  
**Purpose**: Comprehensive test with 15 varied questions
**Coverage**: 
- Basic knowledge questions (geography, math, programming)
- Questions that might trigger MCP tool usage
- Mix of simple and complex queries

```bash
npm run dev -- batch -i examples/comprehensive-test.csv -o results-comprehensive.json -f json
```

### 🔧 mcp-tools-test.csv
**Purpose**: Focused on MCP tool execution
**Coverage**:
- File system operations (ls, read, find)
- Git operations (status)
- Search operations (grep)
- Directory navigation

```bash
npm run dev -- batch -i examples/mcp-tools-test.csv -o results-tools.csv -c 2
```

### 📊 sample-questions.csv
**Purpose**: Basic example for documentation
**Coverage**: Simple mixed questions for demonstration

## Testing Scenarios

### Scenario 1: Basic Functionality Test
```bash
# Test basic batch processing with simple questions
npm run dev -- batch -i examples/quick-test.csv -o test-basic.csv

# Expected: 3 questions processed, basic AI responses without tools
```

### Scenario 2: MCP Tools Integration Test
```bash
# Test MCP tool execution with file system operations
npm run dev -- batch -i examples/mcp-tools-test.csv -o test-tools.json -f json

# Expected: Tool calls for file operations, detailed tool logs
```

### Scenario 3: Concurrent Processing Test
```bash
# Test concurrent processing with multiple questions
npm run dev -- batch -i examples/comprehensive-test.csv -o test-concurrent.csv -c 3

# Expected: Faster processing, multiple questions handled in parallel
```

### Scenario 4: Error Handling Test
```bash
# Test error handling with stop-on-error option
npm run dev -- batch -i examples/comprehensive-test.csv -o test-errors.csv --stop-on-error

# Expected: Processing stops on first error (if any)
```

### Scenario 5: JSON Output Test
```bash
# Test JSON output format with detailed metadata
npm run dev -- batch -i examples/mcp-tools-test.csv -o test-output.json -f json

# Expected: Structured JSON with metadata and detailed tool call information
```

## Output Files Structure

After running batch tests, you'll get:

### CSV Output
- `results-*.csv`: Main results with questions and responses
- `results-*-tool-calls.csv`: Detailed tool execution logs (if tools were used)

### JSON Output  
- `results-*.json`: Complete structured data including:
  - Metadata (timestamps, statistics, options)
  - Individual question results
  - Complete tool call information

## Expected Tool Usage

Based on your MCP server configuration, these questions should trigger tools:

| Question Type | Likely Tools | Example |
|---------------|--------------|---------|
| File listing | filesystem tools | `ls`, `readdir` |
| File reading | filesystem tools | `read_file` |
| Directory info | filesystem tools | `pwd`, `stat` |
| Search operations | filesystem/grep tools | `find`, `grep` |
| Git operations | git tools | `git status` |

## Troubleshooting Test Results

### No Tools Executed
- Check if MCP servers are configured: `npm run dev servers`
- Verify server connections in batch output logs
- Questions might not require tools (pure knowledge questions)

### Tool Execution Failures
- Check MCP server status and permissions
- Review tool call logs in `-tool-calls.csv` files
- Verify file paths and permissions for filesystem operations

### Processing Errors
- Review error messages in the output files
- Check CSV format and encoding
- Verify LLM configuration and API keys

## Custom Test Creation

To create your own test CSV:

```csv
id,question,context,expectedResult
CUSTOM1,Your question here,Optional context,Expected answer
CUSTOM2,Another question,More context,Another expected answer
```

Remember:
- `id` is optional (auto-generated if missing)
- `context` and `expectedResult` are optional
- Questions that mention files/directories will likely trigger MCP tools
- Keep questions clear and specific for better results