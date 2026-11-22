# Development

Use Node.js 24, npm, Git and PowerShell 7. Install the `pre-commit` command if you want the local Git hook. The application source lives under `src/`. The build copies that file into `dist/`, which is committed for Marketplace validation and installation.

```powershell
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
npm ci
pre-commit install
npm run format
npm run build
npm run check
npx playwright install chromium
npm run test:browser
npm audit --audit-level=low
./scripts/package-release.ps1
```

Use `$env:DECO_BROWSER_CHANNEL = 'msedge'` to run the browser suite on an installed Microsoft Edge instead of Playwright Chromium. Run `npm run demo` to serve fictional data on the loopback interface.

The hook checks staged whitespace and runs ESLint, Markdownlint, Prettier, package validation and unit tests. Stage both `src/` and `dist/` after changing the module. The package validator checks syntax, build parity, the lockfile, Marketplace metadata and README links. Browser tests cover module loading from a nested Marketplace path, degraded data, the Lovelace editor and desktop/mobile interactions.

To recreate the README screenshots from the fictional demo:

```powershell
$env:UPDATE_SCREENSHOTS = '1'
npm run screenshots
Remove-Item Env:UPDATE_SCREENSHOTS
```

The npm override for KaTeX applies only to Markdownlint's dependency tree. Recheck whether the upstream constraint has changed before removing the override. The runtime module has no npm dependencies.

See the [release guide](docs/RELEASE.md) for publication and the [security policy](SECURITY.md) for vulnerability reports.
