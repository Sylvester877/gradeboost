import { NextResponse } from "next/server";
import { hasApiKey, complete, TEXT_MODELS } from "@/lib/openrouter";

export async function POST() {
  if (!hasApiKey()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No API key configured. Add OPENROUTER_API_KEY to .env and restart the app.",
      },
      { status: 200 }
    );
  }

  const start = Date.now();
  try {
    const reply = await complete(
      [
        {
          role: "system",
          content:
            "You are a connectivity test. Reply with exactly the word OK and nothing else.",
        },
        { role: "user", content: "Ping" },
      ],
      { maxTokens: 5, temperature: 0 }
    );
    return NextResponse.json({
      ok: true,
      model: TEXT_MODELS[0]?.id || "unknown",
      reply: reply.trim().slice(0, 50),
      latencyMs: Date.now() - start,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "Connection failed",
      latencyMs: Date.now() - start,
    });
  }
}
