import { getDocumentProxy, extractText } from "unpdf";

/** Normalise PDF input to a plain Uint8Array (pdf.js rejects Node Buffers). */
function toBytes(data: ArrayBuffer | Uint8Array | Buffer): Uint8Array {
  if (Buffer.isBuffer(data)) return new Uint8Array(data);
  if (data instanceof Uint8Array) return data;
  return new Uint8Array(data);
}

/** Extract plain text from a PDF (text-based). Throws on failure (caller decides). */
export async function extractPdfText(data: ArrayBuffer | Uint8Array | Buffer): Promise<string> {
  const pdf = await getDocumentProxy(toBytes(data) as unknown as ArrayBuffer);
  const { text } = await extractText(pdf, { mergePages: true });
  return (text || "").replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").trim();
}

export function toDataUrl(buffer: Buffer | Uint8Array, mime: string): string {
  const b64 = Buffer.from(buffer).toString("base64");
  return `data:${mime};base64,${b64}`;
}

export const IMAGE_MIMES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
export const PDF_MIME = "application/pdf";
export const TEXT_MIMES = ["text/plain", "text/markdown", "text/csv", "application/json"];

export function isImage(mime: string) {
  return IMAGE_MIMES.includes(mime.toLowerCase());
}
export function isPdf(mime: string) {
  return mime.toLowerCase() === PDF_MIME || mime.toLowerCase().includes("pdf");
}
export function isText(mime: string) {
  return TEXT_MIMES.includes(mime.toLowerCase());
}
