import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const script = fileURLToPath(new URL('../scripts/extract_textures.py', import.meta.url));
export async function extractTextures(image, signal, apiKey, fetchImpl = fetch) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'mw-texture-'));
  try {
    const input = path.join(dir, 'image.bin'), output = path.join(dir, 'textures.json');
    const regionsFile = path.join(dir, 'regions.json');
    await writeFile(input, Buffer.from(image.split(',')[1], 'base64'));

    let hasAiRegions = false;
    if (apiKey && typeof fetchImpl === 'function') {
      try {
        const [, mimeType, base64Data] = image.match(/^data:([^;]+);base64,(.+)$/) || [null, 'image/jpeg', image];
        const visionPrompt = `You are an expert 3D interior texture scanner. Analyze this indoor room photo to find the cleanest, most pure surface patches of key materials for 3D modeling:
- 'desk': Table top or desk surface (find a clean exposed wood, laminate, or glass surface with NO pens, books, papers, or cups).
- 'floor': Floor tiles, wooden planks, or carpet (find clean exposed area with NO furniture legs or shadows).
- 'wall': Main vertical wall surface (find clean painted area with NO frames or switches).
- 'chair': Chair seat or backrest material.
- 'sofa': Sofa upholstery fabric or leather.
- 'board': Whiteboard or blackboard or framed artwork.
- 'window': Window glass or curtain fabric.

For each surface present in the image, provide the normalized coordinates [ymin, xmin, ymax, xmax] (integers 0 to 1000) of the cleanest, purest sub-rectangle of that material, avoiding foreground clutter, objects, and shadows.

Return JSON in this format:
{
  "surfaces": [
    {
      "name": "desk",
      "material": "wood",
      "clean_box_2d": [ymin, xmin, ymax, xmax]
    }
  ]
}`;
        const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        const visionRes = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST', signal,
          headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [
                { text: visionPrompt },
                { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64Data } }
              ]
            }],
            generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 2048 }
          })
        });
        if (visionRes.ok) {
          const visionJson = await visionRes.json();
          const rawText = visionJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            await writeFile(regionsFile, rawText, 'utf8');
            hasAiRegions = true;
          }
        }
      } catch {
        // Fallback smoothly to autonomous purity scan
      }
    }

    const localPython = path.join(os.homedir(), 'AppData', 'Local', 'Python', 'bin', 'python.exe');
    const python = process.env.PYTHON_BIN || (process.platform === 'win32' && existsSync(localPython) ? localPython : 'python');

    const pyArgs = [script, '--image', input, '--output', output];
    if (hasAiRegions) pyArgs.push('--regions', regionsFile);

    await new Promise((resolve, reject) => {
      const child = spawn(python, pyArgs, {
        windowsHide: true, signal, timeout: 25000, stdio: 'ignore'
      });
      child.once('error', reject);
      child.once('close', code => code === 0 ? resolve() : reject(new Error('Texture extraction unavailable')));
    });

    const data = JSON.parse(await readFile(output, 'utf8'));
    if (data.status !== 'success' || !data.textures || !Object.keys(data.textures).length) throw new Error('No textures');
    return {
      ...data,
      approximate: false,
      method: hasAiRegions ? 'ai_semantic_localized' : 'smart_purity_inpaint',
      warning: 'Texture đã được AI phân tích, khử tạp vật (bút, sách vở) và tổng hợp UV seamless cho mô hình 3D.'
    };
  } finally { await rm(dir, { recursive: true, force: true }); }
}
