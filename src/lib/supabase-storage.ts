/**
 * Supabase Storage helpers — server-only.
 *
 * Uploads centralizados pra `articles-covers`, `articles-inline`, `authors`
 * buckets. Validacao MIME + tamanho. Path determinismo: `<bucket>/<sub>/<uuid>.ext`
 * pra cache friendly + sem colisao.
 */

import "server-only"
import { randomUUID } from "node:crypto"
import sharp from "sharp"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export type StorageBucket = "articles-covers" | "articles-inline" | "authors" | "lead-photos"

const ALLOWED_MIME = new Set([
  "image/webp",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/avif",
])

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB (foto de celular sem otimizar)

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/avif": "avif",
}

const OPTIMIZE_MAX_WIDTH = 1600
const OPTIMIZE_WEBP_QUALITY = 82

/**
 * Reprocessa imagem com sharp: rotaciona via EXIF, redimensiona pra 1600px
 * (sem upscaling), converte pra WebP qualidade 82, strip metadata. AVIF
 * passa direto — ja eh optimal e o re-encode perde qualidade sem ganho.
 */
async function optimizeImage(
  file: File | Blob,
  mime: string
): Promise<{ buffer: Buffer; mime: string } | null> {
  if (mime === "image/avif") return null
  try {
    const input = Buffer.from(await file.arrayBuffer())
    const buffer = await sharp(input)
      .rotate()
      .resize({ width: OPTIMIZE_MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: OPTIMIZE_WEBP_QUALITY })
      .toBuffer()
    return { buffer, mime: "image/webp" }
  } catch (err) {
    console.error("[supabase-storage] sharp optimize failed:", err)
    return null
  }
}

export interface UploadResult {
  url: string
  path: string
  size: number
  mime: string
}

export interface UploadError {
  error: string
}

/**
 * Faz upload de um arquivo (File ou Blob) pro bucket Supabase. Devolve URL
 * publica + path + meta. Lanca erro de validacao se mime/size invalidos.
 */
export async function uploadImage(
  bucket: StorageBucket,
  file: File | Blob,
  options?: { subfolder?: string; filename?: string }
): Promise<UploadResult | UploadError> {
  const inputMime = (file as File).type || "application/octet-stream"
  if (!ALLOWED_MIME.has(inputMime)) {
    return { error: `Tipo de arquivo nao suportado: ${inputMime}. Use webp, jpeg, png ou avif.` }
  }
  if (file.size > MAX_BYTES) {
    return { error: `Arquivo muito grande (${Math.round(file.size / 1024)} KB). Maximo: 5 MB.` }
  }

  const optimized = await optimizeImage(file, inputMime)
  const payload: Buffer | File | Blob = optimized?.buffer ?? file
  const mime = optimized?.mime ?? inputMime
  const size = optimized?.buffer.byteLength ?? file.size

  const ext = EXTENSION_BY_MIME[mime] ?? "bin"
  const safeName = options?.filename
    ? options.filename.replace(/[^a-z0-9-_]/gi, "").slice(0, 60)
    : randomUUID()
  const subfolder = options?.subfolder
    ? options.subfolder.replace(/[^a-z0-9/_-]/gi, "")
    : new Date().toISOString().slice(0, 7) // YYYY-MM
  const path = `${subfolder}/${safeName}.${ext}`

  const sb = getSupabaseAdmin()
  const { error: uploadError } = await sb.storage
    .from(bucket)
    .upload(path, payload, {
      contentType: mime,
      cacheControl: "31536000, immutable",
      upsert: false,
    })

  if (uploadError) {
    console.error(`[supabase-storage] upload failed (${bucket}/${path}):`, uploadError)
    return { error: `Falha no upload: ${uploadError.message}` }
  }

  const { data } = sb.storage.from(bucket).getPublicUrl(path)
  return {
    url: data.publicUrl,
    path,
    size,
    mime,
  }
}

/**
 * Remove um arquivo do bucket. Best-effort — nao falha se nao existir.
 * Usado em "trocar foto do autor" e cleanup de uploads orfaos.
 */
export async function removeFile(
  bucket: StorageBucket,
  path: string
): Promise<{ ok: true } | { error: string }> {
  if (!path) return { ok: true }
  const sb = getSupabaseAdmin()
  const { error } = await sb.storage.from(bucket).remove([path])
  if (error) {
    console.error(`[supabase-storage] remove failed (${bucket}/${path}):`, error)
    return { error: error.message }
  }
  return { ok: true }
}

/**
 * Extrai o `path` interno do bucket a partir de uma URL publica do Supabase.
 * Util pra cleanup ao trocar foto. URL do storage publico tem o formato:
 *
 *   https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
 */
export function pathFromPublicUrl(
  url: string,
  bucket: StorageBucket
): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.slice(idx + marker.length)
}

export function isUploadError(
  result: UploadResult | UploadError
): result is UploadError {
  return "error" in result
}
