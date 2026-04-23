export const getHomePage = (nodeEnv: string): string => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Etbaly Backend API</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #0d1117;
      color: #c9d1d9;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .card {
      background: #161b22;
      padding: 2rem;
      border-radius: 12px;
      border: 1px solid #30363d;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      text-align: center;
      max-width: 500px;
      width: 90%;
    }
    h1 { color: #58a6ff; margin: 0 0 0.5rem; }
    p { font-size: 1.1rem; color: #8b949e; margin: 0.5rem 0; }
    a { color: #58a6ff; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
    .env {
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid #30363d;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>🚀 Etbaly Backend</h1>
    <p>The API server is successfully running.</p>
    <p>Check the <a href="/api/v1/health">Health Endpoint</a> or see the documentation for API details.</p>
    <div class="env">Environment: <strong>${nodeEnv}</strong></div>
  </div>
</body>
</html>`;
