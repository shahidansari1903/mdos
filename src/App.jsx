import { useMemo, useState } from 'react'
import './App.css'

const FIELD_ORDER = [
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
]

const STEP_TRACKER = [
  'Identifying Index',
  'Fetching Price',
  'Option Chain',
  'Volatility',
  'Futures',
  'Market Breadth',
  'FII/DII',
  'Global Markets',
  'Validating',
  'Compiling',
]

const commandPresets = [
  'Nifty Weekly',
  'Bank Nifty Weekly',
  'FinNifty Weekly',
  'Nifty Monthly',
]

const emptySheet = () =>
  Object.fromEntries(FIELD_ORDER.map((field) => [field, 'NA']))

const normalizeLabel = (value = '') =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()

const parseTemplateOutput = (responseText) => {
  const lines = (responseText || '').split(/\r?\n/)
  const parsed = emptySheet()

  for (const line of lines) {
    const separatorIndex = line.indexOf(':')
    if (separatorIndex === -1) continue

    const rawKey = line.slice(0, separatorIndex).trim()
    const rawValue = line.slice(separatorIndex + 1).trim()
    const matchedField = FIELD_ORDER.find(
      (field) => normalizeLabel(field) === normalizeLabel(rawKey),
    )

    if (!matchedField) continue

    parsed[matchedField] = rawValue || 'NA'
  }

  return parsed
}

const buildPlainText = (sheet) =>
  FIELD_ORDER.map((field) => `${field}: ${sheet[field] || 'NA'}`).join('\n')

function App() {
  const [command, setCommand] = useState('Nifty Weekly')
  const [sheet, setSheet] = useState(emptySheet())
  const [isRunning, setIsRunning] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const hasOutput = useMemo(
    () => Object.values(sheet).some((value) => value && value !== 'NA'),
    [sheet],
  )

  const runSequence = async (nextCommand) => {
    setIsRunning(true)
    setError('')
    setActiveStep(0)

    for (let index = 0; index < STEP_TRACKER.length; index += 1) {
      setActiveStep(index)
      await new Promise((resolve) => setTimeout(resolve, 220))
    }

    try {
      const response = await fetch('/api/run-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: nextCommand }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to fetch market data.')
      }

      const parsed = parseTemplateOutput(payload.output)
      setSheet(parsed)
    } catch (apiError) {
      setError(apiError.message || 'Request failed.')
      setSheet(emptySheet())
    } finally {
      setIsRunning(false)
      setActiveStep(0)
    }
  }

  const handleRun = async () => {
    const trimmed = command.trim()
    if (!trimmed) {
      setError('Enter a market command.')
      return
    }

    await runSequence(trimmed)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleRun()
    }
  }

  const handleQuickCommand = async (value) => {
    setCommand(value)
    await runSequence(value)
  }

  const handleSheetChange = (field, value) => {
    setSheet((currentSheet) => ({
      ...currentSheet,
      [field]: value,
    }))
  }

  const handleCopy = async () => {
    const output = buildPlainText(sheet)

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(output)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = output
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'fixed'
        textarea.style.pointerEvents = 'none'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }

      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setError('Clipboard copy failed in this browser.')
    }
  }

  return (
    <div className="mdos-shell">
      <header className="terminal-header">
        <div className="status-group">
          <span className="live-dot" aria-hidden="true" />
          <span className="status-label">SYSTEM LIVE</span>
        </div>
        <div className="header-title">MDOS</div>
      </header>

      <div className="command-row">
        {commandPresets.map((commandPreset) => (
          <button
            key={commandPreset}
            type="button"
            className="preset-button"
            onClick={() => handleQuickCommand(commandPreset)}
            disabled={isRunning}
          >
            {commandPreset}
          </button>
        ))}
      </div>

      {isRunning && (
        <div className="step-tracker" aria-live="polite">
          {STEP_TRACKER.map((step, index) => (
            <div
              key={step}
              className={`step-pill ${index <= activeStep ? 'active' : ''}`}
            >
              {step}
            </div>
          ))}
        </div>
      )}

      {error && <div className="terminal-error">{error}</div>}

      <div className="sheet-toolbar">
        <div className="toolbar-title">COMPILED DATA SHEET</div>
        <button type="button" className="copy-button" onClick={handleCopy}>
          {copied ? 'COPIED' : 'COPY'}
        </button>
      </div>

      <div className="data-sheet">
        {FIELD_ORDER.map((field) => {
          const value = sheet[field] || 'NA'
          const isMissing = value === 'NA' || value === ''

          return (
            <div key={field} className="sheet-row">
              <div className="sheet-label">{field}</div>
              {isMissing ? (
                <input
                  type="text"
                  className="sheet-input"
                  value={value}
                  onChange={(event) => handleSheetChange(field, event.target.value || 'NA')}
                />
              ) : (
                <div className="sheet-value">{value}</div>
              )}
            </div>
          )
        })}
      </div>

      {!hasOutput && !isRunning && (
        <div className="empty-state">Awaiting command execution...</div>
      )}

      <div className="input-bar">
        <input
          type="text"
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type command..."
          aria-label="Market command"
        />
        <button type="button" className="run-button" onClick={handleRun} disabled={isRunning}>
          {isRunning ? 'RUNNING' : 'RUN'}
        </button>
      </div>
    </div>
  )
}

export default App
