// This is an automatically generated file. Please do not edit. If you want to edit the content,
// find the corresponding .genai.json file, make the changes and run genkit generate.
'use server';
/**
 * @fileOverview This file defines a Genkit flow for routing user queries to the appropriate tool or RAG pipeline.
 *
 * - routeQuery - A function that routes user queries.
 * - RouteQueryInput - The input type for the routeQuery function.
 * - RouteQueryOutput - The return type for the routeQuery function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RouteQueryInputSchema = z.object({
  query: z.string().describe('The user query.'),
});
export type RouteQueryInput = z.infer<typeof RouteQueryInputSchema>;

const RouteQueryOutputSchema = z.object({
  route: z.enum(['tool', 'rag']).describe('The route to take: tool or rag.'),
  reason: z.string().describe('The reason for choosing the route.'),
});
export type RouteQueryOutput = z.infer<typeof RouteQueryOutputSchema>;

export async function routeQuery(input: RouteQueryInput): Promise<RouteQueryOutput> {
  return routeQueryFlow(input);
}

const routeQueryPrompt = ai.definePrompt({
  name: 'routeQueryPrompt',
  input: {schema: RouteQueryInputSchema},
  output: {schema: RouteQueryOutputSchema},
  prompt: `Given the user query: {{{query}}}, determine whether to route the query to a tool or to a RAG pipeline.

If the query contains keywords like "calculate" or "define", then route to a tool.
Otherwise, route to a RAG pipeline.

Explain your reasoning in the reason field.
`,
});

const routeQueryFlow = ai.defineFlow(
  {
    name: 'routeQueryFlow',
    inputSchema: RouteQueryInputSchema,
    outputSchema: RouteQueryOutputSchema,
  },
  async input => {
    const {output} = await routeQueryPrompt(input);
    return output!;
  }
);
