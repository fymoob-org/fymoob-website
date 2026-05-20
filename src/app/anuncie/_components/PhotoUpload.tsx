"use client"

import { useCallback, useRef, useState } from "react"
import Image from "next/image"
import { Upload, X, ImagePlus, Loader2 } from "lucide-react"

interface PhotoUploadProps {
  fotos: string[]
  onChange: (fotos: string[]) => void
  maxPhotos?: number
  maxSizeMB?: number
}

interface UploadResponse {
  url?: string
  error?: string
}

/**
 * Upload de fotos com drag&drop. Envia pra /api/upload-lead-photo (server side)
 * que valida + redimensiona + grava no Supabase Storage bucket "lead-photos".
 * Retorna URL pública. Limite máximo 10 fotos, 5MB cada (configurável).
 */
export function PhotoUpload({
  fotos,
  onChange,
  maxPhotos = 10,
  maxSizeMB = 5,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(
    async (files: File[]) => {
      setError(null)
      const remaining = maxPhotos - fotos.length
      if (remaining <= 0) {
        setError(`Limite de ${maxPhotos} fotos atingido.`)
        return
      }
      const toUpload = files.slice(0, remaining)
      for (const file of toUpload) {
        if (!file.type.startsWith("image/")) {
          setError(`"${file.name}" não é imagem. Pule arquivos não-imagem.`)
          continue
        }
        if (file.size > maxSizeMB * 1024 * 1024) {
          setError(`"${file.name}" tem mais de ${maxSizeMB}MB. Reduza o tamanho.`)
          continue
        }
      }
      const validFiles = toUpload.filter(
        (f) => f.type.startsWith("image/") && f.size <= maxSizeMB * 1024 * 1024,
      )
      if (validFiles.length === 0) return

      setUploading(true)
      const uploadedUrls: string[] = []
      for (const file of validFiles) {
        try {
          const fd = new FormData()
          fd.append("file", file)
          const res = await fetch("/api/upload-lead-photo", { method: "POST", body: fd })
          const data: UploadResponse = await res.json()
          if (!res.ok || !data.url) {
            setError(data.error || "Erro ao subir foto")
            continue
          }
          uploadedUrls.push(data.url)
        } catch {
          setError("Erro de rede ao subir foto. Tenta de novo.")
        }
      }
      if (uploadedUrls.length > 0) {
        onChange([...fotos, ...uploadedUrls])
      }
      setUploading(false)
    },
    [fotos, maxPhotos, maxSizeMB, onChange],
  )

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) upload(files)
    if (inputRef.current) inputRef.current.value = ""
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) upload(files)
  }

  function remove(idx: number) {
    onChange(fotos.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-fymoob-gray-dark">
        Fotos do imóvel <span className="text-neutral-400">(opcional, até {maxPhotos})</span>
      </label>
      <p className="mb-2 text-xs text-fymoob-gray-mid">
        💡 Imóveis com fotos têm 3x mais visitas. Máx {maxSizeMB}MB por foto.
      </p>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
          dragOver
            ? "border-brand-primary bg-brand-primary/5"
            : "border-neutral-300 bg-neutral-50 hover:border-brand-primary/40"
        }`}
      >
        {uploading ? (
          <>
            <Loader2 className="size-8 animate-spin text-brand-primary" />
            <p className="mt-2 text-sm text-fymoob-gray-mid">Enviando fotos...</p>
          </>
        ) : (
          <>
            <Upload className="size-8 text-fymoob-gray-mid" />
            <p className="mt-2 text-sm font-medium text-fymoob-gray-dark">
              Arraste fotos aqui ou clique para escolher
            </p>
            <p className="mt-1 text-xs text-fymoob-gray-mid">
              {fotos.length} de {maxPhotos} fotos enviadas
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {fotos.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {fotos.map((url, idx) => (
            <div
              key={url}
              className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200"
            >
              <Image
                src={url}
                alt={`Foto ${idx + 1}`}
                fill
                sizes="120px"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => remove(idx)}
                aria-label={`Remover foto ${idx + 1}`}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
              >
                <X className="size-3.5" />
              </button>
              {idx === 0 && (
                <span className="absolute bottom-1 left-1 rounded-md bg-brand-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                  Capa
                </span>
              )}
            </div>
          ))}
          {fotos.length < maxPhotos && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-neutral-300 text-neutral-400 transition hover:border-brand-primary/40 hover:text-brand-primary"
              aria-label="Adicionar mais fotos"
            >
              <ImagePlus className="size-6" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
