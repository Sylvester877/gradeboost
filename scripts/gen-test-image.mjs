// Generates a real test image with a math question rendered on it,
// then POSTs it to the running dev server's /api/chat to verify the
// vision (photo) path works end-to-end.
import sharp from "sharp";

const svg = Buffer.from(
  "<svg width='900' height='560' xmlns='http://www.w3.org/2000/svg'>" +
    "<rect width='100%' height='100%' fill='#ffffff'/>" +
    "<text x='70' y='130' font-size='58' font-family='Arial' font-weight='bold' fill='#111111'>Solve: 2x + 3 = 11</text>" +
    "<text x='70' y='220' font-size='58' font-family='Arial' fill='#111111'>Find the value of x.</text>" +
    "<rect x='70' y='280' width='760' height='4' fill='#333333'/>" +
    "<text x='70' y='380' font-size='46' font-family='Arial' fill='#444444'>A) 2    B) 4    C) 6    D) 8</text>" +
    "</svg>",
  "utf8"
);

const outPath = process.argv[2] || "/tmp/mathquestion.png";
await sharp(svg).png().toFile(outPath);
console.log(`created ${outPath}`);

// POST to the chat API as a vision request
import { readFileSync } from "node:fs";
const buf = readFileSync(outPath);
const b64 = buf.toString("base64");
console.log(`image bytes: ${buf.length}, base64 length: ${b64.length}`);

const base = process.env.API_BASE || "http://localhost:3000";
const res = await fetch(`${base}/api/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    question: "What does this photo ask, and what is the answer?",
    sourceId: null,
    subject: "Mathematics",
    history: [],
    image: `data:image/png;base64,${b64}`,
  }),
});
console.log("HTTP", res.status);
console.log("X-Sources-Used:", res.headers.get("x-sources-used"));
const text = await res.text();
console.log("RESPONSE (first 900):\n", text.slice(0, 900));
