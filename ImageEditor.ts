import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

class Pixel {
  r: number;
  g: number;
  b: number;
  constructor(r = 0, g = 0, b = 0) {
    this.r = r;
    this.g = g;
    this.b = b;
  }
}

class PPMImage {
  width: number;
  height: number;
  data: Pixel[][];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => new Pixel())
    );
  }

  getPixel(x: number, y: number): Pixel {
    return this.data[y]?.[x] ?? new Pixel();
  }

  setPixel(x: number, y: number, p: Pixel): void {
    if (this.data[y] && this.data[y][x] !== undefined) {
      this.data[y][x] = p;
    }
  }
}

function loadPPM(path: string): PPMImage {
  const text = readFileSync(path, "utf-8").replace(/#[^\n]*\n/g, "\n");
  const tokens = text.trim().split(/\s+/);

  if (tokens[0] !== "P3") {
    throw new Error("Unsupported format: only P3 PPM files are allowed.");
  }

  let i = 1;
  const width = parseInt(tokens[i++] ?? "0", 10);
  const height = parseInt(tokens[i++] ?? "0", 10);
  i++;

  const img = new PPMImage(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const r = parseInt(tokens[i++] ?? "0", 10);
      const g = parseInt(tokens[i++] ?? "0", 10);
      const b = parseInt(tokens[i++] ?? "0", 10);
      img.setPixel(x, y, new Pixel(r, g, b));
    }
  }

  return img;
}

function savePPM(img: PPMImage, path: string): void {
  let output = `P3\n${img.width} ${img.height}\n255\n`;
  for (let y = 0; y < img.height; y++) {
    const row: string[] = [];
    for (let x = 0; x < img.width; x++) {
      const p = img.getPixel(x, y);
      row.push(`${p.r} ${p.g} ${p.b}`);
    }
    output += row.join(" ") + "\n";
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, output, "utf-8");
}

function toGrayscale(img: PPMImage): void {
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const p = img.getPixel(x, y);
      const avg = Math.floor((p.r + p.g + p.b) / 3);
      p.r = p.g = p.b = avg;
    }
  }
}

function invertColors(img: PPMImage): void {
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const p = img.getPixel(x, y);
      p.r = 255 - p.r;
      p.g = 255 - p.g;
      p.b = 255 - p.b;
    }
  }
}

function emboss(img: PPMImage): void {
  for (let y = img.height - 1; y >= 0; y--) {
    for (let x = img.width - 1; x >= 0; x--) {
      let diff = 0;
      if (x > 0 && y > 0) {
        const cur = img.getPixel(x, y);
        const prev = img.getPixel(x - 1, y - 1);

        diff = cur.r - prev.r;
        if (Math.abs(cur.g - prev.g) > Math.abs(diff)) diff = cur.g - prev.g;
        if (Math.abs(cur.b - prev.b) > Math.abs(diff)) diff = cur.b - prev.b;
      }

      let gray = 128 + diff;
      gray = Math.max(0, Math.min(255, gray));

      img.setPixel(x, y, new Pixel(gray, gray, gray));
    }
  }
}

function motionBlur(img: PPMImage, length: number): void {
  if (length < 1) return;

  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      let sumR = 0,
        sumG = 0,
        sumB = 0;
      let count = 0;

      for (let k = 0; k < length && x + k < img.width; k++) {
        const p = img.getPixel(x + k, y);
        sumR += p.r;
        sumG += p.g;
        sumB += p.b;
        count++;
      }

      const avgR = Math.floor(sumR / count);
      const avgG = Math.floor(sumG / count);
      const avgB = Math.floor(sumB / count);

      img.setPixel(x, y, new Pixel(avgR, avgG, avgB));
    }
  }
}

function showHelp() {
  console.log(
    "Usage: npm run start -- <input.ppm> <output.ppm> <grayscale|invert|emboss|motionblur> [blur-length]"
  );
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    showHelp();
    return;
  }

  const input = args[0];
  const output = args[1];
  const filter = args[2] ? args[2].toLowerCase() : "";

  if (!input) {
    throw new Error("Input file path is required.");
  }
  const image = loadPPM(input);

  switch (filter) {
    case "grayscale":
    case "greyscale":
      toGrayscale(image);
      break;
    case "invert":
      invertColors(image);
      break;
    case "emboss":
      emboss(image);
      break;
    case "motionblur":
      if (args.length < 4) {
        showHelp();
        return;
      }
      const length = parseInt(args[3] ?? "1", 10);
      motionBlur(image, length);
      break;
    default:
      showHelp();
      return;
  }

  if (!output) {
    throw new Error("Output file path is required.");
  }
  savePPM(image, output);
  console.log(`Wrote output to ${output}`);
}

main();