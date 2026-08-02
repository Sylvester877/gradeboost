import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const input = path.join(__dirname, "..", "public", "studyapplogo.png");
const output = path.join(__dirname, "..", "public", "icon.ico");

async function main() {
  const img = sharp(input);
  const meta = await img.metadata();
  console.log(
    `Input: ${meta.width}x${meta.height} ${meta.format} (${(fs.statSync(input).size / 1024).toFixed(0)}KB)`
  );

  // Generate multiple sizes for the ICO
  const sizes = [256, 128, 64, 48, 32, 16];
  const pngBuffers = await Promise.all(
    sizes.map((size) =>
      sharp(input).resize(size, size, { fit: "contain" }).png().toBuffer()
    )
  );

  // Build the ICO file
  const ICO_HEADER_SIZE = 6;
  const ICO_DIR_ENTRY_SIZE = 16;
  const numImages = sizes.length;
  const dirOffset = ICO_HEADER_SIZE;
  let imageOffset = dirOffset + numImages * ICO_DIR_ENTRY_SIZE;

  // 6-byte header: reserved(2) + type(2) + count(2)
  const header = Buffer.alloc(ICO_HEADER_SIZE);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = 1 (ICO)
  header.writeUInt16LE(numImages, 4); // image count

  // 16-byte directory entry per image
  const entries = [];
  const imageDataChunks = [];

  for (let i = 0; i < numImages; i++) {
    const buf = pngBuffers[i];
    const s = sizes[i];

    const entry = Buffer.alloc(ICO_DIR_ENTRY_SIZE);
    entry.writeUInt8(s >= 256 ? 0 : s, 0); // width (0 = 256px)
    entry.writeUInt8(s >= 256 ? 0 : s, 1); // height (0 = 256px)
    entry.writeUInt8(0, 2); // color palette (0 = none)
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes (always 1 for PNG data)
    entry.writeUInt16LE(32, 6); // bits per pixel (32 = RGBA)
    entry.writeUInt32LE(buf.length, 8); // image size in bytes
    entry.writeUInt32LE(imageOffset, 12); // image offset

    entries.push(entry);
    imageDataChunks.push(buf);

    console.log(`  Size ${s}x${s}: ${(buf.length / 1024).toFixed(1)}KB`);
    imageOffset += buf.length;
  }

  const icoData = Buffer.concat([header, ...entries, ...imageDataChunks]);
  fs.writeFileSync(output, icoData);
  console.log(
    `\nCreated ${output} with ${numImages} sizes (${(icoData.length / 1024).toFixed(0)}KB)`
  );

  // Also copy studyapplogo.png to the project root so electron-builder finds it easily
  const rootCopy = path.join(__dirname, "..", "studyapplogo.png");
  fs.copyFileSync(input, rootCopy);
  console.log(`Copied to ${rootCopy}`);
}

main().catch((err) => {
  console.error("Error converting icon:", err);
  process.exit(1);
});
