import { z } from 'genkit';
import { openai, MODEL_CONFIG, logOpenAICall } from '../openai-config';

/**
 * OpenAI provider for Genkit
 * Wraps OpenAI API calls in a Genkit-compatible interface
 */

export const openAIModel = (modelName: string = 'gpt-4o-mini') => ({
  name: `openai/${modelName}`,
  
  async generate(options: {
    messages: Array<{ role: string; content: string }>;
    config?: any;
    tools?: any[];
    prompt?: string;
  }) {
    const startTime = Date.now();
    
    // Log the request
    logOpenAICall('Request', {
      model: modelName,
      messageCount: options.messages?.length || 0,
      hasTools: !!options.tools?.length,
      promptLength: options.prompt?.length || 0,
    });

    try {
      // Check if OpenAI client is available
      if (!openai) {
        throw new Error('OpenAI client not initialized - check OPENAI_API_KEY');
      }

      // Format messages for OpenAI
      const messages = options.messages || [];
      if (options.prompt) {
        messages.push({ role: 'user', content: options.prompt });
      }

      // Prepare the request
      const request = {
        model: modelName,
        messages: messages as any,
        temperature: options.config?.temperature || MODEL_CONFIG.temperature,
        max_tokens: options.config?.maxOutputTokens || MODEL_CONFIG.max_tokens,
        response_format: MODEL_CONFIG.response_format,
      };

      // Make the API call
      const response = await openai.chat.completions.create(request);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Log the response
      logOpenAICall('Response', {
        model: modelName,
        duration: `${duration}ms`,
        usage: response.usage,
        finishReason: response.choices[0]?.finish_reason,
      });

      // Parse the JSON response
      const content = response.choices[0]?.message?.content || '{}';
      let output;
      try {
        output = JSON.parse(content);
      } catch (e) {
        console.error('Failed to parse OpenAI response as JSON:', e);
        output = { error: 'Failed to parse response', content };
      }

      return {
        output,
        usage: {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      };
    } catch (error: any) {
      logOpenAICall('Error', {
        model: modelName,
        error: error.message,
        code: error.code,
      });
      throw error;
    }
  },

  // Support for tool calls (for weather, places, etc.)
  async generateWithTools(options: {
    messages: Array<{ role: string; content: string }>;
    tools: any[];
    config?: any;
  }) {
    const startTime = Date.now();
    
    logOpenAICall('Request with Tools', {
      model: modelName,
      messageCount: options.messages.length,
      toolCount: options.tools.length,
    });

    try {
      // Convert Genkit tools to OpenAI function format
      const functions = options.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      }));

      const response = await openai.chat.completions.create({
        model: modelName,
        messages: options.messages as any,
        functions,
        function_call: 'auto',
        temperature: options.config?.temperature || MODEL_CONFIG.temperature,
        max_tokens: options.config?.maxOutputTokens || MODEL_CONFIG.max_tokens,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      logOpenAICall('Response with Tools', {
        model: modelName,
        duration: `${duration}ms`,
        usage: response.usage,
        toolCalls: response.choices[0]?.message?.function_call?.name,
      });

      return {
        output: response.choices[0]?.message,
        usage: {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      };
    } catch (error: any) {
      logOpenAICall('Error with Tools', {
        model: modelName,
        error: error.message,
      });
      throw error;
    }
  },
});

// Export the default model
export const gpt4oMini = openAIModel('gpt-4o-mini');