# TP-Link Deco Mesh Live

[Nederlands](#nederlands) · [English](#english)

![Brede weergave met vier fictieve Deco's, verkeersgrafiek en diagnose](docs/screenshots/desktop.png)

[Mobiele screenshot / Mobile screenshot](docs/screenshots/mobile.png)

## Nederlands

Een Home Assistant-dashboardkaart voor je TP-Link Deco-mesh. Bekijk de logische mesh-topologie, verbonden clients, doorvoer, WiFi-status en API-diagnostiek. De kaart toont gegevens uit Home Assistant. De lijnen geven logische koppelingen aan. Doorvoer is de activiteit die Deco voor clients rapporteert.

### Vereisten

- Home Assistant met ondersteuning voor aangepaste dashboardkaarten.
- De [TP-Link Deco-integratie](https://github.com/amosyuen/ha-tplink-deco), ingesteld op je Deco-installatie. De kaart leest Deco- en clienttrackers, sensoren en het entiteitenregister. CPU, RAM, backhaul en WiFi/API-sensoren verschillen per model en staan soms standaard uit.
- Voor de historie moeten de totale download- en uploadsensoren zijn opgenomen in Home Assistant Recorder. De live gegevens blijven ook zonder historie beschikbaar.

### Installeren via Marketplace

1. Open in Home Assistant 2026.11 of nieuwer [de kaart via deze Marketplace-link](https://my.home-assistant.io/redirect/marketplace_repository/?owner=dkwolf1&repository=ha-tplink-deco-mesh-card&category=plugin).
2. Voeg de repository toe als **Dashboard** als daarom wordt gevraagd en kies **Installeren**. Als je dashboardbronnen via YAML beheert, voeg de bron uit het installatievenster toe als module.
3. Vernieuw je browser. Kies op je dashboard **Kaart toevoegen → TP-Link Deco Mesh Live**.

Je kunt de link gebruiken zodra de repo en release openbaar zijn. Tot opname in de standaardcatalogus verschijnt de kaart daarna als aangepaste repository. Gebruik bij een oudere Home Assistant-versie met HACS de [HACS-link](https://my.home-assistant.io/redirect/hacs_repository/?owner=dkwolf1&repository=ha-tplink-deco-mesh-card&category=plugin).

### Handmatig installeren

1. Kopieer [de JavaScript-module](dist/tplink-deco-mesh-card.js) naar `/config/www/tplink-deco-mesh-card.js`. Herstart Home Assistant één keer als je de map `www` net hebt aangemaakt.
2. Ga naar **Instellingen → Dashboards → ⋮ → Bronnen** en voeg `/local/tplink-deco-mesh-card.js?v=1.3.0` toe als **JavaScript-module**.
3. Vernieuw de browserpagina en voeg de kaart toe. Gebruik één actieve dashboardbron voor de kaart. Bij overstap van de testversie naar Marketplace kun je dezelfde kaartconfiguratie behouden en de oude bron verwijderen. [Dashboardbronnen registreren](https://contributors.home-assistant.io/frontend/custom-ui/resources/)

### De kaart instellen

In de kaarteditor stel je titel, formaat, mesh-installatie, grafiekvenster en zichtbare secties in. Kies **Breed** voor twee kolommen vanaf 900 px kaartbreedte. Gebruik in een Sections-dashboard een brede sectie en **Volledige breedte** voor de kaart, of geef de kaart een apart Paneel-tabblad.

Minimale configuratie:

```yaml
type: custom:tplink-deco-mesh-card
```

Het [uitgebreide voorbeeld](examples/dashboard.yaml) bevat een brede indeling, venster, secties en een optioneel label en sensor-override. Vervang de voorbeeld-entiteits-ID's voordat je die overrides gebruikt. Tik op een Deco voor details. Gebruik de muis, tik of geef de grafiek focus en gebruik de pijltjestoetsen voor meetwaarden.

### Updates en problemen oplossen

- **Update** de kaart via Marketplace of vervang handmatig het JS-bestand en wijzig het versienummer in de resource-URL. Vernieuw daarna de browser.
- **Kaart ontbreekt.** Controleer de URL en het type JavaScript-module. Een 404 wijst op een ontbrekend bestand of een verkeerd pad.
- **Verkeerde of ontbrekende Deco's.** Controleer de TP-Link Deco-integratie en kies bij meerdere installaties de juiste mesh in de kaarteditor.
- **Lege grafiek of diagnose.** Controleer of Recorder de sensoren opneemt en of de gewenste diagnostische entiteiten zijn ingeschakeld.

### Lokale demo

Start `npm run demo` vanuit deze repo en open [de lokale demo](http://127.0.0.1:4173/demo/). Node.js 24 volstaat voor de demo. Alle voorbeeldwaarden zijn fictief.

## English

A Home Assistant dashboard card for your TP-Link Deco mesh. It shows logical mesh relationships, connected clients, throughput, Wi-Fi state, and API diagnostics using Home Assistant data. The topology shows logical relationships. Throughput reflects client traffic reported by Deco.

### Requirements

- Home Assistant with support for custom dashboard cards.
- The [TP-Link Deco integration](https://github.com/amosyuen/ha-tplink-deco), configured for your mesh. The card reads Deco and client trackers, sensors, and the entity registry. CPU, memory, backhaul, Wi-Fi, and API sensors depend on your model and may be disabled by default.
- History requires Home Assistant Recorder to record the total download and upload sensors. Live data remains available without history.

### Install through Marketplace

1. On Home Assistant 2026.11 or later, [open the card in Marketplace](https://my.home-assistant.io/redirect/marketplace_repository/?owner=dkwolf1&repository=ha-tplink-deco-mesh-card&category=plugin).
2. Add it as a **Dashboard** repository if prompted and select **Install**. If you manage dashboard resources in YAML, add the module shown by the install dialog.
3. Reload the browser. Edit your dashboard and choose **Add card → TP-Link Deco Mesh Live**.

The link works once the repository and release are public. Until the card joins the default catalog, it is added as a custom repository. For an older Home Assistant installation with HACS, use the [HACS link](https://my.home-assistant.io/redirect/hacs_repository/?owner=dkwolf1&repository=ha-tplink-deco-mesh-card&category=plugin).

### Install manually

1. Copy [the JavaScript module](dist/tplink-deco-mesh-card.js) to `/config/www/tplink-deco-mesh-card.js`. Restart Home Assistant once if you just created `www`.
2. Go to **Settings → Dashboards → ⋮ → Resources** and add `/local/tplink-deco-mesh-card.js?v=1.3.0` as a **JavaScript module**.
3. Reload the browser and add the card. Keep one active resource for the card. When switching from a local test version to Marketplace, keep your card configuration and remove the old resource. [Register dashboard resources](https://contributors.home-assistant.io/frontend/custom-ui/resources/)

### Configure the card

The card editor sets the title, layout, mesh entry, history range and visible sections. The card UI currently uses Dutch labels. Choose **Breed** for two columns at a card width of at least 900 px. In a Sections dashboard, give the card a wide section and enable full width, or give it a dedicated Panel view.

Minimal configuration:

```yaml
type: custom:tplink-deco-mesh-card
```

The [extended example](examples/dashboard.yaml) includes a wide layout, history, sections, and an optional label and sensor override. Replace example entity IDs before enabling overrides. Select a Deco to open its details. Hover, tap or focus the plot and use the arrow keys to inspect measurements.

### Updates and troubleshooting

- **Update** via Marketplace or replace the JS file and change the version in the resource URL. Reload the browser afterward.
- **Card missing.** Check the URL and JavaScript module type. A 404 indicates a missing file or incorrect path.
- **Wrong or missing units.** Verify the TP-Link Deco integration and select the relevant mesh if there is more than one.
- **Empty chart or diagnostics.** Verify that Recorder includes the traffic sensors and that the desired diagnostic entities are enabled.

### Local demo

Run `npm run demo` from this repository and open [the local demo](http://127.0.0.1:4173/demo/). The demo needs only Node.js 24 and uses fictional sample data.

## Development and releases

[Development](CONTRIBUTING.md) · [Changelog](CHANGELOG.md) · [Release and Marketplace](docs/RELEASE.md) · [Security](SECURITY.md) · [MIT license](LICENSE)
