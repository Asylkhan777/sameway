import { rng, show } from "@/lib/engine";
import { toJpegDataUrl } from "@/lib/image";
import type { Sample } from "@/lib/samples";

/**
 * The image of a sample worksheet, as a JPEG data URL: the sample's photo if it has one,
 * otherwise a sheet drawn here with printed problems and the answers in a handwriting font.
 * This is the image that is sent to the photo reader, so a sample takes the same path as a
 * parent's own photo. Browser only.
 */

const WIDTH = 1000;
const HEIGHT = 1300;
const MARGIN = 80;
const PAPER = "#fffdf8";
const PRINT = "#1d2330";
const FAINT = "#8a8f99";
const PENCIL = "#33415c";
const FIRST_ROW = 470;
const ROW_HEIGHT = 240;
/** Room after the "=" for a handwritten answer, at the largest print size. */
const ANSWER_SPACE = 190;

/** The font family behind a next/font CSS variable set on <html> (see app/layout.tsx). */
const fontFamily = (variable: string, fallback: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || fallback;

async function draw(sample: Sample): Promise<string> {
  const print = fontFamily("--font-geist-sans", "sans-serif");
  const hand = fontFamily("--font-caveat", "cursive");
  // A canvas falls back silently if a web font isn't loaded yet, so load both first.
  await Promise.all([document.fonts.load(`600 80px ${hand}`), document.fonts.load(`500 48px ${print}`)]);
  await document.fonts.ready;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser can't draw the sample.");

  context.fillStyle = PAPER;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.textBaseline = "alphabetic";

  // Name line.
  context.fillStyle = PRINT;
  context.font = `500 30px ${print}`;
  context.fillText("Name:", MARGIN, 130);
  context.fillText("Date:", 620, 130);
  context.fillStyle = FAINT;
  context.fillRect(180, 136, 380, 2);
  context.fillRect(705, 136, WIDTH - MARGIN - 705, 2);
  context.fillStyle = PENCIL;
  context.font = `600 62px ${hand}`;
  context.fillText("Maya", 200, 126);

  // Printed heading.
  context.fillStyle = PRINT;
  context.font = `700 46px ${print}`;
  context.fillText(sample.title, MARGIN, 250);
  context.font = `400 30px ${print}`;
  context.fillText(sample.instruction, MARGIN, 310);
  context.fillStyle = FAINT;
  context.fillRect(MARGIN, 350, WIDTH - 2 * MARGIN, 2);

  // Problems, two to a row. A seeded wobble makes the handwriting sit unevenly, the same way every time.
  const wobble = rng(sample.entries.length * 7919 + sample.id.charCodeAt(0));
  const column = (WIDTH - 2 * MARGIN) / 2 + 20;
  // Longer problems are printed smaller, so an answer never runs into the next column.
  const widest = (size: number): number => {
    context.font = `500 ${size}px ${print}`;
    return Math.max(...sample.entries.map((entry) => context.measureText(`${show(entry)} =`).width));
  };
  let size = 56;
  while (size > 36 && widest(size) + ANSWER_SPACE * (size / 56) > column - 30) size -= 2;
  const answerLine = ANSWER_SPACE * (size / 56);

  sample.entries.forEach((entry, index) => {
    const x = MARGIN + (index % 2) * column;
    const y = FIRST_ROW + Math.floor(index / 2) * ROW_HEIGHT;
    const printed = `${show(entry)} =`;
    context.fillStyle = PRINT;
    context.font = `500 ${size}px ${print}`;
    context.fillText(printed, x, y);
    const answerX = x + context.measureText(printed).width + 20;
    context.fillStyle = FAINT;
    context.fillRect(answerX - 4, y + 12, answerLine - 20, 2);
    if (entry.answer === null) return;
    context.save();
    context.translate(answerX + 4 + wobble() * 8, y - 2 + wobble() * 8);
    context.rotate((wobble() - 0.5) * 0.09);
    context.fillStyle = PENCIL;
    context.font = `600 ${Math.round(size * 1.5)}px ${hand}`;
    context.fillText(String(entry.answer), 0, 0);
    context.restore();
  });

  context.fillStyle = FAINT;
  context.font = `400 22px ${print}`;
  context.fillText("SameWay sample worksheet · not a real child's work", MARGIN, HEIGHT - 60);

  return canvas.toDataURL("image/jpeg", 0.85);
}

async function fromPhoto(path: string): Promise<string> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Sample photo answered ${response.status}.`);
  return toJpegDataUrl(await response.blob());
}

const images = new Map<string, Promise<string>>();

/** The sample's image; made once per page load and shared by the picker and the reader. */
export function sampleImage(sample: Sample): Promise<string> {
  let image = images.get(sample.id);
  if (!image) {
    image = sample.photo ? fromPhoto(sample.photo) : draw(sample);
    images.set(sample.id, image);
    // A failed attempt is not kept, so the next one starts over.
    image.catch(() => images.delete(sample.id));
  }
  return image;
}
