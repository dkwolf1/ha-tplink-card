# Changelog

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
