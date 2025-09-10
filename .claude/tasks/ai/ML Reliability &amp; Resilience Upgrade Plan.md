# OpenAI Upgrade Plan (Nomad Navigator)

**Goal:** Make the AI stack reliable, resilient, observable, and easy to evolve—without adding another provider. This plan references the exact project structure and specifies where to create/modify files.

## 0) Flags, Models, and Conventions

- **LLM**: `gpt-4o-mini` (primary)
- **Extraction/Structuring Temp**: `0.1–0.2` (optionally set seed)
- **Creative Day Text Temp**: `0.6–0.8`
- **Output Mode**: `response_format: { type: 'json_object' }` or JSON Schema (preferred)
- **Validation**: `zod` schemas + single “repair pass”
- **Streaming**: SSE with day-level events (don’t stream token deltas)
- **Feature Flags** (boolean in config or env):
  - `ff.generator.unified` (default: `false`)
  - `ff.stream_sse` (default: `false`)
  - `ff.nlp.enhanced` (default: `false`)
  - `ff.resilience.cb` (default: `false`)
  - `ff.feedback.capture` (default: `false`)

---

## 1) Milestones & Acceptance Criteria

| Milestone | Output | Acceptance Criteria |
|---|---|---|
| **M1 Parser Reliability** | Fixed TTL cache; chrono dates; mini gazetteer; schema guards | Cache hit rate > 50% on repeats; ≥80% “medium/high” date confidence on golden set |
| **M2 Unified Generator** | UnifiedGenerator + OpenAI provider + schema-validated boundary | 100% outputs validate; latency parity ±10% vs current ultra-fast |
| **M3 Streaming (SSE)** | `/api/itineraries/stream` + per-day hydration | First bytes < 1s; cancel works; no dupes on resume |
| **M4 Resilience** | Timeouts/retries, circuit breakers, budgets, p95/p99 dashboards | Vendor hiccups degrade gracefully (no 5xx); dashboards live |
| **M5 Feedback/Learning** | Thumbs up/down + implicit edits + nightly aggregation | Thumbs-down → thumbs-up uplift ≥ +15% MoM |
| **M6 Quality Gates** | Golden set runner, regression gates, load & fuzz | CI blocks schema/latency/cost regressions; p95 SLA met |

---

## 2) Files to Create / Modify (by path)

### A) OpenAI Provider & Safe Boundary (M2)

**CREATE** `src/ai/utils/providers/types.ts`
```typescript
import { z } from 'zod';

export interface LLMProvider {
  name: 'openai';
  chatJSON<T>(args: {
    system: string;
    user: string;
    temperature?: number;
    maxTokens?: number;
    schema?: z.ZodTypeAny;
    seed?: number;
  }): Promise<T>;
}
```

**CREATE** `src/ai/utils/providers/openai.ts`
```typescript
import OpenAI from 'openai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export class OpenAIProvider {
  name = 'openai' as const;

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

    const res = await client.chat.completions.create(req);
    const content = res.choices?.[0]?.message?.content ?? '{}';
    let parsed: unknown;

    try {
      parsed = typeof content === 'string' ? JSON.parse(content) : content;
    } catch {
      // Single repair pass
      const repair = await client.chat.completions.create({
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
```

**CREATE** `src/ai/utils/safeChat.ts`
```typescript
import { z } from 'zod';
import type { LLMProvider } from './providers/types';

export async function safeChat<T>(
  provider: LLMProvider,
  system: string,
  user: string,
  schema: z.ZodSchema<T>,
  opts?: { temperature?: number; maxTokens?: number; seed?: number }
): Promise<T> {
  return provider.chatJSON<T>({
    system,
    user,
    schema,
    temperature: opts?.temperature ?? 0.2,
    maxTokens: opts?.maxTokens ?? 2000,
    seed: opts?.seed
  });
}
```

**MODIFY** `src/ai/openai-config.ts`
- Pin default model to `gpt-4o-mini`.
- Expose defaults (temperature for extraction vs creative).
- Ensure the exported `openai` client is used across utils.

### B) Zod Schemas (M2)

**MODIFY** `src/ai/schemas.ts` (append or refactor to include these shapes)
```typescript
import { z } from 'zod';

export const Activity = z.object({
  time: z.string().optional(),
  description: z.string().min(2),
  category: z.enum(['Work','Leisure','Food','Travel','Accommodation','Attraction']).optional(),
  address: z.string().optional(),
  venue_name: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  _tips: z.string().optional()
});

export const Day = z.object({
  day: z.number().int().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(2),
  _destination: z.string().min(2),
  activities: z.array(Activity).default([])
});

export const ItinerarySchema = z.object({
  destination: z.string().min(2),
  title: z.string().min(2),
  itinerary: z.array(Day).min(1),
  quickTips: z.array(z.string()).default([]),
  _costEstimate: z.object({
    total: z.number(),
    flights: z.number(),
    accommodation: z.number(),
    dailyExpenses: z.number(),
    currency: z.string(),
    breakdown: z.array(z.object({
      type: z.string(),
      description: z.string(),
      amount: z.number()
    }))
  }).optional(),
  _hotelOptions: z.any().optional(),
  _flightOptions: z.any().optional()
});
```

