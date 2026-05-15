#!/usr/bin/env node
/**
 * Baixa plantas-baixa oficiais da Avantti do CDN Cloudfront.
 *
 * Descoberta: as plantas-baixa do Lago tem padrao `05-mc-im-XXX-ph-in-ap-r03`
 * onde "ph-in-ap" = planta interior apartamento. Renders de areas comuns tem
 * "pe-in-ac" ou "pe-ex-ac". As do Colina ja vem com nome explicito
 * (tipo-X-Y, gardens-X-Y, cobertura-X-Y).
 *
 * CDN tem anti-hotlink — Referer da grupoavantti.com obrigatorio.
 */

import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const OUT_DIR = "tmp/avantti-plantas"
mkdirSync(OUT_DIR, { recursive: true })

const CDN = "https://d9hhrg4mnvzow.cloudfront.net/www.grupoavantti.com"

const downloads = [
  // ───── LAGO — plantas-baixa (padrao ph-in-ap) ─────
  { local: "lago-planta-101.png", url: `${CDN}/reservalago/10d2f114-05-mc-im-101-ph-in-ap-r03_10ku0v0000000000000028.png`, referer: "https://www.grupoavantti.com/reservalago/" },
  { local: "lago-planta-102.png", url: `${CDN}/reservalago/afd9358b-05-mc-im-102-ph-in-ap-r03_11bf0qo0ix0qo0dx000028.png`, referer: "https://www.grupoavantti.com/reservalago/" },
  { local: "lago-planta-103.jpg", url: `${CDN}/reservalago/775f8a7e-05-mc-im-103-ph-in-ap-r03_10ti0qo00000000000001o.jpg`, referer: "https://www.grupoavantti.com/reservalago/" },
  { local: "lago-planta-105.png", url: `${CDN}/reservalago/c0aa6f16-05-mc-im-105-ph-in-ap-r03_10qr0v00ku0v002x000028.png`, referer: "https://www.grupoavantti.com/reservalago/" },
  { local: "lago-planta-105-v2.png", url: `${CDN}/reservalago/df51a011-05-mc-im-105-ph-in-ap-r03-1_10nx0v00ku0v001l000028.png`, referer: "https://www.grupoavantti.com/reservalago/" },
  { local: "lago-planta-106.png", url: `${CDN}/reservalago/180ffd57-05-mc-im-106-ph-in-ap-r03_10qr0v00ku0v002x000028.png`, referer: "https://www.grupoavantti.com/reservalago/" },
  { local: "lago-planta-110.jpg", url: `${CDN}/reservalago/cff84ebc-05-mc-im-110-ph-in-ap-r03_10hu0ko0dw0ko01y00001o.jpg`, referer: "https://www.grupoavantti.com/reservalago/" },
  { local: "lago-planta-tipo-2q.png", url: `${CDN}/reservalago/b9a7f841-lago-tipo-2q_10dw0ko000000000000028.png`, referer: "https://www.grupoavantti.com/reservalago/" },

  // ───── COLINA — plantas-baixa (nome explicito) ─────
  { local: "colina-tipo-v1.png", url: `${CDN}/reservacolina/5b12b98b-tipo-1-1_10000000sk0ga02d000028.png`, referer: "https://www.grupoavantti.com/reservacolina/" },
  { local: "colina-tipo-v2.png", url: `${CDN}/reservacolina/5d30c11e-tipo-1-2_10000000p00ga046000028.png`, referer: "https://www.grupoavantti.com/reservacolina/" },
  { local: "colina-tipo-v3.png", url: `${CDN}/reservacolina/7d2b1538-tipo-1-3_10000000p00ga046000028.png`, referer: "https://www.grupoavantti.com/reservacolina/" },
  { local: "colina-garden-1-v1.png", url: `${CDN}/reservacolina/659051a6-gardens-1-1_10000000vc0ga00z000028.png`, referer: "https://www.grupoavantti.com/reservacolina/" },
  { local: "colina-garden-1-v2.png", url: `${CDN}/reservacolina/6db0bc9f-gardens-1-2_10000000vc0ga00z000028.png`, referer: "https://www.grupoavantti.com/reservacolina/" },
  { local: "colina-garden-2-v1.png", url: `${CDN}/reservacolina/57d7a6ee-gardens-2-1_10000000vv0f401600c028.png`, referer: "https://www.grupoavantti.com/reservacolina/" },
  { local: "colina-garden-2-v2.png", url: `${CDN}/reservacolina/f864ccb1-gardens-2-2_10000000q00g102y009028.png`, referer: "https://www.grupoavantti.com/reservacolina/" },
  { local: "colina-cobertura-1-v1.png", url: `${CDN}/reservacolina/9ab81a74-cobertura-1-1_10000000tf0ga02o000028.png`, referer: "https://www.grupoavantti.com/reservacolina/" },
  { local: "colina-cobertura-1-v2.png", url: `${CDN}/reservacolina/4d2fa4ad-cobertura-1-2_10000000v80ga012000028.png`, referer: "https://www.grupoavantti.com/reservacolina/" },
  { local: "colina-cobertura-2-v1.png", url: `${CDN}/reservacolina/61746db6-cobertura-2-1_10000000q80ga03q000028.png`, referer: "https://www.grupoavantti.com/reservacolina/" },
  { local: "colina-cobertura-2-v2.png", url: `${CDN}/reservacolina/4b4b5add-cobertura-2-2_10000000rf0ga02y000028.png`, referer: "https://www.grupoavantti.com/reservacolina/" },
  { local: "colina-cobertura-3-v1.png", url: `${CDN}/reservacolina/f7913615-cobertura-3-1_10000000qk0ga03i000028.png`, referer: "https://www.grupoavantti.com/reservacolina/" },
  { local: "colina-cobertura-3-v2.png", url: `${CDN}/reservacolina/48cf2c97-cobertura-3-2_10000000rf0ga02y000028.png`, referer: "https://www.grupoavantti.com/reservacolina/" },
]

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

let ok = 0, fail = 0
for (const item of downloads) {
  try {
    const res = await fetch(item.url, {
      headers: { Referer: item.referer, "User-Agent": UA, Accept: "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8" },
    })
    if (!res.ok) {
      console.error(`  ✗ ${item.local} — HTTP ${res.status}`)
      fail++
      continue
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 1000) {
      console.error(`  ✗ ${item.local} — too small (${buf.length} bytes)`)
      fail++
      continue
    }
    writeFileSync(join(OUT_DIR, item.local), buf)
    console.log(`  ✓ ${item.local} (${(buf.length / 1024).toFixed(1)} KB)`)
    ok++
  } catch (err) {
    console.error(`  ✗ ${item.local} — ${err.message}`)
    fail++
  }
}

console.log(`\nResultado: ${ok} baixadas, ${fail} falharam em ${OUT_DIR}`)
