# ha-tplink-card

[English](#english) · [Nederlands](#nederlands) · [Wide layout](#make-the-card-wider) · [Brede weergave](#maak-de-kaart-breder)

![Wide layout with four fictional Deco units, a traffic chart, and diagnostics](docs/screenshots/desktop.png)

[Mobile screenshot / Mobiele screenshot](docs/screenshots/mobile.png)

## English

A Home Assistant dashboard card for your TP-Link Deco mesh. It shows logical mesh relationships, connected clients, throughput, Wi-Fi state, and API diagnostics using Home Assistant data. The topology shows logical relationships. Throughput reflects client traffic reported by Deco.

### Requirements

- Home Assistant with support for custom dashboard cards.
- The [TP-Link Deco integration](https://github.com/dkwolf1/ha-deco), configured for your mesh. The card reads Deco and client trackers, sensors, and the entity registry. CPU, memory, backhaul, Wi-Fi, and API sensors depend on your model and may be disabled by default.
- History requires Home Assistant Recorder to record the total download and upload sensors. Live data remains available without history.

### Installation

#### Using Marketplace

1. In Home Assistant 2026.11 or later, go to **Settings → Marketplace** and choose **Add from link** in the upper-right corner.
2. Paste `https://github.com/dkwolf1/ha-tplink-card`. Connect GitHub if prompted and select **Dashboard** if the repository type is not detected.
3. Open **ha-tplink-card** in Marketplace and select **Install**. If you manage dashboard resources in YAML, use the JavaScript module shown in the installation dialog.
4. Reload the browser and choose **ha-tplink-card** from **Add card**.

You can also [open the card directly in Marketplace](https://my.home-assistant.io/redirect/marketplace_repository/?owner=dkwolf1&repository=ha-tplink-card&category=plugin). Until it joins the default catalog, add it as a custom repository. For an older Home Assistant installation with HACS, use the [HACS link](https://my.home-assistant.io/redirect/hacs_repository/?owner=dkwolf1&repository=ha-tplink-card&category=plugin). [Home Assistant Marketplace guide](https://www.home-assistant.io/integrations/marketplace/)

#### Manual installation

1. Download [`tplink-deco-mesh-card.js`](https://github.com/dkwolf1/ha-tplink-card/releases/latest/download/tplink-deco-mesh-card.js) from the latest release and copy it to `/config/www/tplink-deco-mesh-card.js`. Restart Home Assistant once if you just created the `www` folder.
2. Under **Settings → Dashboards → ⋮ → Resources**, add `/local/tplink-deco-mesh-card.js?v=1.4.0` as a **JavaScript module**. For a later release, use that release's version number.
3. Reload the browser and add **ha-tplink-card** from the card picker.

The same file is in the ZIP on the [release page](https://github.com/dkwolf1/ha-tplink-card/releases/latest) and under [`dist/`](dist/tplink-deco-mesh-card.js) in the repository. Keep one dashboard resource for the card. When switching from a manual test installation to Marketplace, remove the old resource and keep your card configuration. [Register dashboard resources](https://contributors.home-assistant.io/frontend/custom-ui/resources/)

### Configure the card

The card editor sets the title, layout, mesh entry, history range and visible sections. The card UI currently uses Dutch labels.

Minimal configuration:

```yaml
type: custom:tplink-deco-mesh-card
```

The [extended example](examples/dashboard.yaml) includes history, sections, and an optional label and sensor override. Replace example entity IDs before enabling overrides. Select a Deco to open its details. Hover, tap or focus the plot and use the arrow keys to inspect measurements.

### Make the card wider

Add **ha-tplink-card** through the card picker and leave **Formaat** on **Automatisch**. In a Sections dashboard, the card fills its section and fits its height to the content by default. At 800 px of card width, the topology and diagnostics appear side by side. On narrower cards they stack.

Home Assistant sets the space available to each card. To fill a whole tab, place this card alone on a **Panel (1 card)** tab. On an existing card, a saved size override in **Layout** still applies. Select **Use recommended size** to restore the new default. [Home Assistant Panel view](https://www.home-assistant.io/dashboards/panel/) · [Resizing a card](https://www.home-assistant.io/dashboards/cards/#resizing-a-card)

### Updates and troubleshooting

- **Update** via Marketplace or replace the JS file and change the version in the resource URL. Reload the browser afterward.
- **Card missing.** Check the URL and JavaScript module type. A 404 indicates a missing file or incorrect path.
- **Wrong or missing units.** Verify the TP-Link Deco integration and select the relevant mesh if there is more than one.
- **Empty chart or diagnostics.** Verify that Recorder includes the traffic sensors and that the desired diagnostic entities are enabled.

### Local demo

Run `npm run demo` from this repository and open [the local demo](http://127.0.0.1:4173/demo/). The demo needs only Node.js 24 and uses fictional sample data.

## Nederlands

Een Home Assistant-dashboardkaart voor je TP-Link Deco-mesh. Bekijk de logische mesh-topologie, verbonden clients, doorvoer, WiFi-status en API-diagnostiek. De kaart toont gegevens uit Home Assistant. De lijnen geven logische koppelingen aan. Doorvoer is de activiteit die Deco voor clients rapporteert.

### Vereisten

- Home Assistant met ondersteuning voor aangepaste dashboardkaarten.
- De [TP-Link Deco-integratie](https://github.com/dkwolf1/ha-deco), ingesteld op je Deco-installatie. De kaart leest Deco- en clienttrackers, sensoren en het entiteitenregister. CPU, RAM, backhaul en WiFi/API-sensoren verschillen per model en staan soms standaard uit.
- Voor de historie moeten de totale download- en uploadsensoren zijn opgenomen in Home Assistant Recorder. De live gegevens blijven ook zonder historie beschikbaar.

### Installeren

#### Via Marketplace

1. Ga in Home Assistant 2026.11 of nieuwer naar **Instellingen → Marketplace** en kies rechtsboven **Toevoegen via link**.
2. Plak `https://github.com/dkwolf1/ha-tplink-card`. Koppel GitHub als Marketplace daarom vraagt en kies **Dashboard** als het type niet automatisch wordt herkend.
3. Open **ha-tplink-card** in Marketplace en kies **Installeren**. Als je dashboardbronnen via YAML beheert, neem dan de JavaScript-module uit het installatievenster over.
4. Vernieuw je browser en voeg **ha-tplink-card** toe via **Kaart toevoegen**.

Je kunt ook de [kaart rechtstreeks in Marketplace openen](https://my.home-assistant.io/redirect/marketplace_repository/?owner=dkwolf1&repository=ha-tplink-card&category=plugin). Tot opname in de standaardcatalogus werkt dit als aangepaste repository. Gebruik bij een oudere Home Assistant-versie met HACS de [HACS-link](https://my.home-assistant.io/redirect/hacs_repository/?owner=dkwolf1&repository=ha-tplink-card&category=plugin). [Home Assistant-handleiding voor Marketplace](https://www.home-assistant.io/integrations/marketplace/)

#### Handmatig

1. Download [`tplink-deco-mesh-card.js`](https://github.com/dkwolf1/ha-tplink-card/releases/latest/download/tplink-deco-mesh-card.js) uit de nieuwste release en kopieer het naar `/config/www/tplink-deco-mesh-card.js`. Herstart Home Assistant één keer als je de map `www` net hebt aangemaakt.
2. Voeg onder **Instellingen → Dashboards → ⋮ → Bronnen** de URL `/local/tplink-deco-mesh-card.js?v=1.4.0` toe als **JavaScript-module**. Gebruik bij een volgende release het versienummer van die release.
3. Vernieuw je browser en voeg **ha-tplink-card** toe via de kaartkiezer.

Hetzelfde bestand zit in het ZIP-pakket op de [releasepagina](https://github.com/dkwolf1/ha-tplink-card/releases/latest) en staat in de repo onder [`dist/`](dist/tplink-deco-mesh-card.js). Gebruik één dashboardbron. Als je overstapt van een handmatige testversie naar Marketplace, verwijder dan de oude bron en behoud je bestaande kaartconfiguratie. [Dashboardbronnen registreren](https://contributors.home-assistant.io/frontend/custom-ui/resources/)

### De kaart instellen

In de kaarteditor stel je titel, formaat, mesh-installatie, grafiekvenster en zichtbare secties in.

Minimale configuratie:

```yaml
type: custom:tplink-deco-mesh-card
```

Het [uitgebreide voorbeeld](examples/dashboard.yaml) bevat het grafiekvenster, de secties en een optioneel label en sensor-override. Vervang de voorbeeld-entiteits-ID's voordat je die overrides gebruikt. Tik op een Deco voor details. Gebruik de muis, tik of geef de grafiek focus en gebruik de pijltjestoetsen voor meetwaarden.

### Maak de kaart breder

Voeg **ha-tplink-card** toe via de kaartkiezer en laat **Formaat** op **Automatisch** staan. Op een dashboard met secties vult de kaart standaard de hele sectie en past de hoogte zich aan de inhoud aan. Vanaf 800 px kaartbreedte staan topologie en diagnose naast elkaar. Bij minder ruimte staan ze onder elkaar.

Home Assistant bepaalt hoeveel ruimte elke kaart krijgt. Wil je dat de kaart een heel tabblad vult, plaats haar dan als enige kaart op een tabblad van het type **Paneel (1 kaart)**. Bij een bestaande kaart blijft een eerder ingestelde grootte onder **Indeling** gelden. Kies **Gebruik aanbevolen grootte** om de nieuwe standaard te gebruiken. [Paneelweergave](https://www.home-assistant.io/dashboards/panel/) · [Kaartgrootte aanpassen](https://www.home-assistant.io/dashboards/cards/#resizing-a-card)

### Updates en problemen oplossen

- **Update** de kaart via Marketplace of vervang handmatig het JS-bestand en wijzig het versienummer in de resource-URL. Vernieuw daarna de browser.
- **Kaart ontbreekt.** Controleer de URL en het type JavaScript-module. Een 404 wijst op een ontbrekend bestand of een verkeerd pad.
- **Verkeerde of ontbrekende Deco's.** Controleer de TP-Link Deco-integratie en kies bij meerdere installaties de juiste mesh in de kaarteditor.
- **Lege grafiek of diagnose.** Controleer of Recorder de sensoren opneemt en of de gewenste diagnostische entiteiten zijn ingeschakeld.

### Lokale demo

Start `npm run demo` vanuit deze repo en open [de lokale demo](http://127.0.0.1:4173/demo/). Node.js 24 volstaat voor de demo. Alle voorbeeldwaarden zijn fictief.

## Development and releases

[Development](CONTRIBUTING.md) · [Changelog](CHANGELOG.md) · [Release and Marketplace](docs/RELEASE.md) · [Security](SECURITY.md) · [MIT license](LICENSE)
