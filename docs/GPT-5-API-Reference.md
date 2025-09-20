# GPT-5 API Reference Guide

## Overview
OpenAI GPT-5 uses the new **Responses API** (`client.responses.create()`), NOT the older Chat Completions API. This is a critical distinction from GPT-4 and earlier models.

## Core API Structure

### Basic Text Generation
```javascript
import OpenAI from "openai";
const client = new OpenAI();

const response = await client.responses.create({
    model: "gpt-5",
    input: "Your prompt here"
});

console.log(response.output_text);
```

### Key Differences from GPT-4
- **Method**: `responses.create()` instead of `chat.completions.create()`
- **Input**: Single `input` field instead of `messages` array
- **Output**: `response.output_text` instead of `response.choices[0].message.content`
- **No `response_format`**: JSON mode is handled differently
- **No `temperature`/`max_tokens` in basic calls**: Use reasoning configuration

## Available Tools

### 1. Web Search
```javascript
const response = await client.responses.create({
    model: "gpt-5",
    tools: [{ type: "web_search" }],
    input: "What happened in tech news today?"
});
```

**Features:**
- Domain filtering with `allowed_domains`
- Geographic customization with `user_location`
- Sources tracking for citations
- Real-time information retrieval

### 2. Function Calling
```javascript
const response = await client.responses.create({
    model: "gpt-5",
    tools: [
        {
            type: "function",
            name: "get_weather",
            description: "Get current weather",
            parameters: {
                type: "object",
                properties: {
                    location: { type: "string" }
                },
                required: ["location"]
            },
            strict: true  // Recommended for reliability
        }
    ],
    input: "What's the weather in Paris?"
});

// Handle function calls in response.output
for (const item of response.output) {
    if (item.type === "function_call") {
        // Execute function and return result
    }
}
```

### 3. File Search
```javascript
const response = await client.responses.create({
    model: "gpt-5",
    tools: [{
        type: "file_search",
        vector_store_ids: ["vector_store_id"],
        max_num_results: 5
    }],
    input: "Find information about project requirements"
});
```

### 4. Code Interpreter
```javascript
const response = await client.responses.create({
    model: "gpt-5",
    tools: [{
        type: "code_interpreter",
        container: { type: "auto" }
    }],
    instructions: "You are a data analyst",
    input: "Analyze this CSV data and create a graph"
});
```

### 5. MCP (Model Context Protocol) Tools
```javascript
// Remote MCP Server
const response = await client.responses.create({
    model: "gpt-5",
    tools: [{
        type: "mcp",
        server_label: "my_server",
        server_url: "https://example.com/mcp",
        require_approval: "always"  // or "never" for trusted servers
    }],
    input: "Use the MCP server to process this request"
});

// Connectors (built-in services)
const response = await client.responses.create({
    model: "gpt-5",
    tools: [{
        type: "mcp",
        connector_id: "connector_googledrive",
        authorization: "oauth_token_here"
    }],
    input: "Search my Google Drive for budget documents"
});
```

Available Connectors:
- `connector_dropbox`
- `connector_gmail`
- `connector_googlecalendar`
- `connector_googledrive`
- `connector_microsoftteams`
- `connector_outlookcalendar`
- `connector_outlookemail`
- `connector_sharepoint`

### 6. Custom Tools
```javascript
const response = await client.responses.create({
    model: "gpt-5",
    tools: [{
        type: "custom",
        name: "code_exec",
        description: "Executes Python code",
        format: {
            type: "grammar",
            syntax: "lark",  // or "regex"
            definition: "your_grammar_here"
        }
    }],
    input: "Execute some Python code"
});
```

## Reasoning Configuration

GPT-5 supports different reasoning levels:
```javascript
const response = await client.responses.create({
    model: "gpt-5",
    reasoning: {
        effort: "high"  // "low", "medium", or "high"
    },
    input: "Complex problem requiring deep analysis"
});
```

## Streaming

```javascript
const stream = await client.responses.create({
    model: "gpt-5",
    input: "Tell me a story",
    stream: true
});

for await (const event of stream) {
    console.log(event);
}
```

## Important Implementation Notes

### For Travel/Itinerary Applications

When implementing AI-powered travel planning with GPT-5:

1. **Prompt Structure**: Combine system instructions with user input in a single `input` field:
```javascript
const response = await client.responses.create({
    model: "gpt-5",
    input: `You are a travel planner. Extract travel information from: "${userMessage}"

    Return as JSON with fields:
    - destination
    - startDate (YYYY-MM-DD)
    - duration (days)
    - travelers
    `
});
```