### C) Unified Generator (M2)

**CREATE** `src/ai/utils/unified-generator.ts`
```typescript
import { ItinerarySchema } from '../schemas';
import type { LLMProvider } from './providers/types';
import { safeChat } from './safeChat';

export interface GenerationContext {
  origin?: string;
  destinations: { city: string; days: number }[];
  startDate?: string;
  keys: { places?: boolean; weather?: boolean; amadeus?: boolean };
  flags: { stream?: boolean };
}

export class UnifiedGenerator {
  constructor(private llm: LLMProvider) {}

  async generate(ctx: GenerationContext, emit?: (evt: string, data: any)=>void) {
    const strategy = this.pickStrategy(ctx);
    return strategy(ctx, emit);
  }

  private pickStrategy(ctx: GenerationContext) {
    const n = ctx.destinations.length;
    const totalDays = ctx.destinations.reduce((a,b)=>a+b.days,0);
    const hasAPIs = !!(ctx.keys.places || ctx.keys.weather || ctx.keys.amadeus);
    if (n === 1 && totalDays <= 5) return this._simple.bind(this);
    if (hasAPIs && totalDays >= 6) return this._ultraFast.bind(this);
    return this._chunked.bind(this);
  }

  private async _simple(ctx: GenerationContext) {
    const system = 'You are a structured itinerary planner. Respond ONLY with valid JSON matching the schema.';
    const user = JSON.stringify({ ctx });
    return await safeChat(this.llm, system, user, ItinerarySchema, { temperature: 0.3, maxTokens: 3500 });
  }

  private async _chunked(ctx: GenerationContext, emit?: (evt: string, data: any)=>void) {
    // Generate per-destination or per-day, emit progressively.
    // Assemble and finally validate against ItinerarySchema.
    // (Implementation uses multiple safeChat calls and merges.)
    // TODO: implement similarly to enhanced ultra-fast, but split by chunks.
    return await this._simple(ctx); // temporary: keep simple until chunking filled
  }

  private async _ultraFast(ctx: GenerationContext, emit?: (evt: string, data: any)=>void) {
    // Reuse logic from enhanced generator:
    // - parallel OpenAI chunks + Places + Weather + Amadeus (if keys)
    // - enrich activities with venues/ratings
    // - emit day events via `emit('day', { index, data })`
    // Validate final object with ItinerarySchema.
    return await this._simple(ctx); // temporary: replace with real parallelization
  }
}
```

**MODIFY** `src/ai/flows/generate-personalized-itinerary.ts`
- If `ff.generator.unified` is true:
  - Build `GenerationContext` from `MasterTravelParser` result.
  - Instantiate `UnifiedGenerator` with new `OpenAIProvider()`.
  - Use `.generate(ctx, emit?)` to produce result (or stream).

### D) Streaming (SSE) (M3)

