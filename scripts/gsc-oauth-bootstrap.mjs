#!/usr/bin/env node
/**
 * scripts/gsc-oauth-bootstrap.mjs
 *
 * One-shot: obtem GSC_REFRESH_TOKEN via fluxo OAuth Desktop (loopback IP).
 * Reusa GA4_CLIENT_ID + GA4_CLIENT_SECRET do .env.local (mesmo OAuth client
 * funciona pra GA4 e GSC — so muda o scope), abre o navegador, captura o
 * authorization code num servidor HTTP local, troca por tokens e grava
 * GSC_REFRESH_TOKEN de volta no .env.local.
 *
 * Pre-requisitos:
 * 1. OAuth consent screen configurado (mesmo do GA4 setup):
 *    Branding + Audience com test user incluindo o email autorizador
 * 2. Adicionar scope `https://www.googleapis.com/auth/webmasters.readonly`
 *    em "Data Access" do consent screen (pode ja ter — caso GA4 + GSC
 *    foram configurados na mesma sessao)
 * 3. Email autorizador eh test user OU app esta publicado
 *
 * Uso: node scripts/gsc-oauth-bootstrap.mjs
 *
 * Modelado a partir do scripts/ga4-oauth-bootstrap.mjs — diferenca:
 *   - Scope = webmasters.readonly (vs analytics.readonly)
 *   - Salva em GSC_REFRESH_TOKEN (vs GA4_REFRESH_TOKEN)
 *   - Reusa o mesmo CLIENT_ID/SECRET (1 OAuth client cobre ambas APIs)
 */

import { createServer } from "node:http"
import { exec } from "node:child_process"
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { URL } from "node:url"
import { google } from "googleapis"

const ENV_PATH = join(process.cwd(), ".env.local")
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"

function parseEnv(content) {
  const out = {}
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
  return out
}

function upsertEnvLine(content, key, value) {
  const lines = content.split(/\r?\n/)
  const re = new RegExp(`^${key}=`)
  let found = false
  const next = lines.map((l) => {
    if (re.test(l)) {
      found = true
      return `${key}=${value}`
    }
    return l
  })
  if (!found) next.push(`${key}=${value}`)
  return next.join("\n")
}

function openBrowser(url) {
  const cmd =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`
  exec(cmd, (err) => {
    if (err) console.warn("(falha ao abrir navegador — copie a URL acima manualmente)")
  })
}

if (!existsSync(ENV_PATH)) {
  console.error(`ERRO: .env.local nao encontrado em ${ENV_PATH}`)
  process.exit(1)
}

const envContent = readFileSync(ENV_PATH, "utf8")
const env = parseEnv(envContent)
const CLIENT_ID = env.GA4_CLIENT_ID
const CLIENT_SECRET = env.GA4_CLIENT_SECRET

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("ERRO: GA4_CLIENT_ID ou GA4_CLIENT_SECRET ausentes em .env.local")
  console.error("(reusamos o mesmo OAuth client do GA4 — mesmo CLIENT_ID/SECRET cobre as 2 APIs)")
  process.exit(1)
}

const server = createServer()
server.listen(0, "127.0.0.1", () => {
  const { port } = server.address()
  const REDIRECT_URI = `http://127.0.0.1:${port}/oauth2callback`
  const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
  const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [SCOPE],
  })

  console.log("\n=== OAuth Bootstrap GSC — FYMOOB ===")
  console.log(`Servidor loopback: ${REDIRECT_URI}`)
  console.log("\nAbrindo navegador. Se nao abrir, copie a URL abaixo:\n")
  console.log(authUrl + "\n")
  openBrowser(authUrl)
  console.log("Aguardando autorizacao...\n")

  server.on("request", async (req, res) => {
    const reqUrl = new URL(req.url, REDIRECT_URI)
    if (reqUrl.pathname !== "/oauth2callback") {
      res.writeHead(404).end()
      return
    }
    const code = reqUrl.searchParams.get("code")
    const error = reqUrl.searchParams.get("error")

    if (error) {
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" })
      res.end(`<h1>Erro: ${error}</h1><p>Volte ao terminal pra ver detalhes.</p>`)
      console.error(`\nERRO OAuth: ${error}`)
      console.error(
        'Causas comuns: scope webmasters.readonly nao adicionado em "Data Access" / email nao adicionado em "Test users" / app em modo Production sem verificacao',
      )
      server.close()
      process.exit(1)
    }

    if (!code) {
      res.writeHead(400).end()
      return
    }

    try {
      const { tokens } = await oauth2.getToken(code)
      const refresh = tokens.refresh_token

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
      res.end(
        `<!doctype html><html><body style="font-family:system-ui;padding:40px;background:#0a0a0a;color:#29ABE2;text-align:center"><h1>GSC autorizado</h1><p>Pode fechar esta aba e voltar ao terminal.</p></body></html>`,
      )

      if (!refresh) {
        console.error("\nAVISO: refresh_token NAO retornado.")
        console.error("Causa: ja existe consentimento anterior salvo na conta Google.")
        console.error("Solucao: revogue o app em https://myaccount.google.com/permissions")
        console.error("         (procure 'FYMOOB MCP Desktop'), e rode este script novamente.")
        server.close()
        process.exit(1)
      }

      const updated = upsertEnvLine(envContent, "GSC_REFRESH_TOKEN", refresh)
      writeFileSync(ENV_PATH, updated, "utf8")

      console.log("=== Sucesso ===")
      console.log(`refresh_token gravado em ${ENV_PATH}`)
      console.log(
        `\nGSC_REFRESH_TOKEN=${refresh.slice(0, 12)}...${refresh.slice(-8)} (${refresh.length} chars)`,
      )
      console.log("\nProximos passos:")
      console.log("  1. (Opcional) Adicionar GSC_REFRESH_TOKEN tambem no Vercel pra cron de prod")
      console.log(
        "  2. Em modo 'Testing' o refresh_token pode expirar em 7 dias — pra prod, publicar o app na aba Audience do consent screen",
      )
      console.log(
        "  3. Validar: agora roda `node scripts/intel/gsc-pull.mjs` pra puxar dados\n",
      )

      setTimeout(() => {
        server.close()
        process.exit(0)
      }, 500)
    } catch (e) {
      console.error("ERRO ao trocar code por tokens:", e?.message ?? e)
      res.writeHead(500).end()
      server.close()
      process.exit(1)
    }
  })
})

setTimeout(() => {
  console.error("\nTimeout: ninguem autorizou em 5 min. Abortando.")
  server.close()
  process.exit(1)
}, 5 * 60 * 1000)