2. **JSON Extraction**: Since there's no `response_format: { type: 'json_object' }`, parse JSON from output:
```javascript
const content = response.output_text;
const jsonMatch = content.match(/\{[\s\S]*\}/);
if (jsonMatch) {
    const data = JSON.parse(jsonMatch[0]);
}
```

3. **Error Handling**: Always check for `response.output_text` existence
4. **Context Management**: Pass conversation history in the `input` field

### Migration from GPT-4 to GPT-5

| GPT-4 (Chat Completions) | GPT-5 (Responses) |
|--------------------------|-------------------|
| `client.chat.completions.create()` | `client.responses.create()` |
| `messages: [{role, content}]` | `input: "string"` |
| `response.choices[0].message.content` | `response.output_text` |
| `response_format: {type: 'json_object'}` | Parse JSON from output_text |
| `temperature`, `max_tokens` params | Use `reasoning: {effort}` |
| `functions` parameter | `tools` with type "function" |

## Best Practices

1. **Always use strict mode** for function calling when possible
2. **Implement proper error handling** for tool calls
3. **Use approvals** for MCP servers until trust is established
4. **Combine tools** for complex workflows
5. **Monitor token usage** with multiple tools enabled
6. **Cache container IDs** for Code Interpreter reuse
7. **Download generated files** before container expiry (20 min)
8. **Validate OAuth tokens** before using connectors
9. **Log MCP tool calls** for security auditing
10. **Use web search** for current information needs

## Security Considerations

1. **MCP Servers**: Only connect to trusted servers
2. **OAuth Tokens**: Never log or store in plain text
3. **Function Calling**: Validate all arguments before execution
4. **Web Search**: Be cautious with URLs in responses
5. **File Search**: Limit vector store access appropriately
6. **Code Interpreter**: Review generated code before production use

## Rate Limits and Pricing

- Web search has tiered rate limits matching model limits
- Tool calls incur additional costs
- Code Interpreter containers expire after 20 minutes of inactivity
- File search limited to 128k context window
- MCP calls subject to third-party service limits

## Troubleshooting

### Common Issues

1. **"No response from OpenAI"**: Check `output_text` field exists
2. **JSON parsing fails**: Look for JSON within the text response
3. **Tool not called**: Ensure tool_choice is set appropriately
4. **MCP approval needed**: Handle approval requests in conversation flow
5. **Container expired**: Create new container and re-upload files

### Model Limitations

- GPT-5 with minimal reasoning doesn't support web search
- No web search in gpt-4.1-nano
- Function calling may be best-effort without strict mode
- Some JSON schema features unsupported in strict mode
- Deep research tasks can take several minutes

## Testing in Firebase IDE Environment

**IMPORTANT**: In Firebase IDE, the app is ALWAYS running automatically. Never use `npm run dev`.

To test the AI:
1. Open the Firebase preview URL in your browser
2. Use the browser console to run test scripts
3. Or navigate to the app and test manually

## Example: Complete Travel Assistant Implementation

```javascript
import OpenAI from "openai";

class TravelAssistant {
    constructor() {
        this.client = new OpenAI();
    }

    async processUserRequest(message, context = null) {
        const systemPrompt = `You are a travel planning assistant.
        Extract travel details and return as JSON with fields:
        destination, startDate, duration, travelers.
        Be thorough in parsing dates and durations.`;

        const fullInput = context
            ? `${systemPrompt}\n\nContext: ${context}\n\nUser: ${message}`
            : `${systemPrompt}\n\nUser: ${message}`;

        try {
            const response = await this.client.responses.create({
                model: "gpt-5",
                input: fullInput,
                tools: [
                    { type: "web_search" },  // For current info
                    {
                        type: "function",
                        name: "check_availability",
                        description: "Check hotel/flight availability",
                        parameters: {
                            type: "object",
                            properties: {
                                destination: { type: "string" },
                                dates: { type: "string" }
                            },
                            required: ["destination", "dates"]
                        },
                        strict: true
                    }
                ]
            });

            // Process response
            const output = response.output_text;

            // Extract JSON if present
            const jsonMatch = output.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return {
                    success: true,
                    data: JSON.parse(jsonMatch[0]),
                    fullResponse: output
                };
            }

            // Handle function calls
            for (const item of response.output || []) {
                if (item.type === "function_call") {
                    // Process function call
                }
            }

            return {
                success: true,
                message: output
            };

        } catch (error) {
            console.error("GPT-5 API Error:", error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}
```

## References

- [OpenAI Responses API Documentation](https://platform.openai.com/docs/api-reference/responses)
- [Tool Calling Guide](https://platform.openai.com/docs/guides/function-calling)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Web Search Documentation](https://platform.openai.com/docs/guides/web-search)

---

**Last Updated**: January 2025
**Model**: GPT-5 (Responses API)
**Status**: Production Ready