**CREATE** `src/app/api/itineraries/stream/route.ts` (Next.js App Router)
```typescript
import { NextRequest } from 'next/server';
import { UnifiedGenerator } from '@/src/ai/utils/unified-generator';
import { OpenAIProvider } from '@/src/ai/utils/providers/openai';
// import and run MasterTravelParser to create ctx from ?q=

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start: async (controller) => {
      const send = (event: string, data: unknown, id?: string) => {
        let payload = '';
        if (id) payload += `id: ${id}\n`;
        payload += `event: ${event}\n`;
        payload += `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      try {
        send('meta', { title: 'Building your itinerary…' }, '0');

        // TODO: parse input -> ctx via MasterTravelParser
        const ctx = { destinations: [{ city: 'Paris', days: 3 }], keys: {}, flags: { stream: true } };

        const provider = new OpenAIProvider();
        const gen = new UnifiedGenerator(provider);

        await gen.generate(ctx as any, (evt, data) => {
          const id = evt === 'day' && (data?.index != null) ? String(data.index) : undefined;
          send(evt, data, id);
        });

        send('done', { ok: true }, 'final');
      } catch (e: any) {
        send('error', { message: e?.message ?? 'unknown' }, 'err');
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    }
  });
}
```

**MODIFY** `src/components/chat/chat-container.tsx`
- Open `EventSource('/api/itineraries/stream?q=...')`.
- Handle events: `meta`, `day`, `costs`, `error`, `done`.
- Show skeletons until first day.
- Support cancellation (close `EventSource`).
- Optional: Resume via `Last-Event-ID`.

### E) Parser Reliability (M1)

**MODIFY** `src/lib/utils/master-parser.ts`
- Fix TTL cache bug
  ```typescript
  // When caching (where result is built):
  const resultToCache = { ...result, cachedAt: Date.now() };
  parseCache.set(key, resultToCache);

  // getFromCache:
  private static getFromCache(key: string): ParsedTravelRequest | null {
    const cached = parseCache.get(key) as (ParsedTravelRequest & { cachedAt?: number }) | undefined;
    if (cached?.cachedAt && Date.now() - cached.cachedAt < CACHE_TTL) return cached;
    if (cached) parseCache.delete(key);
    return null;
  }
  ```
- Add `chrono-node` support. Install, then merge results with `TravelDateParser.inferTravelDates`.
- **Gazetteer**: Create `data/static/cities-mini.json` (2–5k popular cities with aliases). Enhance `extractEntities` to normalize and map aliases.
- **Input Hygiene**: Ensure `TravelInputValidator` strips PII, compresses whitespace, and trims punctuation.

### F) Resilience/Observability (M4)

**CREATE** `src/lib/utils/retry.ts`
```typescript
export async function withRetry<T>(fn: () => Promise<T>, opts = { retries: 1, timeoutMs: 10000 }) {
  let lastErr: any;
  for (let i=0; i<=opts.retries; i++) {
    try {
      return await Promise.race([
        fn(),
        new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')), opts.timeoutMs))
      ]);
    } catch (e) {
      lastErr = e;
      await new Promise(r=>setTimeout(r, 250 * (i+1) * (0.5 + Math.random())));
    }
  }
  throw lastErr;
}
```

**CREATE** `src/lib/utils/circuit.ts`
```typescript
export class Circuit {
  private state: 'CLOSED'|'OPEN'|'HALF_OPEN' = 'CLOSED';
  private fails = 0; private openedAt = 0;
  constructor(private threshold=5, private cooldownMs=60000) {}
  canCall(){ if (this.state==='OPEN' && Date.now()-this.openedAt>this.cooldownMs){ this.state='HALF_OPEN'; return true; } return this.state!=='OPEN'; }
  success(){ this.fails=0; this.state='CLOSED'; }
  fail(){ this.fails++; if (this.fails>=this.threshold){ this.state='OPEN'; this.openedAt=Date.now(); } }
}
```
- Track metrics: latency, tokens, cost.
- Enforce per-request token budgets.

### G) Feedback & Learning (M5)

**CREATE** `src/app/api/feedback/route.ts`
```typescript
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json(); // { session_id, prompt_hash, item_type, item_id, action, payload, model_info }
  // TODO: persist to DB or write to /data/learned/feedback.jsonl
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
```
- Capture explicit (thumbs up/down) and implicit (edits) events from UI.
- Nightly aggregation script to compute hotspots and generate prompt/config patches.

### H) Testing & Quality Gates (M6)

**CREATE** `scripts/run-golden.ts`
```typescript
// Run a set of canonical prompts through UnifiedGenerator,
// validate with ItinerarySchema, record latency & token usage.
```

**CREATE** `tests/ai/golden.spec.ts`
```typescript
// CI test: load prompts, ensure schema validity and latency under threshold.
```

**CREATE** `tests/integration/streaming.spec.ts`
```typescript
// Connect to /api/itineraries/stream, assert first bytes < 1s, receive day events.
```

**CREATE** `tests/unit/resilience.spec.ts`
```typescript
// Test retry + circuit logic with fake providers.
```

---

## 3) Fixes to Existing Code

- **`src/ai/utils/enhanced-generator-ultra-fast.ts`**:
  - Remove duplicate functions (`batchFetchFlights`, `batchFetchHotels`).
  - Add explicit types to reducers:
    ```typescript
    flights.reduce((sum: number, f: any) => sum + (f.price?.total || 0), 0)
    flights.reduce((min: string, f: any) => { const d = f.duration || 'PT99H'; return d < min ? d : min; }, 'PT99H')
    ```
  - Ensure all OpenAI calls use `gpt-4o-mini` and JSON output modes.

---

## 4) Docs

**CREATE** `docs/architecture/ai-processing-flow.md` (overwrite or update)
- Reflect `UnifiedGenerator`, SSE, OpenAI-only provider, and resilience layers.
- Include sequence diagram for streaming events and provider fallbacks.

---

## 5) Config & Env

- **`.env`**: `OPENAI_API_KEY=...`
- **Optional**: `GOOGLE_API_KEY`, `OPENWEATHERMAP`, `AMADEUS_API_KEY`, `AMADEUS_API_SECRET`
- **Feature Flags**: in `src/ai/config.ts` expose `ff.*` booleans

---

## 6) Rollout Plan (Flags-First)

1.  Enable M1 (`ff.nlp.enhanced`) → verify cache/date metrics.
2.  Gate `UnifiedGenerator` with `ff.generator.unified` and test parity.
3.  Release SSE (`ff.stream_sse`) at 10% traffic → 100% after stability.
4.  Turn on Resilience (`ff.resilience.cb`); simulate outages.
5.  Enable Feedback (`ff.feedback.capture`); run nightly aggregation; apply patches.
6.  Keep dashboards up; block regressions with tests.

---

## 7) Claude Tasks (drop these in /.claude/tasks/)

- `M1_parser_reliability.md`
- `M2_unified_generator.md`
- `M3_streaming.md`
- `M4_resilience_observability.md`
- `M5_feedback.md`
- `M6_testing.md`

---

## 8) Definition of Done (per milestone)

- Code merged with tests; no `any` at public boundaries.
- `ItinerarySchema` validates 100% of LLM outputs.
- Dashboards live; alerts configured; runbook updated.
- Golden set stable; p95 SLA and cost budgets respected.