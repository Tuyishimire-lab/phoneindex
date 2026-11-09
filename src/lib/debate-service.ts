/**
 * Debate Service — AI Intelligence & Local Deterministic Synthesis
 *
 * Provides prompt injection sanitization, 4-persona multi-round debate synthesis,
 * and resilient SSE streaming with automatic local deterministic fallback when
 * external LLM API keys (OpenRouter/Gemini) are absent or unreachable.
 */

import { stripEmDashes, AI_EDITORS, EditorPersonaId } from "./editors";
import { SmartphoneDevice } from "./seed-data";
import {
  DebateResponse,
  generateGroundedDebate,
} from "./debate-engine";

export const MAX_PROMPT_LENGTH = 500;

export interface DebateServiceOptions {
  prompt?: string;
  query?: string;
  deviceA: SmartphoneDevice;
  deviceB: SmartphoneDevice;
  weights?: Record<string, number>;
}

/**
 * Prompt sanitization utility (Feature #29)
 *
 * - Enforces maximum prompt length of 500 characters.
 * - Neutralizes XML and HTML tag breakouts (<, >).
 * - Neutralizes template literal delimiters (${, {{, }}).
 * - Strips and normalizes em-dashes and hyphens.
 */
export function sanitizeDebatePrompt(query: string): string {
  if (!query) {
    return "";
  }

  return query
    .slice(0, MAX_PROMPT_LENGTH)
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\$\{/g, "$")
    .replace(/\{\{/g, "{")
    .replace(/\}\}/g, "}")
    .replace(/\s*[\u2013\u2014\u2015]\s*/g, " - ")
    .replace(/\s*--\s*/g, " - ")
    .trim();
}

/**
 * Synthesizes a structured debate using local deterministic rules,
 * incorporating optional priority weights to adjust panel consensus.
 */
export function synthesizeGroundedDebate(
  options: DebateServiceOptions
): DebateResponse {
  const rawQuery = options.prompt || options.query || "Best overall flagship balance";
  const cleanPrompt = sanitizeDebatePrompt(rawQuery);

  const baseDebate = generateGroundedDebate({
    query: cleanPrompt,
    deviceA: options.deviceA,
    deviceB: options.deviceB,
  });

  const weights = options.weights;
  if (!weights || Object.keys(weights).length === 0) {
    return baseDebate;
  }

  // Adjust score deltas if custom user weights were provided
  let scoreA = options.deviceA.compositeLivingScore;
  let scoreB = options.deviceB.compositeLivingScore;

  const siliconWeight =
    weights.SILICON_GEEK ?? weights.silicon ?? weights.performance ?? 1.0;
  const cameraWeight =
    weights.CAMERA_PURIST ?? weights.camera ?? weights.optics ?? 1.0;
  const pragmatistWeight =
    weights.PRAGMATIST ?? weights.value ?? weights.longevity ?? 1.0;
  const dailyWeight =
    weights.DAILY_DRIVER ?? weights.battery ?? weights.ergonomics ?? 1.0;

  scoreA += options.deviceA.verdicts.SILICON_GEEK.score * (siliconWeight - 1.0) * 0.4;
  scoreB += options.deviceB.verdicts.SILICON_GEEK.score * (siliconWeight - 1.0) * 0.4;

  scoreA += options.deviceA.verdicts.CAMERA_PURIST.score * (cameraWeight - 1.0) * 0.4;
  scoreB += options.deviceB.verdicts.CAMERA_PURIST.score * (cameraWeight - 1.0) * 0.4;

  scoreA += options.deviceA.verdicts.PRAGMATIST.score * (pragmatistWeight - 1.0) * 0.4;
  scoreB += options.deviceB.verdicts.PRAGMATIST.score * (pragmatistWeight - 1.0) * 0.4;

  scoreA += options.deviceA.verdicts.DAILY_DRIVER.score * (dailyWeight - 1.0) * 0.4;
  scoreB += options.deviceB.verdicts.DAILY_DRIVER.score * (dailyWeight - 1.0) * 0.4;

  const consensusWinner = scoreA >= scoreB ? options.deviceA : options.deviceB;
  const runnerUp = consensusWinner.id === options.deviceA.id ? options.deviceB : options.deviceA;

  const fullWinnerName = consensusWinner.name.toLowerCase().startsWith(consensusWinner.brand.toLowerCase())
    ? consensusWinner.name
    : `${consensusWinner.brand} ${consensusWinner.name}`;

  return {
    ...baseDebate,
    scenarioTitle: cleanPrompt,
    consensusWinnerId: consensusWinner.id,
    consensusWinnerName: consensusWinner.name,
    consensusSummary: stripEmDashes(
      `Weighted by your customized priorities, the Editorial Panel awards the recommendation to the ${fullWinnerName} ($${
        consensusWinner.currentStreetUsd
      } street price, ${
        consensusWinner.compositeLivingScore
      } Living Score). Consider the ${runnerUp.name} ($${
        runnerUp.currentStreetUsd
      }) only if ${runnerUp.verdicts.CAMERA_PURIST.pros[0].toLowerCase()} is an absolute requirement.`
    ),
  };
}

/**
 * Builds sequential text phrases representing each round of the debate.
 */
