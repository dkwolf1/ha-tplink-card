# Changelog

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
