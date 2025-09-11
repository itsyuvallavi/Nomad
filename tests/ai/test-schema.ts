import { zodToJsonSchema } from 'zod-to-json-schema';
import { ItinerarySchema } from './src/ai/schemas';

const jsonSchema = zodToJsonSchema(ItinerarySchema, 'root');
console.log('Generated JSON Schema:');
console.log(JSON.stringify(jsonSchema, null, 2));