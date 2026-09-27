export type DocumentCheck = {
  name: string;
  pass: boolean;
  detail: string;
};

export type DocumentCheckReport = {
  ok: boolean;
  checks: DocumentCheck[];
};

function startsWith(bytes: Uint8Array, sig: number[]): boolean {
  return sig.every((b, i) => bytes[i] === b);
}

function kindFromBytes(bytes: Uint8Array): 'jpeg' | 'png' | 'webp' | 'pdf' | 'heic' | 'unknown' {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return 'png';
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return 'pdf';
  if (bytes.length > 12 && startsWith(bytes, [0x52, 0x49, 0x46, 0x46])) {
    const tag = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (tag === 'WEBP') return 'webp';
  }
  if (bytes.length > 12) {
    const brand = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
    const major = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (brand === 'ftyp' && /heic|heif|mif1|msf1/i.test(major)) return 'heic';
  }
  return 'unknown';
}

async function imageLooksReal(blob: Blob): Promise<DocumentCheck[]> {
  const bitmap = await createImageBitmap(blob);
  const width = bitmap.width;
  const height = bitmap.height;
  const shortSide = Math.min(width, height);
  const canvas = document.createElement('canvas');
  const sample = 24;
  canvas.width = sample;
  canvas.height = sample;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    bitmap.close();
    return [{ name: 'Image content', pass: false, detail: 'This browser could not read the image pixels.' }];
  }
  ctx.drawImage(bitmap, 0, 0, sample, sample);
  bitmap.close();
  const data = ctx.getImageData(0, 0, sample, sample).data;
  let sum = 0;
  const values: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    values.push(lum);
    sum += lum;
  }
  const mean = sum / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  const checks: DocumentCheck[] = [
    {
      name: 'Image size',
      pass: shortSide >= 480 && width * height >= 480 * 640,
      detail: `${width}×${height}px. Identity photos need a readable scan, at least 480px on the short side.`,
    },
    {
      name: 'Image content',
      pass: variance > 80,
      detail: variance > 80 ? 'The file has visible detail, not a blank or solid page.' : 'The file looks blank or nearly one color.',
    },
  ];
  return checks;
}

function pdfLooksComplete(bytes: Uint8Array): DocumentCheck {
  const tail = bytes.subarray(Math.max(0, bytes.length - 2048));
  const text = new TextDecoder('latin1').decode(tail);
  const complete = text.includes('%%EOF');
  return {
    name: 'PDF structure',
    pass: complete,
    detail: complete ? 'The PDF has an end-of-file marker.' : 'The PDF is truncated or not a finished file.',
  };
}

/** Reads the stored file and checks that it is a real, readable identity document. */
export async function verifySubmittedDocument(url: string): Promise<DocumentCheckReport> {
  const checks: DocumentCheck[] = [];
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    return {
      ok: false,
      checks: [{ name: 'File reachable', pass: false, detail: 'The stored file could not be opened.' }],
    };
  }
  checks.push({
    name: 'File reachable',
    pass: response.ok,
    detail: response.ok ? 'The stored file opened.' : `The stored file returned ${response.status}.`,
  });
  if (!response.ok) return { ok: false, checks };

  const buffer = new Uint8Array(await response.arrayBuffer());
  checks.push({
    name: 'File size',
    pass: buffer.length >= 8 * 1024 && buffer.length <= 50 * 1024 * 1024,
    detail: `${(buffer.length / 1024).toFixed(0)} KB. A real scan is larger than 8 KB and under 50 MB.`,
  });

  const kind = kindFromBytes(buffer);
  checks.push({
    name: 'File signature',
    pass: kind !== 'unknown',
    detail: kind === 'unknown' ? 'The bytes are not a PDF, JPEG, PNG, WebP, or HEIC file.' : `Recognized as ${kind.toUpperCase()}.`,
  });

  if (kind === 'pdf') checks.push(pdfLooksComplete(buffer));
  if (kind === 'jpeg' || kind === 'png' || kind === 'webp') {
    try {
      const type = kind === 'jpeg' ? 'image/jpeg' : kind === 'png' ? 'image/png' : 'image/webp';
      checks.push(...(await imageLooksReal(new Blob([buffer], { type }))));
    } catch {
      checks.push({ name: 'Image content', pass: false, detail: 'The image could not be decoded.' });
    }
  }
  if (kind === 'heic') {
    checks.push({
      name: 'Image content',
      pass: true,
      detail: 'HEIC container recognized. This browser cannot decode the pixels, so the desk should open the file before approving.',
    });
  }

  return { ok: checks.every((c) => c.pass), checks };
}

export async function downloadSubmittedDocument(url: string, filename: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Could not download the file.');
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename || 'identity-document';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
