# Changelog

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
