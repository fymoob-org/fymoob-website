#!/usr/bin/env node
/**
 * scripts/ga4-admin-oauth-bootstrap.mjs
 *
 * One-shot: obtem GA4_REFRESH_TOKEN com scopes `analytics.edit` +
 * `analytics.readonly` via OAuth Desktop loopback. Usado pra que scripts
 * possam configurar GA4 via Admin API (criar custom dimensions, marcar
 * key events, atualizar data retention, linkar GSC/BigQuery, etc.) +
 * tambem ler via Data API (queries de relatorio).
 *
 * Pre-requisitos:
 * 1. OAuth consent screen tem AMBOS scopes em Data Access:
 *    - https://www.googleapis.com/auth/analytics.edit
 *    - https://www.googleapis.com/auth/analytics.readonly
 * 2. Google Analytics Admin API habilitada no projeto (APIs & Services > Library)
 * 3. Email autorizador eh test user OU app esta publicado
 *
 * Substitui o GA4_REFRESH_TOKEN existente (gerado anteriormente com so
 * o scope readonly). Novo token cobre as duas APIs.
 *
 * Uso: node scripts/ga4-admin-oauth-bootstrap.mjs
 *
 * Modelado a partir do scripts/ga4-oauth-bootstrap.mjs e
 * scripts/gsc-oauth-bootstrap.mjs (mesma stack OAuth2 do googleapis).
 */

import { createServer } from "node:http"
import { exec } from "node:child_process"
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { URL } from "node:url"
import { google } from "googleapis"

const ENV_PATH = join(process.cwd(), ".env.local")
const SCOPES = [
  "https://www.googleapis.com/auth/analytics.edit",
  "https://www.googleapis.com/auth/analytics.readonly",
]

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
  console.error("(reusamos o mesmo OAuth client do GA4 readonly + GSC)")
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
    scope: SCOPES,
  })

  console.log("\n=== OAuth Bootstrap GA4 Admin + Data — FYMOOB ===")
  console.log(`Servidor loopback: ${REDIRECT_URI}`)
  console.log(`Scopes solicitados:`)
  for (const s of SCOPES) console.log(`  - ${s}`)
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
        'Causas comuns: scopes nao adicionados em "Data Access" do consent screen / email nao adicionado em "Test users" / Admin API nao habilitada / app em modo Production sem verificacao',
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
        `<!doctype html><html><body style="font-family:system-ui;padding:40px;background:#0a0a0a;color:#29ABE2;text-align:center"><h1>GA4 Admin autorizado</h1><p>Pode fechar esta aba e voltar ao terminal.</p></body></html>`,
      )

      if (!refresh) {
        console.error("\nAVISO: refresh_token NAO retornado.")
        console.error("Causa: ja existe consentimento anterior salvo na conta Google.")
        console.error("Solucao: revogue o app em https://myaccount.google.com/permissions")
        console.error("         (procure 'FYMOOB MCP Desktop'), e rode este script novamente.")
        server.close()
        process.exit(1)
      }

      // Confirma scopes recebidos via tokeninfo (sanity check) — se o user
      // desmarcou um scope na tela de consent, o token vem com menos scopes
      // que pedimos. Adminitra mesmo assim mas avisa.
      const grantedScopes = (tokens.scope || "").split(" ").filter(Boolean)
      const missing = SCOPES.filter((s) => !grantedScopes.includes(s))

      const updated = upsertEnvLine(envContent, "GA4_REFRESH_TOKEN", refresh)
      writeFileSync(ENV_PATH, updated, "utf8")

      console.log("=== Sucesso ===")
      console.log(`refresh_token gravado em ${ENV_PATH} (substitui token anterior)`)
      console.log(
        `\nGA4_REFRESH_TOKEN=${refresh.slice(0, 12)}...${refresh.slice(-8)} (${refresh.length} chars)`,
      )
      console.log(`\nScopes concedidos:`)
      for (const s of grantedScopes) console.log(`  ✓ ${s}`)

      if (missing.length > 0) {
        console.warn(`\nAVISO: scopes solicitados que NAO foram concedidos:`)
        for (const s of missing) console.warn(`  ✗ ${s}`)
        console.warn(
          `\nIsso pode acontecer se voce desmarcou na tela de consent. Re-rode o script e marque tudo.`,
        )
      } else {
        console.log(`\nTodos os scopes solicitados foram concedidos.`)
      }

      console.log("\nProximos passos:")
      console.log("  - Rodar `node scripts/ga4-fase1-config.mjs` (a ser criado) pra configurar")
      console.log("    custom dimensions, key events, data retention, GSC link, etc.")
      console.log(
        "  - Em modo 'Testing' o refresh_token pode expirar em 7 dias — pra prod, publicar o app na aba Audience\n",
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
