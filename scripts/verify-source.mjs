import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');

const root = path.resolve(new URL('..', import.meta.url).pathname);
const roots = ['app', 'components', 'lib', 'functions/src'];
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
}
for (const r of roots) walk(path.join(root, r));

let failed = false;
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      allowJs: false,
    },
    reportDiagnostics: true,
    fileName: file,
  });
  const diagnostics = result.diagnostics ?? [];
  const syntaxErrors = diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error);
  if (syntaxErrors.length) {
    failed = true;
    console.error(`\n${path.relative(root, file)}`);
    for (const d of syntaxErrors) console.error(ts.flattenDiagnosticMessageText(d.messageText, '\n'));
  }
}

console.log(`Parsed ${files.length} TypeScript/TSX source files.`);
if (failed) process.exit(1);
console.log('Syntax parse: OK');
console.log('Note: this is a syntax validation only; run npm install and npm run typecheck for full type checking.');
