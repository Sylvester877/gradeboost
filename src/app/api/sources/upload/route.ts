import { NextRequest, NextResponse } from "next/server";
import { createSource, imageToContent } from "@/lib/sources";
import { extractPdfText, toDataUrl, isImage, isPdf, isText } from "@/lib/extract";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Support textbook PDFs up to ~200 MB. Note: very large PDFs are extracted
// page-by-page and may take a minute or two on slower machines.
const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const title = String(form.get("title") || "").trim();
  const topic = String(form.get("topic") || "").trim();
  const subject = String(form.get("subject") || "Mathematics").trim();
  const sourceType = String(form.get("type") || "Notes").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const mime = file.type || "";
  const buf = Buffer.from(await file.arrayBuffer());

  if (buf.length > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "File too large. Max upload size is 200 MB." },
      { status: 413 }
    );
  }

  let content = "";
  let kind = "file";

  if (isPdf(mime) || file.name.toLowerCase().endsWith(".pdf")) {
    kind = "pdf";
    try {
      content = await extractPdfText(buf);
    } catch {
      return NextResponse.json(
        {
          error:
            "I couldn't read that PDF. If it's a scanned document, use the Photo tab to read it with vision AI.",
        },
        { status: 422 }
      );
    }
    if (!content) {
      return NextResponse.json(
        {
          error:
            "I couldn't read text from that PDF — it may be a scanned image. Try the Photo tab to read it with vision AI.",
        },
        { status: 422 }
      );
    }
  } else if (isImage(mime)) {
    kind = "image";
    try {
      content = await imageToContent(toDataUrl(buf, mime));
    } catch {
      return NextResponse.json(
        { error: "Couldn't read that image with the vision model. Try a clearer photo." },
        { status: 422 }
      );
    }
    if (!content) {
      return NextResponse.json({ error: "No text detected in that image." }, { status: 422 });
    }
  } else if (isText(mime) || file.name.toLowerCase().endsWith(".txt")) {
    kind = "text";
    content = buf.toString("utf-8");
  } else {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload a PDF, image (PNG/JPG/WebP), or plain text file." },
      { status: 415 }
    );
  }

  const finalTitle = title || file.name.replace(/\.[^.]+$/, "");
  const created = await createSource({
    title: finalTitle,
    topic: topic || null,
    subject: subject || "Mathematics",
    type: sourceType || "Notes",
    content,
  });
  return NextResponse.json({ ...created, kind });
}
