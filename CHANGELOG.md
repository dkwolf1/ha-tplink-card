# Changelog

## Unreleased

- **Compatibility change.** Require dkwolf1/ha-deco v4.2.0-beta.2 or later for the Wi-Fi scan and optimization monitor and for the guest and IoT switches. Older versions can still display reported channels, widths and network status.
- Add guest and IoT network controls for administrators when compatible Deco switches are available on the selected mesh.
- Show live Wi-Fi advice beside the current channels when the monitor is available.
- Use a stacked mesh diagram on narrow cards. Draw links only for reported connections that can be matched to a Deco.
- Collapse detailed diagnostics by default and move selected Deco details higher on the card.
- Show mesh names in the card editor and identify the selected mesh next to the Wi-Fi monitor.

## 2.0.0

### Breaking change for Wi-Fi preview builds

- The **Wi-Fi scan and optimization** button now requires [dkwolf1/ha-deco v4.2.0-beta.1 or later](https://github.com/dkwolf1/ha-deco/releases/tag/v4.2.0-beta.1) and compatible Wi-Fi entities for the selected mesh. The card checks the installed version through Home Assistant. Earlier versions can still display the main Deco's channel readings when available.

### Added

- Show the main Deco's reported Wi-Fi channels and widths on the dashboard and in the experimental Wi-Fi popup.
- Show Deco's reported scan status, require a second manual click to optimize, and compare reported channel readings afterward.
- Document the Wi-Fi feature and its requirements in English, Dutch, German, and French.

## 1.8.0

- Add German and French throughout the dashboard card, editor, and client controls, including confirmations, errors, and accessibility labels.
- Choose the language from your Home Assistant profile. English and Dutch remain available, and English is the fallback for other languages.
- Format dates, numbers, and units for each supported language. Long German and French labels wrap on compact cards.

## 1.7.0

- Add English throughout the dashboard card, editor, client controls, and accessibility labels.
- Follow the Home Assistant profile language. Use Dutch for Dutch profiles and English for other languages.
- Localize chart labels, dates, and number formatting. Existing card settings carry over.

## 1.6.0

Home Assistant administrators can now rename connected clients directly on the Deco from the card.

- Enable **Deco-clients hernoemen toestaan** in the card editor or set `client_rename: true`. Renaming is off by default and independent of blocking.
- The rename dialog checks the client's mesh and MAC, accepts names up to 32 UTF-8 bytes, and asks for confirmation. The card shows any action error and uses the new name once Home Assistant reports it. The entity ID stays the same.
- Renaming requires a version of [ha-deco](https://github.com/dkwolf1/ha-deco) that provides `tplink_deco.rename_client`. Blocking and unblocking remain available on supported older versions.

## 1.5.0

- Add optional administrator controls for blocking and unblocking known clients through ha-deco v4.0.0 or later.
- Confirm a block before sending it and show the result verified by Deco or the reported error.

## 1.4.0

- Default to the full section width and fit the card height to its content in Home Assistant.
- Switch the automatic layout to two columns when the card is at least 800 px wide. Keep explicit Compact and Expanded layouts.

## 1.3.1

- Use ha-tplink-card as the name in Marketplace, the Home Assistant card picker, and the documentation.
- Preserve the existing card type, dashboard configuration, and JavaScript resource filename.

## 1.3.0

- Prepared the card as a standalone dashboard repository with a single distributable module and Marketplace metadata.
- Moved Deco details under the diagnostic table in wide mode. Compact mode shows them below the topology.
- Added a time scale, units and sample inspection by pointer, touch and keyboard to the Recorder chart.
- Counted unclassified active client connections and made the list of available client names expandable.
- Showed the last successful update and formatted longer coordinator response times in seconds.

## 1.2.0

- Parsed Home Assistant Recorder responses by entity ID. Automatic and manual sensor sources now agree across chart and live traffic.
- Preserved unknown values when no readings were available and refreshed details when client information changed.
- Balanced the wide layout and allowed longer Deco labels to wrap.

## 1.1.0

- Added a wide layout with a compact fallback for narrow cards.
