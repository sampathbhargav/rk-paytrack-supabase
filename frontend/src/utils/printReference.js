export function printHtmlWithIframe(html, title) {
  const iframe = document.createElement("iframe");

  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";

  document.body.appendChild(iframe);

  const iframeWindow = iframe.contentWindow;
  const iframeDocument = iframeWindow.document;

  iframeDocument.open();
  iframeDocument.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            background: white;
            padding: 28px;
            font-size: 13px;
          }
          .doc {
            max-width: 850px;
            margin: 0 auto;
            border: 1px solid #d1d5db;
            border-radius: 14px;
            padding: 26px;
          }
          .header {
            border-bottom: 4px solid #0A1A2F;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          h1 {
            margin: 0;
            color: #0A1A2F;
            font-size: 26px;
          }
          .subtitle {
            color: #475569;
            line-height: 1.5;
          }
          .meta {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin: 16px 0;
          }
          .box {
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 12px;
          }
          .label {
            color: #64748b;
            font-size: 11px;
            text-transform: uppercase;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .value {
            font-weight: bold;
          }
          section {
            margin-bottom: 18px;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 14px;
          }
          h2 {
            margin: 0 0 8px;
            color: #111827;
            font-size: 18px;
          }
          p {
            line-height: 1.6;
            color: #374151;
          }
          li {
            margin-bottom: 6px;
            line-height: 1.5;
          }
          .ack {
            margin-top: 24px;
            border: 1px solid #d1d5db;
            border-radius: 12px;
            padding: 14px;
          }
          .signature-row {
            margin-top: 38px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 42px;
          }
          .signature-line {
            border-top: 1px solid #111827;
            padding-top: 8px;
            color: #475569;
          }
          .footer {
            margin-top: 28px;
            padding-top: 12px;
            border-top: 1px solid #e5e7eb;
            color: #64748b;
            font-size: 11px;
            display: flex;
            justify-content: space-between;
          }
          @media print {
            body { padding: 0; }
            .doc { border: none; }
          }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `);

  iframeDocument.close();

  setTimeout(() => {
    iframeWindow.focus();
    iframeWindow.print();

    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  }, 500);
}

export function buildPolicyPrintHtml(policy) {
  return `
    <div class="doc">
      <div class="header">
        <h1>${escapeHtml(policy.title)}</h1>
        <p class="subtitle">${escapeHtml(policy.purpose)}</p>
      </div>

      <div class="meta">
        <div class="box">
          <div class="label">Category</div>
          <div class="value">${escapeHtml(policy.category)}</div>
        </div>
        <div class="box">
          <div class="label">Applies To</div>
          <div class="value">Authorized RK PayTrack Users</div>
        </div>
        <div class="box">
          <div class="label">Owner</div>
          <div class="value">Management / System Admin</div>
        </div>
        <div class="box">
          <div class="label">Status</div>
          <div class="value">${escapeHtml(policy.kind || "Management review required")}</div>
        </div>
      </div>

      ${policy.sections
        .map(
          (section) => `
            <section>
              <h2>${escapeHtml(section.heading)}</h2>
              <p>${escapeHtml(section.text)}</p>
              ${
                section.items
                  ? `<ul>${section.items
                      .map((item) => `<li>${escapeHtml(item)}</li>`)
                      .join("")}</ul>`
                  : ""
              }
            </section>
          `
        )
        .join("")}

      <div class="ack">
        <strong>Acknowledgement:</strong>
        <p>
          This is a printed reference copy. The on-screen reading checklist is not a stored acknowledgement or electronic signature. Follow management’s approved acknowledgement process.
        </p>
      </div>

      <div class="signature-row">
        <div class="signature-line">Employee Signature</div>
        <div class="signature-line">Manager Signature</div>
      </div>

      <div class="footer">
        <span>RK PayTrack Policy Center</span>
        <span>Generated ${new Date().toLocaleString()}</span>
      </div>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
