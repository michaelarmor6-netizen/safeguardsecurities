/** Document types and file checks for identity verification. */

export const KYC_MAX_BYTES = 50 * 1024 * 1024;
export const KYC_MAX_LABEL = '50 MB';

export const KYC_DOC_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'driver_license', label: "Driver's License" },
  { value: 'national_id', label: 'National ID' },
  { value: 'proof_of_address', label: 'Proof of Address' },
  { value: 'utility_bill', label: 'Utility Bill' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'tax_form_w8ben', label: 'Tax Form (W-8BEN)' },
  { value: 'tax_form_w9', label: 'Tax Form (W-9)' },
  { value: 'selfie', label: 'Selfie / Liveness' },
] as const;

export type KycDocType = (typeof KYC_DOC_TYPES)[number]['value'];
export type KycDocStatus = 'pending' | 'approved' | 'rejected';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const MIME_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/x-png': 'image/png',
};

const EXT_TO_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jpe: 'image/jpeg',
  jfif: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

export const KYC_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,image/*';

export function kycDocLabel(docType: string): string {
  return (
    KYC_DOC_TYPES.find((d) => d.value === docType)?.label ??
    (docType === 'drivers_license' ? "Driver's License" : docType.replace(/_/g, ' '))
  );
}

export function isKycDocType(value: string): value is KycDocType {
  return KYC_DOC_TYPES.some((d) => d.value === value);
}

export function resolveKycUpload(file: { name: string; size: number; type: string }):
  | { ok: true; contentType: string }
  | { ok: false; error: string } {
  if (!file || file.size <= 0) return { ok: false, error: 'File is empty.' };
  if (file.size > KYC_MAX_BYTES) return { ok: false, error: `File must be under ${KYC_MAX_LABEL}.` };

  const rawExt = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
  const ext = rawExt.replace(/[^a-z0-9]/g, '');
  const mimeFromExt = EXT_TO_MIME[ext] ?? '';
  const rawType = (file.type || '').toLowerCase().trim();
  const mimeFromType =
    rawType === '' || rawType === 'application/octet-stream'
      ? ''
      : (MIME_ALIASES[rawType] ?? (ALLOWED_MIME.has(rawType) ? rawType : ''));

  if (mimeFromType && mimeFromExt && mimeFromType !== mimeFromExt) {
    return { ok: false, error: 'File type does not match its extension.' };
  }

  const contentType = mimeFromType || mimeFromExt;
  if (!contentType || !ALLOWED_MIME.has(contentType)) {
    return { ok: false, error: 'Unsupported file type. Use PDF, JPEG, PNG, WebP, or HEIC.' };
  }
  return { ok: true, contentType };
}
