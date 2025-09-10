import OpenAI from 'openai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export class OpenAIProvider {
  name = 'openai' as const;
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  }

  async chatJSON<T>(args: {
    system: string; user: string; temperature?: number; maxTokens?: number; schema?: z.ZodTypeAny; seed?: number;
  }): Promise<T> {
    const { system, user, temperature = 0.2, maxTokens = 2000, schema, seed } = args;

    const req: any = {
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature,
      max_tokens: maxTokens,
      response_format: schema
        ? { type: 'json_schema', json_schema: { name: 'schema', schema: zodToJsonSchema(schema, 'root') } }
        : { type: 'json_object' },
      ...(seed ? { seed } : {})
    };

    const res = await this.client.chat.completions.create(req);
    const content = res.choices?.[0]?.message?.content ?? '{}';
    let parsed: unknown;

    try {
      parsed = typeof content === 'string' ? JSON.parse(content) : content;
    } catch {
      // Single repair pass
      const repair = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Return ONLY valid JSON that matches the schema or a reasonable JSON object.' },
          { role: 'user', content: `Fix this into valid JSON:\n${content}` }
        ],
        temperature: 0.1,
        max_tokens: maxTokens,
        response_format: schema
          ? { type: 'json_schema', json_schema: { name: 'schema', schema: zodToJsonSchema(schema, 'root') } }
          : { type: 'json_object' }
      });
      parsed = JSON.parse(repair.choices?.[0]?.message?.content ?? '{}');
    }

    if (schema) {
      const check = schema.safeParse(parsed);
      if (!check.success) {
        throw new Error(`Schema validation failed: ${JSON.stringify(check.error.issues)}`);
      }
      return check.data as T;
    }
    return parsed as T;
  }
}