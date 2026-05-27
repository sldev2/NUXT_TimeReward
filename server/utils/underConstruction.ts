/** True when UNDER_CONSTRUCTION is exactly "1". Missing, empty, or "0" => false. */
export function isUnderConstruction(value: string | undefined | null): boolean {
  return String(value ?? '').trim() === '1'
}

export function underConstructionHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TimeReward — Coming Soon</title>
  <meta name="robots" content="noindex">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
      color: #e2e8f0;
      padding: 1.5rem;
    }
    main {
      max-width: 32rem;
      text-align: center;
    }
    h1 {
      font-size: clamp(2rem, 5vw, 3rem);
      font-weight: 700;
      margin-bottom: 1rem;
      background: linear-gradient(90deg, #60a5fa, #22d3ee, #2dd4bf);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    p {
      color: #94a3b8;
      font-size: 1.125rem;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <main>
    <h1>TimeReward</h1>
    <p>We&apos;re getting things ready. Please check back soon.</p>
  </main>
</body>
</html>`
}