function buildDebateStreamChunks(
  debate: DebateResponse,
  deviceA: SmartphoneDevice,
  deviceB: SmartphoneDevice
): Array<{ chunk: string; editorId?: EditorPersonaId }> {
  const chunks: Array<{ chunk: string; editorId?: EditorPersonaId }> = [];

  // Header introduction
  chunks.push({
    chunk: `### Editorial Panel Scenario Crossfire\n**Query**: "${debate.scenarioTitle}"\nContenders: **${deviceA.name}** vs **${deviceB.name}**\n\n`,
  });

  // 4 Editor Turns
  for (const turn of debate.turns) {
    const editor = AI_EDITORS[turn.editorId];
    chunks.push({
      chunk: `#### Round: ${editor.name} (${editor.roleTitle})\n`,
      editorId: turn.editorId,
    });
    chunks.push({
      chunk: `*Stance*: ${turn.stanceBadge}\n\n`,
      editorId: turn.editorId,
    });

    // Split turn message into natural sentence chunks
    const sentences = turn.message.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      if (sentence.trim()) {
        chunks.push({
          chunk: `${sentence} `,
          editorId: turn.editorId,
        });
      }
    }

    chunks.push({
      chunk: `\n*Supporting Evidence*: ${turn.citedMetric}\n\n`,
      editorId: turn.editorId,
    });
  }

  // Panel Consensus
  chunks.push({
    chunk: `### Panel Consensus (${debate.confidencePct}% Confidence)\n`,
  });
  chunks.push({
    chunk: `**Recommended Pick: ${debate.consensusWinnerName}**\n\n`,
  });
  chunks.push({
    chunk: `${debate.consensusSummary}\n`,
  });

  return chunks;
}

/**
 * Attempts an external LLM completion via OpenRouter / Gemini API.
 * Returns null if keys are absent or the request fails.
 */
async function tryExternalLlmDebate(
  options: DebateServiceOptions,
  cleanPrompt: string
): Promise<string | null> {
  const apiKey =
    process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const isGemini = Boolean(process.env.GEMINI_API_KEY && !process.env.OPENROUTER_API_KEY);
  const endpoint = isGemini
    ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
    : "https://openrouter.ai/api/v1/chat/completions";

  const systemPrompt = `You are a panel of 4 smartphone editors (Silicon Geek, Camera Purist, Pragmatist, Daily Driver) debating ${options.deviceA.name} vs ${options.deviceB.name}. Ground every statement in their actual hardware specs. Output a 4-round debate followed by a consensus verdict.`;
  const userContent = `User query: "${cleanPrompt}". Device A: ${options.deviceA.brand} ${options.deviceA.name} ($${options.deviceA.currentStreetUsd}, ${options.deviceA.specs.socName}, ${options.deviceA.specs.batteryCapacityMah}mAh). Device B: ${options.deviceB.brand} ${options.deviceB.name} ($${options.deviceB.currentStreetUsd}, ${options.deviceB.specs.socName}, ${options.deviceB.specs.batteryCapacityMah}mAh).`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: isGemini
        ? { "Content-Type": "application/json" }
        : {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://phoneindex.ai",
            "X-Title": "PhoneIndex Debate Arena",
          },
      body: JSON.stringify(
        isGemini
          ? {
              contents: [
                {
                  role: "user",
                  parts: [{ text: `${systemPrompt}\n\n${userContent}` }],
                },
              ],
            }
          : {
              model: "meta-llama/llama-3.3-70b-instruct",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userContent },
              ],
              max_tokens: 1000,
              temperature: 0.7,
            }
      ),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (isGemini) {
      return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    }
    return data?.choices?.[0]?.message?.content ?? null;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Creates an SSE ReadableStream that yields sequential debate chunks
 * formatted as `data: {"chunk": "..."}\n\n` and terminates with `data: [DONE]\n\n`.
 *
 * Guarantees zero unhandled exceptions: falls back to local deterministic debate
 * if external API keys are missing or unreachable.
 */
export function createDebateStream(
  options: DebateServiceOptions
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const rawQuery = options.prompt || options.query || "Best overall flagship balance";
  const cleanPrompt = sanitizeDebatePrompt(rawQuery);

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // 1. Check for external LLM API if keys exist
        let externalTranscript: string | null = null;
        try {
          externalTranscript = await tryExternalLlmDebate(options, cleanPrompt);
        } catch {
          externalTranscript = null;
        }

        // 2. Compute grounded debate response
        const debate = synthesizeGroundedDebate(options);

        if (externalTranscript) {
          // Stream external transcript chunks
          const phrases = externalTranscript.split(/(?<=\n|\. )/);
          for (const phrase of phrases) {
            if (phrase) {
              const payload = JSON.stringify({
                chunk: phrase,
                delta: phrase,
              });
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
              // Small delay for typing rhythm if not in test
              if (process.env.NODE_ENV !== "test") {
                await new Promise((r) => setTimeout(r, 15));
              }
            }
          }
        } else {
          // Stream local deterministic chunks
          const streamChunks = buildDebateStreamChunks(
            debate,
            options.deviceA,
            options.deviceB
          );

          for (const item of streamChunks) {
            const payload = JSON.stringify({
              chunk: item.chunk,
              delta: item.chunk,
              editorId: item.editorId,
            });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));

            if (process.env.NODE_ENV !== "test") {
              await new Promise((r) => setTimeout(r, 12));
            }
          }
        }

        // Optional final completion metadata
        const completionPayload = JSON.stringify({
          chunk: "",
          delta: "",
          completed: true,
          debate,
        });
        controller.enqueue(encoder.encode(`data: ${completionPayload}\n\n`));

        // Required terminal event
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch {
        // Fallback emergency closure: never leave stream hanging
        try {
          const emergencyDebate = generateGroundedDebate({
            query: cleanPrompt,
            deviceA: options.deviceA,
            deviceB: options.deviceB,
          });
          const payload = JSON.stringify({
            chunk: emergencyDebate.consensusSummary,
            delta: emergencyDebate.consensusSummary,
            completed: true,
            debate: emergencyDebate,
          });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      }
    },
  });
}
