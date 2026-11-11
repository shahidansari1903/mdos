import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
const PORT = Number(process.env.PORT || 3001)
const apiKey = process.env.ANTHROPIC_API_KEY
const client = new Anthropic({ apiKey: apiKey || '' })

const getAnthropicErrorMessage = (error) => {
  if (error?.status === 401 || error?.type === 'authentication_error') {
    return 'ANTHROPIC_API_KEY is missing or invalid. Add a valid Claude API key in your environment before running MDOS.'
  }

  if (error?.message) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return 'Unable to complete market data request.'
}

const FIELD_TEMPLATE = [
  'Date',
  'Time',
  'Index Name',
  'Spot Price',
  'Expiry',
  'Open',
  'High',
  'Low',
  'Previous Close',
  'Total Call OI',
  'Total Put OI',
  'Call OI Change',
  'Put OI Change',
  'PCR',
  'Max Pain',
  'ATM Strike',
  'India VIX',
  'VIX Change',
  'IV Percentile',
  'ATM IV',
  'Futures OI',
  'OI Change',
  'Cost of Carry',
  'Basis',
  'Volume',
  'Advance',
  'Decline',
  'A/D Ratio',
  'FII Cash',
  'DII Cash',
  'FII Index Futures',
  'FII Stock Futures',
  'FII Index Options',
  'Dow',
  'Nasdaq',
  'S&P500',
  'GIFT Nifty',
  'US10Y',
  'Dollar Index',
  'Crude',
  'Gold',
  'USDINR',
].join('\n')

const SYSTEM_PROMPT = `
You are MDOS, an institutional market data collection assistant for NSE India.
Collect real NSE data using live web sources and market reference data. Never guess, never fabricate, and never invent numbers.
If a value is missing or unavailable, write exactly NA.
Use the current available data at the time of the request.
Output only the plain text template below with no commentary, no markdown, no code fences, and no extra lines.
Use the exact field names and order shown below.
${FIELD_TEMPLATE}
`

app.use(express.json({ limit: '1mb' }))

const distPath = path.join(__dirname, 'dist')
const isProduction = process.env.NODE_ENV === 'production'

if (isProduction) {
  app.use(express.static(distPath))
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'mdos-api' })
})

app.post('/api/run-command', async (req, res) => {
  const command = String(req.body?.command || '').trim()

  if (!command) {
    return res.status(400).json({ error: 'Command is required.' })
  }

  if (!apiKey || apiKey === 'your_api_key_here') {
    return res.status(401).json({
      error: 'ANTHROPIC_API_KEY is missing or invalid. Add a valid Claude API key in your environment before running MDOS.',
    })
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Command: ${command}\nUse the live market data required for this request and return the template only.`,
        },
      ],
    })

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim()

    return res.json({ output: text || 'NA' })
  } catch (error) {
    console.error('Anthropic API error:', error)
    return res.status(error?.status || 500).json({
      error: getAnthropicErrorMessage(error),
    })
  }
})

if (isProduction) {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`MDOS API listening on http://localhost:${PORT}`)
})
