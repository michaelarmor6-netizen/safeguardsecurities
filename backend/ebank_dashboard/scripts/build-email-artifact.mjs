import { readFileSync, writeFileSync } from 'node:fs';

const shell = readFileSync('scripts/artifact-shell.html', 'utf8');
const emailHtml = readFileSync('scripts/email-preview-output.html', 'utf8');

const loaderScript = `
  var EMAIL_HTML = ${JSON.stringify(emailHtml)};
  var host = document.getElementById('email-frame-host');
  var root = host.attachShadow({ mode: 'open' });
  root.innerHTML = EMAIL_HTML;
`;

const output = shell.replace('__EMAIL_LOADER_SCRIPT__', loaderScript);

writeFileSync(
  'C:/Users/samga/AppData/Local/Temp/claude/c--Users-samga-ebank-dashboard/c788a3a7-c42e-41ae-8635-c22c3b070d55/scratchpad/onboarding-email-preview.html',
  output,
);
console.log('wrote artifact, total length:', output.length);
