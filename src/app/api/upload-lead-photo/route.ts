import "server-only"
import { NextResponse } from "next/server"
import { uploadImage, isUploadError } from "@/lib/supabase-storage"
import { checkLeadRateLimit, getClientIp } from "@/lib/rate-limit"
import { headers } from "next/headers"

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

/**
 * Upload de foto pro wizard de captação `/anuncie`. Aceita image/*, redimensiona
 * via Sharp pra max 1600px largura, grava no bucket `lead-photos` no Supabase
 * Storage. Compartilha o rate-limit de lead (5 req/10min/IP) pra frear spam.
 */
export async function POST(request: Request) {
  try {
    const hdrs = await headers()
    const ip = getClientIp(hdrs)
    if (!ip) {
      return NextResponse.json({ error: "IP indeterminado" }, { status: 400 })
    }

    const rate = await checkLeadRateLimit(ip)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: rate.reason || "Muitos uploads em pouco tempo." },
        { status: 429 },
      )
    }

    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo inválido" }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Máximo ${MAX_BYTES / 1024 / 1024}MB.` },
        { status: 400 },
      )
    }

    const result = await uploadImage("lead-photos", file, {
      subfolder: new Date().toISOString().slice(0, 10), // YYYY-MM-DD pra organização
    })

    if (isUploadError(result)) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ url: result.url, path: result.path })
  } catch (err) {
    console.error("[upload-lead-photo] failed:", err)
    return NextResponse.json(
      { error: "Erro inesperado ao fazer upload" },
      { status: 500 },
    )
  }
}
