import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

// What we ask Gemini to return for every medicine it can read in the image.
const responseSchema = {
  type: "object",
  properties: {
    medicines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Medicine / drug name as written" },
          strength: { type: "string", description: "Strength or dose, e.g. '500 mg', '5 ml'. Empty if not shown." },
          form: { type: "string", description: "tablet, capsule, syrup, injection, drops, etc. Empty if unknown." },
          frequency: { type: "string", description: "How often to take, e.g. 'Twice a day', '1-0-1', 'Every 8 hours'." },
          timing: { type: "string", description: "When to take, e.g. 'After food', 'Before breakfast'. Empty if not shown." },
          duration: { type: "string", description: "How many days, e.g. '5 days'. Empty if not shown." },
          notes: { type: "string", description: "Any other instruction. Empty if none." },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"],
            description: "How sure you are this reading is correct.",
          },
        },
        required: ["name", "frequency", "confidence"],
      },
    },
    warnings: {
      type: "array",
      items: { type: "string" },
      description: "Any caveats: blurry image, handwriting hard to read, partially cut off, etc.",
    },
  },
  required: ["medicines", "warnings"],
};

const PROMPT = `You are a careful medical assistant reading a photo of a prescription, medicine strip, bottle label, or doctor's note.

Extract EVERY distinct medicine you can see and, for each, its dosage frequency.

Rules:
- Read names exactly as written. Do not invent medicines that are not visible.
- Frequency can be words ("twice a day", "three times daily") or the common shorthand like "1-0-1" (morning-noon-night) or "BD/TDS/OD/HS". Preserve what is written; if it is shorthand, you may add the plain meaning in notes.
- If a value is not visible, return an empty string for it — do not guess.
- Mark confidence "low" for anything handwritten, blurry, or partially obscured so the user knows to double-check.
- Add a warning whenever the image quality or handwriting makes you unsure.
- If you cannot find any medicine, return an empty medicines array and explain why in warnings.

This output will be REVIEWED and CORRECTED by the user before any use. It is not medical advice.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Server is missing GEMINI_API_KEY. Add a free key from https://aistudio.google.com/apikey to your environment.",
      },
      { status: 503 }
    );
  }

  let imageBase64: string | undefined;
  let mimeType = "image/jpeg";

  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const dataUrl: string = body.image || "";
      const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
      if (match) {
        mimeType = match[1];
        imageBase64 = match[2];
      } else {
        imageBase64 = dataUrl; // assume raw base64
      }
    } else {
      const form = await req.formData();
      const file = form.get("image");
      if (file instanceof File) {
        mimeType = file.type || mimeType;
        const buf = Buffer.from(await file.arrayBuffer());
        imageBase64 = buf.toString("base64");
      }
    }
  } catch {
    return NextResponse.json({ error: "Could not read the uploaded image." }, { status: 400 });
  }

  if (!imageBase64) {
    return NextResponse.json({ error: "No image was provided." }, { status: 400 });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  let geminiRes: Response;
  try {
    geminiRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema,
        },
      }),
    });
  } catch {
    return NextResponse.json({ error: "Could not reach the vision service." }, { status: 502 });
  }

  if (!geminiRes.ok) {
    const detail = await geminiRes.text();
    let message = "The vision service rejected the request.";
    if (geminiRes.status === 429) message = "Free quota reached for now — wait a minute and try again.";
    if (geminiRes.status === 400 && detail.includes("API_KEY")) message = "The GEMINI_API_KEY looks invalid.";
    return NextResponse.json({ error: message, status: geminiRes.status }, { status: 502 });
  }

  const data = await geminiRes.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    return NextResponse.json({ error: "The model returned no readable result." }, { status: 502 });
  }

  let parsed: { medicines?: unknown[]; warnings?: unknown[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "The model returned an unexpected format." }, { status: 502 });
  }

  return NextResponse.json({
    medicines: Array.isArray(parsed.medicines) ? parsed.medicines : [],
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
  });
}
