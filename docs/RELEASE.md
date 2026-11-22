# Onderhoud, release en Marketplace

Deze handleiding gaat uit van `dkwolf1/ha-tplink-card`, `main` en PowerShell 7. Voer de GitHub-stappen zelf uit. De kaart wordt in Marketplace getoond als **Dashboard**. Voor metadata, CI en de catalogus heet de categorie `plugin`. [Officiële kaartgids](https://contributors.home-assistant.io/marketplace/guides/dashboard/)

## Lokale controles

```powershell
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
Set-Location -LiteralPath 'C:\git\ha-tplink-deco\.local-deco-preview\ha-tplink-deco-mesh-card'
npm ci
npm run check
npx playwright install chromium
npm run test:browser
npm audit --audit-level=low
./scripts/package-release.ps1
```

De tool controleert de inhoud en SHA-256 van het ZIP-bestand in `release/`. Het pakket bevat de module en licentie. Marketplace zoekt de losse `tplink-deco-mesh-card.js` eerst bij de releasebestanden en kan terugvallen op `dist/` in de repository. Voeg daarom de losse JS én de ZIP toe aan de release.

## Eerste push

De openbare GitHub-repository `dkwolf1/ha-tplink-card` is al aangemaakt en is leeg. Controleer dat issues aanstaan en voeg zo nodig een beschrijving en de topics `home-assistant`, `lovelace` en `dashboard-card` toe. Draai eerst de lokale controles hierboven.

```powershell
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
Set-Location -LiteralPath 'C:\git\ha-tplink-deco\.local-deco-preview\ha-tplink-deco-mesh-card'
gh auth status --hostname github.com
if ((gh api user --jq .login) -ne 'dkwolf1') { throw 'Gebruik het account dkwolf1.' }
$decoOrigin = 'https://github.com/dkwolf1/ha-tplink-card.git'
if ('origin' -notin (git remote)) { git remote add origin $decoOrigin }
if ((git remote get-url origin) -notin @($decoOrigin, 'git@github.com:dkwolf1/ha-tplink-card.git')) {
    throw 'Origin wijst naar een andere repository.'
}
if (git status --porcelain) { throw 'Commit eerst de gecontroleerde lokale wijzigingen.' }
git push --set-upstream origin main
```

## GitHub-instellingen

- Ga naar **Settings → Advanced Security** of **Security and analysis**. Controleer **Dependency graph** en activeer **Dependabot alerts**, **Dependabot security updates**, **Secret scanning**, **Push protection** en **Private vulnerability reporting** waar beschikbaar. Kies bij **CodeQL analysis → Set up → Default** de analyse voor JavaScript/TypeScript. [GitHub-beveiligingsinstellingen](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-security-and-analysis-settings-for-your-repository) · [CodeQL](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/configure-code-scanning/configure-code-scanning)
- Ga naar **Settings → Actions → General**. Kies bij **Workflow permissions** **Read repository contents and packages permissions** en laat **Allow GitHub Actions to create and approve pull requests** uit. De workflows vragen alleen `contents: read` en externe Actions gebruiken volledige commit-SHA's. Activeer het afdwingen van volledige SHA's indien beschikbaar. De gepinde officiële HACS-wrapper verwijst zelf naar het door HACS onderhouden Docker-image met tag `main`. [GitHub Actions-instellingen](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository) · [HACS Action-definitie](https://github.com/hacs/action/blob/1ebf01c408f29afcb6406bd431bc98fd8cbb15aa/action.yml)
- Activeer de bescherming pas **na de eerste push en een proef-PR met een complete groene CI-run**. Ga naar **Settings → Rules → Rulesets → New branch ruleset**, zet de regel op **Active** voor `main` en kies **Restrict deletions**, **Block force pushes**, **Require a pull request before merging** en **Require status checks to pass**. Stel het aantal vereiste goedkeuringen bij één beheerder in op **0**. Selecteer de vier statussen van GitHub Actions die GitHub na de proef-PR aanbiedt. De workflow heet **CI** en de checknamen zijn **Quality**, **Dependency audit**, **Browser tests** en **Marketplace validation**. In de PR-weergave verschijnen die onder **CI / …**. Kies per check GitHub Actions als bron wanneer GitHub daarom vraagt. [GitHub Rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)

## Volgende wijzigingen via een pull request

Voer het eerste blok uit, bewerk de bestanden en voer daarna het tweede blok uit. Gebruik per wijziging een nieuwe branchnaam.

```powershell
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
Set-Location -LiteralPath 'C:\git\ha-tplink-deco\.local-deco-preview\ha-tplink-deco-mesh-card'
git switch main
git pull --ff-only
$decoBranch = 'dkw1/update-mesh-card'
git switch -c $decoBranch
```

```powershell
npm ci
npm run format
npm run build
npm run check
npm run test:browser
npm audit --audit-level=low
./scripts/package-release.ps1
git add -A
git diff --cached --check
git diff --cached --stat
git commit -m 'Update TP-Link Deco Mesh Live'
git push --set-upstream origin $decoBranch
gh pr create --repo dkwolf1/ha-tplink-card --base main --head $decoBranch --fill
```

## GitHub-release na groene CI

Bij een volgende versie kun je met `npm version patch --no-git-tag-version` de packageversie en het lockbestand bijwerken. Pas het versienummer in de bron en documentatie aan, voeg een changelogregel toe, bouw de distributie en merge de PR. De release wordt gemaakt vanaf de gecontroleerde commit op GitHub.

```powershell
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
Set-Location -LiteralPath 'C:\git\ha-tplink-deco\.local-deco-preview\ha-tplink-deco-mesh-card'
$decoRepo = 'dkwolf1/ha-tplink-card'
git switch main
git pull --ff-only
if (git status --porcelain) { throw 'De werkmap moet schoon zijn.' }
$decoCommit = git rev-parse HEAD
if ($decoCommit -ne (git rev-parse origin/main)) { throw 'Push of merge deze commit eerst.' }
$decoVersion = (Get-Content -Raw package.json | ConvertFrom-Json).version
$decoTag = "v$decoVersion"
if (git ls-remote --tags origin "refs/tags/$decoTag") { throw "De tag $decoTag bestaat al." }
$decoRun = @(gh run list --repo $decoRepo --workflow ci.yml --branch main --commit $decoCommit --event push --limit 1 --json databaseId | ConvertFrom-Json)
if ($decoRun.Count -ne 1) { throw 'Wacht totdat CI voor deze commit op GitHub verschijnt.' }
gh run watch $decoRun[0].databaseId --repo $decoRepo --exit-status
$decoJobs = (gh run view $decoRun[0].databaseId --repo $decoRepo --json jobs | ConvertFrom-Json).jobs
foreach ($decoCheck in 'Quality','Dependency audit','Browser tests','Marketplace validation') {
    if (-not ($decoJobs | Where-Object { $_.name -eq $decoCheck -and $_.conclusion -eq 'success' })) {
        throw "Verplichte CI-check ontbreekt of is mislukt: $decoCheck"
    }
}
./scripts/package-release.ps1
$decoChangelog = Get-Content -Raw -LiteralPath CHANGELOG.md
$decoNotes = [regex]::Match($decoChangelog, "(?ms)^## $([regex]::Escape($decoVersion))\r?\n(.*?)(?=^## |\z)")
if (-not $decoNotes.Success) { throw "Geen changelog voor $decoVersion." }
$decoNotesFile = New-TemporaryFile
try {
    Set-Content -LiteralPath $decoNotesFile.FullName -Value $decoNotes.Groups[1].Value.Trim() -Encoding utf8
    gh release create $decoTag 'dist/tplink-deco-mesh-card.js' "release/ha-tplink-card-$decoTag.zip" --repo $decoRepo --target $decoCommit --title "TP-Link Deco Mesh Live $decoTag" --notes-file $decoNotesFile.FullName
} finally { Remove-Item -LiteralPath $decoNotesFile.FullName }
```

Open na publicatie de Marketplace-link uit de [README](../README.md) in een Home Assistant-testomgeving en installeer de kaart. Controleer dat de resource naar `/local/community/ha-tplink-card/tplink-deco-mesh-card.js` wijst, dat je de kaart kan toevoegen, dat de juiste Deco-entiteiten worden getoond en dat Recorder-historie en de editor werken. Controleer waar mogelijk mobiel en desktop. Verwijder vóór deze test een eventuele dubbele lokale resource uit het testdashboard. [Marketplace-installatie](https://www.home-assistant.io/integrations/marketplace/)

## Aanmelding voor de standaardcatalogus

De actuele upstream-branch is **master** en het JSON-bestand heet **plugin**. De catalogus verwacht één alfabetisch ingevoegde repositorynaam en een PR vanuit je persoonlijke fork, met bewerken door maintainers toegestaan. Maak de PR na de succesvolle Marketplace-installatietest. [Catalogusgids](https://contributors.home-assistant.io/marketplace/guides/catalog/) · [Actuele pluginlijst](https://github.com/hacs/default/blob/master/plugin) · [Actuele PR-template](https://github.com/hacs/default/blob/master/.github/PULL_REQUEST_TEMPLATE.md)

Voer de blokken hieronder in dezelfde PowerShell-sessie uit. Bestaat je persoonlijke fork al, laat dan de opdracht met `gh repo fork` achterwege. Kies een nieuwe map voor de cataloguscheckout.

```powershell
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$decoRepo = 'dkwolf1/ha-tplink-card'
$decoFork = 'dkwolf1/default'
$decoCatalogBranch = 'dkw1/add-tplink-deco-mesh-card'
$decoCatalogPath = 'C:\git\hacs-default-deco'
if (Test-Path -LiteralPath $decoCatalogPath) { throw 'Kies een nieuwe checkoutmap.' }
if ((gh api user --jq .login) -ne 'dkwolf1') { throw 'Gebruik het persoonlijke account dkwolf1.' }
Set-Location -LiteralPath 'C:\git'
gh repo fork hacs/default --clone=false
git clone "https://github.com/$decoFork.git" $decoCatalogPath
Set-Location -LiteralPath $decoCatalogPath
git remote add upstream https://github.com/hacs/default.git
git fetch upstream master
git switch -c $decoCatalogBranch upstream/master
$decoPluginFile = (Resolve-Path -LiteralPath plugin).Path
$decoCatalog = [IO.File]::ReadAllText($decoPluginFile)
if ($decoRepo -in ($decoCatalog | ConvertFrom-Json)) { throw 'Deze kaart staat al in de catalogus.' }
$decoComparer = [StringComparer]::OrdinalIgnoreCase
$decoNext = [regex]::Matches($decoCatalog, '(?m)^  "(?<name>[^"]+)",?\r?$') |
    Where-Object { $decoComparer.Compare($_.Groups['name'].Value, $decoRepo) -gt 0 } |
    Select-Object -First 1
if (-not $decoNext) { throw 'Zoek de invoegpositie in plugin handmatig op.' }
$decoNewline = if ($decoCatalog.Contains("`r`n")) { "`r`n" } else { "`n" }
$decoUpdated = $decoCatalog.Insert($decoNext.Index, ('  "{0}",{1}' -f $decoRepo, $decoNewline))
if (($decoUpdated | ConvertFrom-Json).Count -ne ($decoCatalog | ConvertFrom-Json).Count + 1) {
    throw 'Ongeldige toevoeging aan plugin.'
}
[IO.File]::WriteAllText($decoPluginFile, $decoUpdated, [Text.UTF8Encoding]::new($false))
git diff --check
if ((git diff --numstat -- plugin) -ne "1`t0`tplugin") { throw 'Verwacht exact één toegevoegde regel.' }
git diff -- plugin
git add -- plugin
git commit -m 'Add TP-Link Deco Mesh Live'
git push --set-upstream origin $decoCatalogBranch
```

Het volgende blok maakt de Engelstalige tekst met echte release- en validatielinks. Het opent daarna een GitHub-formulier met de gegevens ingevuld. Controleer de checklist tegen je eigen test, laat **Allow edits from maintainers** aan en dien de PR zelf in.

```powershell
$decoRelease = gh release view --repo $decoRepo --json tagName,url,isDraft,isPrerelease | ConvertFrom-Json
if ($decoRelease.isDraft -or $decoRelease.isPrerelease) { throw 'Publiceer eerst een stabiele release.' }
$decoReleasedCommit = gh api "repos/$decoRepo/commits/$($decoRelease.tagName)" --jq .sha
$decoValidated = @(gh run list --repo $decoRepo --workflow ci.yml --event push --commit $decoReleasedCommit --status success --limit 1 --json databaseId | ConvertFrom-Json)
if ($decoValidated.Count -ne 1) { throw 'De releasecommit heeft geen geslaagde CI-run.' }
$decoValidationJob = (gh run view $decoValidated[0].databaseId --repo $decoRepo --json jobs | ConvertFrom-Json).jobs |
    Where-Object { $_.name -eq 'Marketplace validation' -and $_.conclusion -eq 'success' } |
    Select-Object -First 1
if (-not $decoValidationJob.url) { throw 'Er is geen geslaagde Marketplace-validatie.' }
if ((Read-Host 'Heb je de gids gelezen en de gepubliceerde kaart via Marketplace getest? Typ JA') -cne 'JA') {
    throw 'Rond de Marketplace-test en documentatiecontrole eerst af.'
}
$decoPrFile = Join-Path ([IO.Path]::GetTempPath()) 'deco-marketplace-pr.md'
@"
## Checklist

- [x] I reviewed the publishing documentation and tested installation as a custom Dashboard repository.
- [x] This repository runs the HACS Action for the plugin category.
- [x] The required checks passed with no disabled validation checks.
- [x] The passing validation run is linked below.
- [x] A full release was published after the checks passed.

Hassfest and integration-specific manifest and brand checks are not applicable to this dashboard card.

## Links

- Current release: $($decoRelease.url)
- Passing HACS Action validation: $($decoValidationJob.url)
- Hassfest: Not applicable.

TP-Link Deco Mesh Live displays mesh topology, connected clients, traffic and diagnostics from the TP-Link Deco integration.
"@ | Set-Content -LiteralPath $decoPrFile -Encoding utf8
Get-Content -LiteralPath $decoPrFile
gh pr create --repo hacs/default --base master --head "dkwolf1:$decoCatalogBranch" --title 'Add TP-Link Deco Mesh Live' --body-file $decoPrFile --web
```

## Licentie en herkomst

De aangeleverde kaartbron draagt de vermelding **MIT License - 2026**. Deze repo behoudt die vermelding en bevat de volledige MIT-licentietekst op naam van de bijdragers aan de kaart. Het Ziggo-voorbeeld is gebruikt om de structuur te vergelijken. De Ziggo-code, afbeeldingen en MPL 2.0-licentie zijn buiten deze kaartrepo gebleven.

De runtime gebruikt iconen via Home Assistants `ha-icon`, systeemfonts en eigen CSS en SVG. Er zijn geen afzonderlijke iconen, fonts of conceptafbeeldingen gebundeld. De twee screenshots zijn werkelijk gerenderde demo-opnamen met zelf gemaakte fictieve data. In de demo nemen neutrale symbolen de plaats van de Home Assistant-iconen in.

De ZIP bevat uitsluitend de module en licentie. Controleer vóór publicatie dat je de rechthebbende bent of toestemming hebt om de oorspronkelijke aangeleverde kaart onder MIT te distribueren. De licentievermelding in de bron is aanwezig, maar de ZIP vermeldde geen oorspronkelijke rechthebbende.
