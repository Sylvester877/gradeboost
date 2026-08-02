import { NextRequest, NextResponse } from "next/server";
import { createSource } from "@/lib/sources";
import { extractPdfText, isPdf } from "@/lib/extract";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const { url, title, topic, subject, type: sourceType } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "A URL is required." }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(url, { redirect: "follow" });
  } catch {
    return NextResponse.json({ error: "Couldn't fetch that URL." }, { status: 502 });
  }
  if (!res.ok) {
    return NextResponse.json({ error: "Couldn't download that file." }, { status: 502 });
  }

  const mime = res.headers.get("content-type") || "";
  const isPdfFile = isPdf(mime) || url.toLowerCase().split("?")[0].endsWith(".pdf");
  if (!isPdfFile) {
    return NextResponse.json(
      { error: "Only PDF links can be imported from a URL right now." },
      { status: 415 }
    );
  }

  const buf = Buffer.from(await res.arrayBuffer());
  let content = "";
  try {
    content = await extractPdfText(buf);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Couldn't read that PDF: " +
          (err instanceof Error ? err.message : String(err)).slice(0, 200),
      },
      { status: 500 }
    );
  }
  if (!content) {
    return NextResponse.json(
      { error: "Couldn't read text from that PDF (it may be scanned)." },
      { status: 422 }
    );
  }

  const finalTitle =
    (title && String(title).trim()) ||
    decodeURIComponent(url.split("?")[0].split("/").pop() || "").replace(/\.pdf$/i, "") ||
    "Online source";
  const created = await createSource({
    title: finalTitle,
    topic: topic || null,
    subject: subject || "Mathematics",
    type: sourceType || "Notes",
    content,
  });
  return NextResponse.json(created);
}
