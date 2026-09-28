import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';
import { createLogger } from './logger.js';

const log = createLogger('llm');

const client = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

export interface LLMRequest {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Send a message to Claude and get a response.
 * Handles retries and error logging.
 */
export async function callLLM(request: LLMRequest): Promise<LLMResponse> {
  const { systemPrompt, userMessage, maxTokens = 4096, temperature = 0.2 } = request;

  log.debug({ messageLength: userMessage.length }, 'Calling Claude API');

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    const textContent = response.content.find((block) => block.type === 'text');
    const content = textContent ? textContent.text : '';

    log.debug(
      {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      'Claude API response received'
    );

    return {
      content,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch (error) {
    log.error({ error }, 'Claude API call failed');
    throw error;
  }
}

/**
 * Call Claude and parse the response as JSON.
 * Extracts JSON from markdown code blocks if present.
 */
export async function callLLMJson<T>(request: LLMRequest): Promise<T> {
  const response = await callLLM(request);
  let content = response.content.trim();

  // Extract JSON from markdown code blocks if present
  const jsonBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonBlockMatch) {
    content = jsonBlockMatch[1].trim();
  }

  try {
    return JSON.parse(content) as T;
  } catch {
    log.error({ content }, 'Failed to parse LLM response as JSON');
    throw new Error(`Failed to parse LLM response as JSON: ${content.slice(0, 200)}`);
  }
}
