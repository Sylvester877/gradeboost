import "dotenv/config";

const API_KEY = process.env.OPENROUTER_API_KEY;
if (!API_KEY) {
  console.error("OPENROUTER_API_KEY is not set");
  process.exit(1);
}

const models = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nvidia/nemotron-3-ultra-550b-a55b",
  "deepseek/deepseek-chat:free",
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.1-70b-instruct:free",
  "inclusionai/ling-3.0-flash:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "google/gemma-4-26b-a4b-it:free",
];

async function testModel(model) {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://gradeboost.app",
        "X-Title": "GradeBoost Test",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Say 'OK'" }],
        max_tokens: 10,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, status: res.status, error: JSON.stringify(data) };
    }
    return { ok: true, content: data.choices?.[0]?.message?.content };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

for (const model of models) {
  process.stdout.write(`${model} ... `);
  const result = await testModel(model);
  if (result.ok) {
    console.log(`OK (${result.content?.trim()})`);
  } else {
    console.log(`FAIL ${result.status || ""} ${result.error?.slice(0, 200)}`);
  }
}
