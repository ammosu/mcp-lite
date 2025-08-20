# MCP Lite Batch Processing Guide

The batch processing feature allows you to process multiple questions from a CSV file and automatically execute MCP tools, recording all interactions and results.

## Quick Start

```bash
# Basic usage
npm run dev -- batch -i questions.csv -o results.csv

# With options
npm run dev -- batch \
  -i examples/sample-questions.csv \
  -o results.json \
  -f json \
  -c 3 \
  -t 0.8 \
  --stop-on-error
```

## CSV Input Format

Your input CSV file should have the following columns:

| Column | Required | Description |
|--------|----------|-------------|
| `id` | Optional | Unique identifier for the question (auto-generated if missing) |
| `question` | Required | The question to ask the AI |
| `context` | Optional | Additional context for the question |
| `expectedResult` | Optional | Expected answer (for comparison/validation) |

### Example CSV:
```csv
id,question,context,expectedResult
Q1,What is the capital of France?,Geography questions,Paris
Q2,Calculate 25 * 17,Mathematics problems,425
Q3,List files in current directory,Use available MCP tools,File listing output
```

## Command Options

| Option | Description | Default |
|--------|-------------|---------|
| `-i, --input <file>` | Input CSV file path | Required |
| `-o, --output <file>` | Output file path | Required |
| `-f, --format <format>` | Output format: `csv` or `json` | `csv` |
| `-c, --concurrency <number>` | Max concurrent requests | `1` |
| `-t, --temperature <number>` | Temperature for LLM | `0.7` |
| `-m, --max-tokens <number>` | Maximum tokens per response | `2000` |
| `--no-context` | Exclude context column from output | `false` |
| `--stop-on-error` | Stop processing on first error | `false` |

## Output Formats

### CSV Output

The main results CSV includes:
- `id`: Question identifier
- `question`: Original question
- `response`: AI's response
- `success`: Whether processing succeeded
- `error`: Error message (if any)
- `processingTime`: Time taken in milliseconds
- `toolCallCount`: Number of tools executed
- `toolCallsSummary`: List of tool names used
- `context`: Original context (if `--no-context` not used)
- `expectedResult`: Expected result (if provided)

A separate `*-tool-calls.csv` file contains detailed tool execution logs:
- `questionId`: Which question this tool call belongs to
- `question`: The original question
- `toolName`: Name of the executed tool
- `toolCallId`: Unique identifier for this tool call
- `input`: Tool input parameters
- `output`: Tool execution result
- `success`: Whether tool execution succeeded
- `error`: Error message (if any)
- `timestamp`: When the tool was executed

### JSON Output

JSON output includes all the same data in a structured format with additional metadata:

```json
{
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "totalQuestions": 5,
    "successCount": 4,
    "errorCount": 1,
    "options": { ... }
  },
  "results": [
    {
      "id": "Q1",
      "question": "What is 2 + 2?",
      "response": "2 + 2 equals 4.",
      "toolCalls": [],
      "success": true,
      "processingTime": 1250
    }
    // ... more results
  ]
}
```

## Features

### Tool Execution Tracking
- Automatically records all MCP tool calls with full input/output
- Tracks execution time for each tool call
- Records success/failure status for each operation
- Provides detailed error messages for debugging

### Concurrent Processing
- Configure concurrency with `-c` option for faster processing
- Sequential processing (concurrency=1) provides better progress visibility
- Higher concurrency reduces total processing time but uses more resources

### Error Handling
- Individual question failures don't stop the entire batch
- Use `--stop-on-error` to halt processing on first error
- Detailed error reporting for troubleshooting
- Failed questions still recorded in output with error details

### Progress Tracking
- Real-time progress display with question numbers
- Processing time tracking for performance analysis
- Success/failure statistics at completion
- Clear indication of current operation status

## Best Practices

1. **Start Small**: Test with a few questions first
2. **Use Sequential Processing**: Use concurrency=1 for initial testing and debugging
3. **Monitor Resources**: Higher concurrency uses more memory and API quota
4. **Check Errors**: Always review failed questions and tool execution errors
5. **Backup Results**: Save outputs with timestamps for historical tracking

## Troubleshooting

**No tools available**: Ensure MCP servers are configured and running
**High memory usage**: Reduce concurrency or process in smaller batches
**API rate limits**: Reduce concurrency or add delays between requests
**CSV parsing errors**: Check CSV format and escape special characters
**Tool execution failures**: Verify MCP server connections and tool availability

## Example Workflow

```bash
# 1. Prepare your questions CSV
echo "id,question" > my-questions.csv
echo "Q1,What is the weather like today?" >> my-questions.csv
echo "Q2,List the files in the current directory" >> my-questions.csv

# 2. Run batch processing
npm run dev -- batch -i my-questions.csv -o results.json -f json

# 3. Review results
cat results.json | jq '.metadata'
```

This will process your questions, execute any necessary MCP tools, and save detailed results including all tool interactions.