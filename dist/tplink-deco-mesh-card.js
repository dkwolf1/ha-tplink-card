/*
 * ha-tplink-card v3.0.1
 * Home Assistant Lovelace card for compatible tplink_deco integrations.
 * No external dependencies, no direct modem credentials/API calls.
 * MIT License - 2026
 * SPDX-License-Identifier: MIT
 *
 * Copyright (c) 2026 TP-Link Deco Mesh Live contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
(() => {
  "use strict";
  const CARD_TYPE = "tplink-deco-mesh-card";
  const CARD_NAME = "ha-tplink-card";
  const DECO_DOMAIN = "tplink_deco";
  const CLIENT_BLOCK_ACTION = "set_client_blocked";
  const CLIENT_RENAME_ACTION = "rename_client";
  const CLIENT_NAME_MAX_BYTES = 32;
  const PREFIX = "tplink-deco-mesh";
  const CLIENT_PREVIEW_LIMIT = 12;
  const WIFI_CONFIRM_MS = 30000;
  const MIN_WIFI_INTEGRATION = [4, 2, 0];
  const WIFI_BANDS = {
    band2_4: [null, 1, 14],
    band5: ["5 GHz", 32, 177],
    band5_1: ["5 GHz (1)", 32, 177],
    band5_2: ["5 GHz (2)", 32, 177],
    band6: ["6 GHz", 1, 233],
    band6_2: ["6 GHz (2)", 1, 233],
  };
  const WIFI_BUSY = new Set(["scanning", "optimizing", "confirm_optimization"]);
  const wifiSessions = new WeakMap();
  const MESSAGES = {
    auto: ["Automatic", "Automatisch", "Automatisch", "Automatique"],
    compact: ["Compact", "Compact", "Kompakt", "Compact"],
    expanded: ["Expanded", "Uitgebreid", "Ausführlich", "Détaillé"],
    wide: ["Wide", "Breed", "Breit", "Large"],
    topology: [
      "Mesh topology",
      "Mesh-topologie",
      "Mesh-Topologie",
      "Topologie du réseau maillé",
    ],
    activity: [
      "Network activity",
      "Netwerkactiviteit",
      "Netzwerkaktivität",
      "Activité réseau",
    ],
    diagnostics: [
      "Deco diagnostics",
      "Deco-diagnostiek",
      "Deco-Diagnose",
      "Diagnostic Deco",
    ],
    clients: ["Clients", "Clients", "Geräte", "Appareils"],
    wifi: ["Wi-Fi networks", "WiFi-netwerken", "WLAN-Netze", "Réseaux Wi-Fi"],
    api: [
      "Coordinator / API",
      "Coordinator / API",
      "Koordinator / API",
      "Coordinateur / API",
    ],
    band24: ["2.4 GHz", "2,4 GHz", "2,4 GHz", "2,4 GHz"],
    unknown: ["Unknown", "Onbekend", "Unbekannt", "Inconnu"],
    other: [
      "Unknown/other",
      "Onbekend/overig",
      "Unbekannt / Sonstige",
      "Inconnu / Autre",
    ],
    noHistory: [
      "No Recorder history available.",
      "Geen Recorder-historie beschikbaar.",
      "Im Recorder ist kein Verlauf verfügbar.",
      "Aucun historique disponible dans Recorder.",
    ],
    chartLabel: [
      "Download and upload history. Use the arrow keys to browse readings.",
      "Historische download en upload. Gebruik de pijltjestoetsen om metingen te bekijken.",
      "Verlauf für Download und Upload. Mit den Pfeiltasten durch die Messwerte navigieren.",
      "Historique des débits. Utilisez les flèches du clavier pour parcourir les mesures.",
    ],
    typeError: [
      "Card type must be {type}",
      "type moet {type} zijn",
      "Der Kartentyp muss {type} sein.",
      "Le type de carte doit être {type}.",
    ],
    registryError: [
      "The entity registry is unavailable. Detection is limited to tracker attributes.",
      "Entityregister niet toegankelijk; beperkte detectie via tracker-attributen.",
      "Das Entitätsregister ist nicht verfügbar. Geräte werden nur anhand der Tracker-Attribute erkannt.",
      "Le registre des entités est indisponible. La détection repose uniquement sur les attributs des entités de suivi.",
    ],
    noError: [
      "No error recorded",
      "Geen fout geregistreerd",
      "Kein Fehler erfasst",
      "Aucune erreur",
    ],
    confirmBlock: [
      "Block {name}? This may disconnect the device from the network.",
      "{name} blokkeren? Dit kan de netwerkverbinding verbreken.",
      "{name} sperren? Dadurch kann die Netzwerkverbindung des Geräts unterbrochen werden.",
      "Bloquer {name} ? L’appareil risque d’être déconnecté du réseau.",
    ],
    running: [
      "Running action…",
      "Actie uitvoeren…",
      "Aktion wird ausgeführt …",
      "Action en cours…",
    ],
    blockUnverified: [
      "Deco did not confirm whether the client was blocked or unblocked.",
      "Deco heeft de gevraagde blokkeerstatus niet bevestigd.",
      "Deco hat nicht bestätigt, ob das Gerät gesperrt oder entsperrt wurde.",
      "Deco n’a pas confirmé si l’appareil a été bloqué ou débloqué.",
    ],
    blocked: [
      "Deco confirmed the client is blocked.",
      "Deco bevestigt: geblokkeerd.",
      "Deco hat die Sperre bestätigt.",
      "Deco a confirmé le blocage de l’appareil.",
    ],
    unblocked: [
      "Deco confirmed the client is unblocked.",
      "Deco bevestigt: gedeblokkeerd.",
      "Deco hat die Freigabe bestätigt.",
      "Deco a confirmé le déblocage de l’appareil.",
    ],
    blockFailed: [
      "Action failed.",
      "Actie mislukt.",
      "Aktion fehlgeschlagen.",
      "L’action a échoué.",
    ],
    blockUnknown: [
      "Deco did not confirm the change.",
      "Deco heeft de wijziging niet bevestigd.",
      "Deco hat die Änderung nicht bestätigt.",
      "Deco n’a pas confirmé la modification.",
    ],
    renameTitle: [
      "Rename client",
      "Client hernoemen",
      "Gerät umbenennen",
      "Renommer l’appareil",
    ],
    renamePrompt: [
      "Enter a new name for {name} on the Deco.",
      "Wijzig de naam van {name} op de Deco.",
      "Gib einen neuen Namen für {name} auf dem Deco ein.",
      "Saisissez le nouveau nom de {name} sur le Deco.",
    ],
    newName: ["New name", "Nieuwe naam", "Neuer Name", "Nouveau nom"],
    nameLimit: [
      "Up to {count} UTF-8 bytes.",
      "Maximaal {count} UTF-8-bytes.",
      "Höchstens {count} UTF-8-Bytes.",
      "{count} octets UTF‑8 maximum.",
    ],
    cancel: ["Cancel", "Annuleren", "Abbrechen", "Annuler"],
    confirmRename: [
      "Confirm rename",
      "Hernoemen bevestigen",
      "Umbenennung bestätigen",
      "Confirmer le renommage",
    ],
    invalidName: [
      "Enter a name of 1 to 32 UTF-8 bytes using printable characters.",
      "Gebruik een leesbare naam van 1 tot 32 UTF-8-bytes.",
      "Gib einen Namen mit 1 bis 32 UTF-8-Bytes ein. Verwende druckbare Zeichen.",
      "Saisissez un nom de 1 à 32 octets UTF‑8 composé de caractères imprimables.",
    ],
    renaming: [
      "Renaming…",
      "Naam wijzigen…",
      "Name wird geändert …",
      "Renommage en cours…",
    ],
    renameUnverified: [
      "Deco did not confirm the new name.",
      "Deco heeft de nieuwe naam niet bevestigd.",
      "Deco hat den neuen Namen nicht bestätigt.",
      "Deco n’a pas confirmé le nouveau nom.",
    ],
    renamed: [
      "Deco confirmed the new name. It will appear on the card when Home Assistant reports it.",
      "Deco heeft de naam bevestigd. De kaart gebruikt de naam uit Home Assistant bij de volgende update.",
      "Deco hat den neuen Namen bestätigt. Er erscheint auf der Karte, sobald Home Assistant ihn meldet.",
      "Deco a confirmé le nouveau nom. La carte l’affichera dès que Home Assistant le signalera.",
    ],
    close: ["Close", "Sluiten", "Schließen", "Fermer"],
    renameFailed: [
      "Rename failed.",
      "Hernoemen mislukt.",
      "Umbenennung fehlgeschlagen.",
      "Le renommage a échoué.",
    ],
    noNodes: [
      "No Deco units found.",
      "Geen Deco-nodes gevonden.",
      "Keine Deco-Geräte gefunden.",
      "Aucun module Deco trouvé.",
    ],
    mainDeco: ["Main Deco", "Hoofd-Deco", "Haupt-Deco", "Deco principal"],
    nodeDetails: [
      "Details for {name}",
      "Details van {name}",
      "Details zu {name}",
      "Détails de {name}",
    ],
    unit: ["Deco unit", "Deco-unit", "Deco-Gerät", "module Deco"],
    units: ["Deco units", "Deco-units", "Deco-Geräte", "modules Deco"],
    satellite: ["satellite", "satelliet", "Satellit", "satellite"],
    satellites: ["satellites", "satellieten", "Satelliten", "satellites"],
    hiddenNodes: ["not shown", "niet getoond", "ausgeblendet", "non affichés"],
    unknownNodeLink: [
      "Linked Deco unknown",
      "Gekoppelde Deco onbekend",
      "Verbundener Deco unbekannt",
      "Deco associé inconnu",
    ],
    topologyNote: [
      "A logical view of the main Deco and reported satellite connections.",
      "Logisch overzicht op basis van de gemelde hoofd-Deco en satellietkoppelingen. Geen gemeten radiopad of signaalsterkte tussen nodes.",
      "Übersicht über den Haupt-Deco und die gemeldeten Verbindungen zu den Satelliten.",
      "Vue logique du Deco principal et des liaisons déclarées vers les satellites.",
    ],
    detailsClose: [
      "Close details",
      "Details sluiten",
      "Details schließen",
      "Fermer les détails",
    ],
    memory: ["Memory", "Geheugen", "Arbeitsspeicher", "Mémoire"],
    backhaulSpeed: [
      "Backhaul speed",
      "Backhaul snelheid",
      "Geschwindigkeit der Mesh-Verbindung",
      "Débit de la liaison inter-Deco",
    ],
    backhaulMax: [
      "Maximum backhaul speed",
      "Backhaul maximum",
      "Maximale Geschwindigkeit der Mesh-Verbindung",
      "Débit maximal de la liaison inter-Deco",
    ],
    connected: [
      "Connected clients",
      "Verbonden clients",
      "Verbundene Geräte",
      "Appareils connectés",
    ],
    connectedSingle: [
      "connected client",
      "verbonden client",
      "verbundenes Gerät",
      "appareil connecté",
    ],
    connectedCount: [
      "connected clients",
      "verbonden clients",
      "verbundene Geräte",
      "appareils connectés",
    ],
    client: ["client", "client", "Gerät", "appareil"],
    clientCount: ["clients", "clients", "Geräte", "appareils"],
    fewer: ["Show fewer", "Minder tonen", "Weniger anzeigen", "Afficher moins"],
    more: [
      "+{count} more",
      "+{count} meer",
      "+{count} weitere",
      "+{count} de plus",
    ],
    nodeStatus: [
      "Deco status and diagnostics",
      "Deco-status en diagnose",
      "Deco-Status und Diagnose",
      "État et diagnostic des Deco",
    ],
    technicalDiagnostics: [
      "Technical diagnostics",
      "Technische diagnose",
      "Technische Diagnose",
      "Diagnostics techniques",
    ],
    cpuPerNode: [
      "CPU / RAM per node",
      "CPU / RAM per node",
      "CPU / RAM je Deco",
      "CPU / RAM par Deco",
    ],
    main: ["Main", "Hoofd", "Hauptgerät", "Principal"],
    block: ["Block", "Blokkeren", "Sperren", "Bloquer"],
    unblock: ["Unblock", "Deblokkeren", "Entsperren", "Débloquer"],
    rename: ["Rename", "Hernoemen", "Umbenennen", "Renommer"],
    controls: [
      "Client controls",
      "Clientbeheer",
      "Geräteverwaltung",
      "Gestion des appareils",
    ],
    clientActivity: [
      "Client activity",
      "Clientactiviteit",
      "Geräteaktivität",
      "Activité des appareils",
    ],
    clientHint: [
      "Clients are grouped by the connection type reported by Deco.",
      "Clientband komt uit het door Deco gemelde verbindingstype.",
      "Die Geräte sind nach der von Deco gemeldeten Verbindungsart gruppiert.",
      "Les appareils sont regroupés selon le type de connexion indiqué par Deco.",
    ],
    primaryNetwork: [
      "Main network",
      "Hoofdnetwerk",
      "Hauptnetz",
      "Réseau principal",
    ],
    guestNetwork: ["Guest network", "Gastnetwerk", "Gastnetz", "Réseau invité"],
    iotNetwork: ["IoT network", "IoT-netwerk", "IoT-Netz", "Réseau IoT"],
    wifiSwitchError: [
      "Could not change the Wi-Fi network.",
      "Wifi-netwerk wijzigen mislukt.",
      "Das WLAN konnte nicht ein- oder ausgeschaltet werden.",
      "Impossible de modifier l’état du réseau Wi-Fi.",
    ],
    on: ["On", "Aan", "Ein", "Activé"],
    off: ["Off", "Uit", "Aus", "Désactivé"],
    wifiHint: [
      "The integration disables the main Wi-Fi sensor by default. Status is unknown when the sensor is missing.",
      "De hoofd-WiFi-sensor is standaard uitgeschakeld in de integratie. Ontbrekend = onbekend.",
      "Der Sensor für das Haupt-WLAN ist standardmäßig deaktiviert. Fehlt der Sensor, ist der Status unbekannt.",
      "Le capteur du réseau Wi-Fi principal est désactivé par défaut. En son absence, l’état du réseau est inconnu.",
    ],
    optionalDiagnostics: [
      "Optional diagnostic entities",
      "Optionele diagnose-entiteiten",
      "Optionale Diagnose-Entitäten",
      "Entités de diagnostic facultatives",
    ],
    decoUpdated: [
      "Last Deco update",
      "Deco laatste update",
      "Letzte Deco-Aktualisierung",
      "Dernière mise à jour des Deco",
    ],
    clientsUpdated: [
      "Last client update",
      "Clients laatste update",
      "Letzte Geräteaktualisierung",
      "Dernière mise à jour des appareils",
    ],
    decoResponse: [
      "Deco response time",
      "Deco responstijd",
      "Deco-Antwortzeit",
      "Temps de réponse des Deco",
    ],
    clientResponse: [
      "Client response time",
      "Client responstijd",
      "Antwortzeit der Geräteabfrage",
      "Temps de réponse (appareils)",
    ],
    queryMode: [
      "Query mode",
      "Querymodus",
      "Abfragemodus",
      "Mode d’interrogation",
    ],
    perNode: ["Per node", "Per node", "Je Deco", "Par Deco"],
    globalFallback: [
      "All clients (fallback)",
      "Algemene terugvalmodus",
      "Alle Geräte (Ausweichmodus)",
      "Tous les appareils (mode de secours)",
    ],
    wireless: ["Wi-Fi", "WiFi", "WLAN", "Wi-Fi"],
    lastError: [
      "Last error",
      "Laatste fout",
      "Letzter Fehler",
      "Dernière erreur",
    ],
    active: ["Active", "Actief", "Aktiv", "Actif"],
    paused: ["Paused", "Gepauzeerd", "Pausiert", "En pause"],
    hourShort: ["h", "u", " h", " h"],
    hour: ["hour", "uur", "Stunde", "heure"],
    hours: ["hours", "uur", "Stunden", "heures"],
    historyLoading: [
      "Loading history…",
      "Historie laden…",
      "Verlauf wird geladen …",
      "Chargement de l’historique…",
    ],
    rateHint: [
      "Combined throughput reported by clients.",
      "Dit is de som van door clients gerapporteerde doorvoer; geen internetsnelheidstest.",
      "Summe der von den Geräten gemeldeten Datenraten.",
      "Débit cumulé signalé par les appareils.",
    ],
    visible: [
      "Visible sections",
      "Zichtbare onderdelen",
      "Sichtbare Bereiche",
      "Sections visibles",
    ],
    showAll: ["Show all", "Alles tonen", "Alles anzeigen", "Tout afficher"],
    widgetsHint: [
      "Changes apply temporarily. Use the card editor or YAML to save your preferences.",
      "Dit verandert de kaart tijdelijk. Voor blijvende instellingen gebruik je de kaarteditor of YAML.",
      "Diese Änderungen gelten vorübergehend. Speichere dauerhafte Einstellungen im Karteneditor oder in YAML.",
      "Ces changements sont temporaires. Pour les conserver, utilisez l’éditeur de carte ou la configuration YAML.",
    ],
    multipleMeshes: [
      "Several TP-Link Deco installations were found. The card shows the first one. To choose another mesh, open {setting} in the card editor.",
      "Meerdere TP-Link Deco-installaties gevonden. De kaart toont de eerste. Kies een andere mesh bij {setting} in de kaarteditor.",
      "Mehrere TP-Link-Deco-Installationen gefunden. Die Karte zeigt die erste an. Wähle im Karteneditor unter {setting} ein anderes Mesh.",
      "Plusieurs installations TP-Link Deco ont été détectées. La carte affiche la première. Dans l’éditeur de carte, ouvrez {setting} pour en choisir une autre.",
    ],
    noUnits: [
      "No Deco units found",
      "Geen Deco-units gevonden",
      "Keine Deco-Geräte gefunden",
      "Aucun module Deco trouvé",
    ],
    noUnitsHint: [
      "Check that the TP-Link Deco integration is running and that its device tracker entities are available.",
      "Controleer of ha-tplink-deco actief is en de device_tracker-entiteiten beschikbaar zijn. De kaart gebruikt de Deco-integratie via het entiteitenregister.",
      "Prüfe, ob die TP-Link-Deco-Integration läuft und die Geräte-Tracker-Entitäten verfügbar sind.",
      "Vérifiez que l’intégration TP-Link Deco fonctionne et que ses entités de suivi des appareils sont disponibles.",
    ],
    retry: ["Try again", "Opnieuw proberen", "Erneut versuchen", "Réessayer"],
    mainCpu: [
      "Main Deco CPU",
      "CPU hoofd-Deco",
      "CPU des Haupt-Deco",
      "CPU du Deco principal",
    ],
    response: [
      "API response time",
      "API responstijd",
      "API-Antwortzeit",
      "Temps de réponse de l’API",
    ],
    updated: [
      "Updated {time}",
      "Bijgewerkt {time}",
      "Aktualisiert: {time}",
      "Mise à jour : {time}",
    ],
    noUpdate: [
      "Last update unknown",
      "Update onbekend",
      "Letzte Aktualisierung unbekannt",
      "Dernière mise à jour inconnue",
    ],
    subtitle: [
      "Live mesh network",
      "Mesh netwerk live",
      "Mesh-Netzwerk in Echtzeit",
      "Réseau maillé en direct",
    ],
    chooseSections: [
      "Choose visible sections",
      "Zichtbare onderdelen kiezen",
      "Sichtbare Bereiche auswählen",
      "Choisir les sections à afficher",
    ],
    pollingOn: [
      "Polling active",
      "Polling actief",
      "Abfrage aktiv",
      "Interrogation active",
    ],
    pollingOff: [
      "Polling off",
      "Polling uit",
      "Abfrage aus",
      "Interrogation désactivée",
    ],
    title: ["Title", "Titel", "Titel", "Titre"],
    layout: ["Layout", "Formaat", "Layout", "Disposition"],
    meshEntry: [
      "Mesh installation",
      "Mesh-installatie",
      "Mesh-Installation",
      "Installation Deco",
    ],
    firstEntry: [
      "Automatic (first installation)",
      "Automatisch (eerste installatie)",
      "Automatisch (erste Installation)",
      "Automatique (première installation)",
    ],
    historyRange: [
      "History range",
      "Grafiekvenster",
      "Verlaufszeitraum",
      "Période de l’historique",
    ],
    allowBlock: [
      "Allow blocking and unblocking clients",
      "Clientbeheer toestaan (blokkeren en deblokkeren)",
      "Sperren und Entsperren von Geräten erlauben",
      "Autoriser le blocage et le déblocage des appareils",
    ],
    allowRename: [
      "Allow renaming Deco clients",
      "Deco-clients hernoemen toestaan",
      "Umbenennen von Geräten erlauben",
      "Autoriser le renommage des appareils",
    ],
    editorSections: [
      "Visible sections",
      "Zichtbare secties",
      "Sichtbare Bereiche",
      "Sections visibles",
    ],
    editorHint: [
      "Some diagnostic entities are disabled by default. Enable them under Settings → Devices & services → TP-Link Deco → Entities. Wi-Fi status depends on the firmware.",
      "De diagnose-entiteiten zijn soms standaard uitgeschakeld. Schakel deze in onder Instellingen → Apparaten en diensten → TP-Link Deco → Entiteiten. WiFi-status verschilt per firmware.",
      "Einige Diagnose-Entitäten sind standardmäßig deaktiviert. Aktiviere sie unter Einstellungen → Geräte & Dienste → TP-Link Deco → Entitäten. Der WLAN-Status hängt von der Firmware ab.",
      "Certaines entités de diagnostic sont désactivées par défaut. Activez-les dans Paramètres → Appareils et services → TP-Link Deco → Entités. L’état du Wi-Fi dépend du micrologiciel.",
    ],
    description: [
      "Mesh topology and network diagnostics for TP-Link Deco",
      "Visuele mesh-topologie en netwerkdiagnostiek voor ha-tplink-deco",
      "Mesh-Topologie und Netzwerkdiagnose für TP-Link Deco",
      "Topologie du réseau maillé et diagnostic réseau pour TP-Link Deco",
    ],
    online: ["Online", "Online", "Online", "En ligne"],
    offline: ["Offline", "Offline", "Offline", "Hors ligne"],
    download: ["Download", "Download", "Download", "Débit descendant"],
    upload: ["Upload", "Upload", "Upload", "Débit montant"],
    status: ["Status", "Status", "Status", "État"],
    model: ["Model", "Model", "Modell", "Modèle"],
    backhaul: ["Backhaul", "Backhaul", "Mesh-Verbindung", "Liaison inter-Deco"],
    polling: ["Polling", "Polling", "Abfrage", "Interrogation"],
    timeouts: [
      "Timeouts",
      "Timeouts",
      "Zeitüberschreitungen",
      "Délais dépassés",
    ],
    widgets: ["Widgets", "Widgets", "Widgets", "Widgets"],
    trafficUnit: ["kB/s", "kB/s", "kB/s", "ko/s"],
    percent: ["%", "%", " %", " %"],
    wifiMonitor: [
      "Wi-Fi scan and optimization",
      "Wifi scannen en optimaliseren",
      "WLAN-Scan und Optimierung",
      "Analyse et optimisation du Wi-Fi",
    ],
    wifiCurrentChannels: [
      "Current channels",
      "Huidige kanalen",
      "Aktuelle Kanäle",
      "Canaux actuels",
    ],
    wifiLab: [
      "Deco Wi-Fi · Frequency Lab",
      "Deco Wifi · Frequentielab",
      "Deco-WLAN · Frequenzlabor",
      "Wi-Fi Deco · Labo des fréquences",
    ],
    wifiScan: [
      "Scan Wi-Fi",
      "Wifi scannen",
      "WLAN scannen",
      "Analyser le Wi-Fi",
    ],
    wifiOptimize: [
      "Optimize Wi-Fi",
      "Wifi optimaliseren",
      "WLAN optimieren",
      "Optimiser le Wi-Fi",
    ],
    wifiConfirm: [
      "Confirm Wi-Fi optimization",
      "Wifi-optimalisatie uitvoeren",
      "WLAN-Optimierung ausführen",
      "Lancer l’optimisation du Wi-Fi",
    ],
    wifiPanelTitle: [
      "Reported channels",
      "Gemelde kanalen",
      "Gemeldete Kanäle",
      "Canaux signalés",
    ],
    wifiAdvice: [
      "Deco advice",
      "Deco-advies",
      "Deco-Empfehlung",
      "Conseil Deco",
    ],
    wifiChannel: ["Channel", "Kanaal", "Kanal", "Canal"],
    wifiWidth: ["Width", "Breedte", "Breite", "Largeur"],
    wifiSchematic: [
      "Schematic view of the reported primary channel. Width is shown in MHz.",
      "Schematische weergave van het gemelde primaire kanaal. De breedte staat in MHz.",
      "Schematische Darstellung des gemeldeten Primärkanals. Die Breite wird in MHz angezeigt.",
      "Vue schématique du canal primaire signalé. La largeur est indiquée en MHz.",
    ],
    wifiNoBands: [
      "Deco has not reported channel data yet.",
      "Deco heeft nog geen kanaalgegevens gemeld.",
      "Deco hat noch keine Kanaldaten gemeldet.",
      "Deco n’a pas encore signalé de données de canal.",
    ],
    wifiUnknown: [
      "No advice available yet.",
      "Er is nog geen advies beschikbaar.",
      "Es ist noch keine Empfehlung verfügbar.",
      "Aucun conseil disponible pour le moment.",
    ],
    wifiUnavailable: [
      "Wi-Fi advice is unavailable.",
      "Het wifi-advies is niet beschikbaar.",
      "Die WLAN-Empfehlung ist nicht verfügbar.",
      "Le conseil Wi-Fi est indisponible.",
    ],
    wifiOptimal: [
      "Deco reports optimal settings",
      "Deco meldt optimale instellingen",
      "Deco meldet optimale Einstellungen",
      "Deco indique que les réglages sont optimaux",
    ],
    wifiLastAdvice: [
      "Last known advice",
      "Laatst bekende advies",
      "Zuletzt gemeldete Empfehlung",
      "Dernier conseil disponible",
    ],
    wifiNoOptimization: [
      "No optimization needed",
      "Geen optimalisatie nodig",
      "Keine Optimierung nötig",
      "Aucune optimisation nécessaire",
    ],
    wifiRecommended: [
      "Optimization recommended",
      "Optimalisatie aanbevolen",
      "Optimierung empfohlen",
      "Optimisation recommandée",
    ],
    wifiScanning: [
      "Deco is scanning",
      "Deco is aan het scannen",
      "Deco scannt",
      "Deco analyse le Wi-Fi",
    ],
    wifiOptimizing: [
      "Deco is optimizing",
      "Deco optimaliseert",
      "Deco optimiert",
      "Deco optimise le Wi-Fi",
    ],
    wifiAwaiting: [
      "Awaiting confirmation",
      "Wacht op bevestiging",
      "Bestätigung ausstehend",
      "En attente de confirmation",
    ],
    wifiArmHint: [
      "Wi-Fi may disconnect briefly. Confirm within 30 seconds using the same administrator account.",
      "Wifi kan kort wegvallen. Bevestig binnen 30 seconden met hetzelfde beheerdersaccount.",
      "Das WLAN kann kurz ausfallen. Bestätige innerhalb von 30 Sekunden mit demselben Administratorkonto.",
      "Le Wi-Fi peut être brièvement interrompu. Confirmez dans les 30 secondes avec le même compte administrateur.",
    ],
    wifiOtherArm: [
      "A confirmation is pending. Confirm from the card or Home Assistant session that started it.",
      "Er staat een bevestiging open. Bevestig vanuit de kaart of Home Assistant-sessie waar je de actie startte.",
      "Eine Bestätigung steht aus. Bestätige in der Karte oder Home-Assistant-Sitzung, in der du die Aktion gestartet hast.",
      "Une confirmation est en attente. Confirmez depuis la carte ou la session Home Assistant qui a lancé l’action.",
    ],
    wifiExpired: [
      "The confirmation window has expired.",
      "De bevestigingstermijn is verstreken.",
      "Die Bestätigungsfrist ist abgelaufen.",
      "Le délai de confirmation est écoulé.",
    ],
    wifiRequest: [
      "Sending request to Home Assistant…",
      "Verzoek naar Home Assistant versturen…",
      "Anfrage wird an Home Assistant gesendet …",
      "Envoi de la demande à Home Assistant…",
    ],
    wifiAck: [
      "Deco acknowledged the request.",
      "Deco heeft het verzoek bevestigd.",
      "Deco hat die Anfrage bestätigt.",
      "Deco a accusé réception de la demande.",
    ],
    wifiObserved: [
      "Deco reported a completed scan.",
      "Deco heeft een voltooide scan gemeld.",
      "Deco hat einen abgeschlossenen Scan gemeldet.",
      "Deco a signalé une analyse terminée.",
    ],
    wifiNotObserved: [
      "No new scan result was reported.",
      "Er is geen nieuwe scanuitslag gemeld.",
      "Es wurde kein neues Scanergebnis gemeldet.",
      "Aucun nouveau résultat d’analyse n’a été signalé.",
    ],
    wifiScanAck: [
      "Deco acknowledged the scan request.",
      "Deco heeft het scanverzoek bevestigd.",
      "Deco hat die Scan-Anfrage bestätigt.",
      "Deco a accusé réception de la demande d’analyse.",
    ],
    wifiAdviceChanged: [
      "Deco reported updated advice.",
      "Deco heeft gewijzigd advies gemeld.",
      "Deco hat eine neue Empfehlung gemeldet.",
      "Deco a signalé un nouveau conseil.",
    ],
    wifiOptimized: [
      "Deco no longer recommends optimization.",
      "Deco raadt geen verdere optimalisatie aan.",
      "Deco empfiehlt keine weitere Optimierung.",
      "Deco ne recommande plus d’optimisation.",
    ],
    wifiOutcomeError: [
      "Deco could not confirm the action outcome.",
      "Deco kon de uitkomst van de actie niet bevestigen.",
      "Deco konnte das Ergebnis der Aktion nicht bestätigen.",
      "Deco n’a pas pu confirmer le résultat de l’action.",
    ],
    wifiActionError: [
      "Wi-Fi action failed.",
      "Wifi-actie mislukt.",
      "WLAN-Aktion fehlgeschlagen.",
      "L’action Wi-Fi a échoué.",
    ],
    wifiBefore: ["Before", "Voor", "Vorher", "Avant"],
    wifiAfter: ["Now", "Nu", "Jetzt", "Maintenant"],
    wifiComparison: [
      "Changes after optimization",
      "Wijzigingen na optimalisatie",
      "Änderungen nach der Optimierung",
      "Changements après l’optimisation",
    ],
    wifiNoFreshValue: [
      "No fresh value available",
      "Geen verse waarde beschikbaar",
      "Kein neuer Messwert verfügbar",
      "Aucune valeur récente disponible",
    ],
    wifiLastReported: [
      "Last reported",
      "Laatst gemeld",
      "Zuletzt gemeldet",
      "Dernière valeur signalée",
    ],
    wifiSameLastReported: [
      "Unchanged in the last reported value",
      "Ongewijzigd volgens de laatst gemelde waarde",
      "Laut letztem gemeldeten Wert unverändert",
      "Inchangé d’après la dernière valeur signalée",
    ],
    wifiUnchanged: ["Unchanged", "Ongewijzigd", "Unverändert", "Inchangé"],
    wifiNoBaseline: [
      "No baseline available",
      "Geen nulmeting beschikbaar",
      "Kein Ausgangswert vorhanden",
      "Aucune valeur de référence",
    ],
  };
  function makeUi(language, locale, index) {
    const t = Object.fromEntries(
      Object.entries(MESSAGES).map(([key, labels]) => [key, labels[index]]),
    );
    const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
    const plurals = new Intl.PluralRules(locale);
    const isSingular = (count) =>
      count != null && plurals.select(count) === "one";
    const countLabel = (count, singular, plural) =>
      `${count ?? "—"} ${isSingular(count) ? singular : plural}`;
    const clock = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" };
    const date = { day: "2-digit", month: "2-digit" };
    const clockTime = new Intl.DateTimeFormat(locale, clock);
    const dateAndTime = new Intl.DateTimeFormat(locale, { ...date, ...clock });
    const measureTime = new Intl.DateTimeFormat(locale, {
      ...date,
      ...clock,
      second: "2-digit",
    });
    const chartNumber = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 10,
    });
    const field = (value, suffix = "") =>
      value == null ? "—" : `${number.format(value)}${suffix}`;
    const duration = (ms) =>
      ms >= 1000 ? field(ms / 1000, " s") : field(ms, " ms");
    function timeLabel(value) {
      if (!valid(value)) return "—";
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? String(value)
        : dateAndTime.format(date);
    }
    return {
      language,
      locale,
      t,
      number,
      isSingular,
      countLabel,
      clockTime,
      dateAndTime,
      measureTime,
      chartNumber,
      field,
      duration,
      timeLabel,
    };
  }
  // The language order matches each entry in MESSAGES.
  const UI = Object.fromEntries(
    [
      ["en", "en-US"],
      ["nl", "nl-NL"],
      ["de", "de-DE"],
      ["fr", "fr-FR"],
    ].map(([language, locale], index) => [
      language,
      makeUi(language, locale, index),
    ]),
  );
  function uiFor(language) {
    const code = String(language || "")
      .toLowerCase()
      .split(/[-_]/)[0];
    return Object.hasOwn(UI, code) ? UI[code] : UI.en;
  }
  const hassUi = (hass) =>
    uiFor(
      hass?.language ||
        hass?.locale?.language ||
        document.documentElement?.lang,
    );
  const message = (template, values) =>
    template.replace(/\{(\w+)\}/g, (_, key) => values[key]);
  const historyLength = (hours, t) =>
    `${hours} ${hours === 1 ? t.hour : t.hours}`;
  const COMPACT_WIDTH = 590;
  const WIDE_WIDTH = 800;
  const VIEWS = ["auto", "compact", "expanded", "wide"];
  const DEFAULT_SECTIONS = [
    "topology",
    "traffic",
    "nodes",
    "clients",
    "wifi",
    "api",
  ];
  const SECTION_KEYS = {
    topology: "topology",
    traffic: "activity",
    nodes: "diagnostics",
    clients: "clients",
    wifi: "wifi",
    api: "api",
  };
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const valid = (v) =>
    v !== undefined &&
    v !== null &&
    v !== "" &&
    v !== "unknown" &&
    v !== "unavailable" &&
    v !== "None" &&
    v !== "none";
  const num = (v) => {
    if (!valid(v)) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const normalize = (v) =>
    String(v || "")
      .trim()
      .toLowerCase();
  const isOnline = (s) =>
    valid(s)
      ? ["home", "on", "connected", "online", "true", "1"].includes(
          normalize(s),
        )
      : null;
  const stateVal = (hass, id) => (id ? hass?.states?.[id] : null);
  const numeric = (s) => num(s?.state);
  const boolAttr = (v) =>
    v === true || ["on", "online", "yes", "true", "1"].includes(normalize(v));
  function prettyName(raw) {
    return (
      String(raw || "Deco")
        .replace(/^TP[- ]?Link\s+/i, "")
        .replace(/\s+Deco$/i, "")
        .trim() || "Deco"
    );
  }
  function modeLabel(v, t) {
    const a = Array.isArray(v) ? v[0] : v;
    const s = normalize(a);
    if (["wired", "ethernet", "lan"].includes(s)) return "Ethernet";
    if (["band5", "5g", "5ghz", "5_ghz", "wifi_5g"].includes(s)) return "5 GHz";
    if (["band2_4", "2.4g", "2_4ghz", "2.4ghz"].includes(s)) return t.band24;
    if (s === "wireless") return t.wireless;
    return valid(a) ? String(a) : "—";
  }
  function reading(hass, item) {
    return numeric(stateVal(hass, item));
  }
  function canCallClientAction(hass, action) {
    return (
      hass?.user?.is_admin === true &&
      hass.connected !== false &&
      !!hass.services?.[DECO_DOMAIN]?.[action] &&
      typeof hass.callService === "function"
    );
  }

  function normalizeClientMac(value) {
    if (typeof value !== "string") return null;
    const mac = value.trim().toUpperCase().replace(/-/g, ":");
    if (!/^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(mac)) return null;
    if (mac === "00:00:00:00:00:00" || parseInt(mac.slice(0, 2), 16) % 2)
      return null;
    return mac;
  }

  function macOf(entry, hassState) {
    return normalize(hassState?.attributes?.mac || entry?.unique_id || "");
  }
  function wifiTimestamp(entity) {
    const timestamp = [
      entity?.last_reported,
      entity?.last_updated,
      entity?.last_changed,
    ]
      .map(Date.parse)
      .filter(Number.isFinite);
    return timestamp.length ? Math.max(...timestamp) : null;
  }
  function supportsWifiControls(manifest) {
    const repo = /^https:\/\/github\.com\/dkwolf1\/ha-deco(?:\/|$)/i;
    if (
      manifest?.domain !== DECO_DOMAIN ||
      ![manifest.documentation, manifest.issue_tracker].some((url) =>
        repo.test(url),
      )
    )
      return false;
    const version =
      typeof manifest.version === "string" &&
      /^v?(\d+)\.(\d+)\.(\d+)(?:[.-]?(alpha|beta|rc|dev|a|b)[.-]?(\d+)?)?(?:\+[\da-z.-]+)?$/i.exec(
        manifest.version,
      );
    if (!version) return false;
    for (const [index, minimum] of MIN_WIFI_INTEGRATION.entries()) {
      const component = Number(version[index + 1]);
      if (component !== minimum) return component > minimum;
    }
    const phase = version[4]?.toLowerCase();
    return (
      !phase ||
      phase === "rc" ||
      ((phase === "beta" || phase === "b") && Number(version[5]) >= 2)
    );
  }
  function wifiSample(entity, value) {
    const reading = num(value);
    if (!Number.isInteger(reading) || reading <= 0) return null;
    return { value: reading, at: wifiTimestamp(entity) };
  }
  const ico = (name, size = 20) =>
    `<ha-icon icon="mdi:${esc(name)}" style="--mdc-icon-size:${size}px;width:${size}px;height:${size}px"></ha-icon>`;

  function nearestSample(series, t) {
    let low = 0,
      high = series.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (series[mid].t < t) low = mid + 1;
      else high = mid;
    }
    const before = series[low - 1],
      after = series[low];
    if (!before || (after && after.t - t < t - before.t)) return after;
    return before;
  }

  function trendSvg(
    { down, up, start, end },
    { t, number, clockTime, dateAndTime },
  ) {
    if (!down.length && !up.length) {
      return `<div class="empty-small">${t.noHistory}</div>`;
    }
    const width = 640,
      height = 150,
      padding = 4;
    let peak = 1;
    for (const series of [down, up]) {
      for (const { v } of series) peak = Math.max(peak, v);
    }
    const step = 10 ** Math.floor(Math.log10(peak));
    const ceiling = Math.ceil(peak / step) * step;
    const x = (t) =>
      (Math.max(0, Math.min(1, (t - start) / (end - start))) * width).toFixed(
        1,
      );
    const y = (v) =>
      (
        height -
        padding -
        (Math.max(0, v) / ceiling) * (height - 2 * padding)
      ).toFixed(1);
    const draw = (series, color, area = false) => {
      if (!series.length) return "";
      const first = series[0],
        last = series[series.length - 1];
      if (series.length === 1)
        return `<circle cx="${x(first.t)}" cy="${y(first.v)}" r="3" fill="${color}"/>`;
      const line = series
        .map(({ t, v }, i) => `${i ? "L" : "M"}${x(t)},${y(v)}`)
        .join(" ");
      const fill = area
        ? `<path d="${line} L${x(last.t)},${height - padding} L${x(first.t)},${height - padding} Z" fill="url(#${PREFIX}-fill)"/>`
        : "";
      return `${fill}<path d="${line}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
    };
    const tickFormat =
      new Date(start).toDateString() === new Date(end).toDateString()
        ? clockTime
        : dateAndTime;
    const ticks = [start, (start + end) / 2, end]
      .map((t) => `<span>${esc(tickFormat.format(t))}</span>`)
      .join("");
    return `<div class="chart">
      <div class="chart-unit">${t.trafficUnit}</div>
      <div class="chart-scale"><span>${esc(number.format(ceiling))}</span><span>${esc(number.format(ceiling / 2))}</span><span>0</span></div>
      <div class="chart-plot" tabindex="0" role="group" aria-label="${t.chartLabel}" aria-describedby="${PREFIX}-readout">
        <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="${PREFIX}-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#27e5c4" stop-opacity=".27"/><stop offset="100%" stop-color="#27e5c4" stop-opacity="0"/></linearGradient></defs>
          <path class="grid-line" d="M0 ${padding} H${width} M0 ${height / 2} H${width} M0 ${height - padding} H${width}" vector-effect="non-scaling-stroke"/>
          ${draw(down, "#29e5c6", true)}${draw(up, "#71b8fd")}
        </svg>
        <span class="chart-cursor" aria-hidden="true" hidden></span>
      </div>
      <div class="chart-times">${ticks}</div>
      <div class="chart-readout" id="${PREFIX}-readout"><span data-series="down"></span><span data-series="up"></span></div>
    </div>`;
  }

  class DecoMeshCard extends HTMLElement {
    static getStubConfig() {
      return {
        type: `custom:${CARD_TYPE}`,
        title: CARD_NAME,
        view: "auto",
      };
    }
    static getConfigElement() {
      return document.createElement(`${CARD_TYPE}-editor`);
    }
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      // Leave the rename dialog and its draft intact during dashboard updates.
      this._content = document.createElement("div");
      this._content.style.display = "contents";
      this.shadowRoot.append(this._content);
      this._config = {};
      this._hass = null;
      this._registry = null;
      this._regError = false;
      this._registryConnection = null;
      this._registryLoading = false;
      this._history = { down: [], up: [] };
      this._historyKey = "";
      this._historyAt = 0;
      this._historyLoading = false;
      this._selectedNode = null;
      this._showAllClients = false;
      this._clientActionFeedback = new Map();
      this._wifiSwitchFeedback = new Map();
      this._clientRenameDialog = null;
      this._wifiDialog = null;
      this._wifiTimer = null;
      this._wifiOwner = {};
      this._wifiManifest = null;
      this._chartTime = null;
      this._localSections = null;
      this._expanded = false;
      this._cardWidth = 0;
      this._lastMarkup = "";
      this._renderQueued = false;
      this._resizeObserver =
        typeof ResizeObserver !== "undefined"
          ? new ResizeObserver((entries) => {
              const previousLayout = this._layout();
              this._cardWidth = entries[0]?.contentRect.width ?? 0;
              if (this._layout() !== previousLayout) this._queueRender();
            })
          : null;
      this.shadowRoot.addEventListener("click", (e) => this._onClick(e));
      this.shadowRoot.addEventListener("pointermove", (event) => {
        if (event.pointerType !== "touch") this._pointAtChart(event);
      });
      this.shadowRoot.addEventListener("pointerout", (event) => {
        const plot = event.target.closest(".chart-plot");
        if (
          plot &&
          !plot.contains(event.relatedTarget) &&
          event.pointerType !== "touch"
        ) {
          this._chartTime = null;
          this._updateChartReadout(plot);
        }
      });
      this.shadowRoot.addEventListener("keydown", (event) =>
        this._chartKeydown(event),
      );
    }
    connectedCallback() {
      this._resizeObserver?.observe(this);
      this._queueRender();
    }
    disconnectedCallback() {
      this._resizeObserver?.disconnect();
      this._clientRenameDialog?.element.close();
      this._wifiDialog?.element.close();
      clearTimeout(this._wifiTimer);
    }
    setConfig(config) {
      if (!config || config.type !== `custom:${CARD_TYPE}`)
        throw new Error(
          message(this._ui.t.typeError, { type: `custom:${CARD_TYPE}` }),
        );
      this._config = { ...config };
      this._localSections = null;
      this._historyKey = "";
      this._chartTime = null;
      this._queueRender();
    }
    set hass(value) {
      if (value?.connected === false) this._wifiManifest = null;
      if (
        this._hass?.connection !== value?.connection ||
        this._hass?.user?.id !== value?.user?.id
      ) {
        this._clientActionFeedback = new Map();
        this._wifiSwitchFeedback = new Map();
        this._clientRenameDialog?.element.close();
        this._wifiDialog?.element.close();
      }
      if (this._ui !== hassUi(value)) this._clientRenameDialog?.element.close();
      this._hass = value;
      this._ensureRegistry();
      this._queueRender();
    }
    get _ui() {
      return hassUi(this._hass);
    }
    getCardSize() {
      return this._isCompact() ? 5 : 10;
    }
    getGridOptions() {
      return {
        columns: "full",
        min_columns: 4,
        rows: "auto",
        min_rows: 4,
      };
    }
    _layout() {
      const view = this._config.view;
      if (view === "compact" || view === "expanded") return view;
      if (this._cardWidth >= WIDE_WIDTH) return "wide";
      if (this._cardWidth > 0 && this._cardWidth < COMPACT_WIDTH)
        return "compact";
      return "expanded";
    }
    _isCompact() {
      return this._layout() === "compact";
    }
    _queueRender() {
      if (this._renderQueued) return;
      this._renderQueued = true;
      Promise.resolve().then(() => {
        this._renderQueued = false;
        this._render();
      });
    }
    async _ensureRegistry() {
      const conn = this._hass?.connection;
      if (
        !conn?.sendMessagePromise ||
        this._registryLoading ||
        this._registryConnection === conn
      )
        return;
      this._registryLoading = true;
      this._registryConnection = conn;
      try {
        const entities = await conn.sendMessagePromise({
          type: "config/entity_registry/list",
        });
        if (this._registryConnection !== conn) return;
        this._registry = (Array.isArray(entities) ? entities : []).filter(
          (e) => e.platform === "tplink_deco",
        );
        this._regError = false;
      } catch (e) {
        if (this._registryConnection !== conn) return;
        this._registry = null;
        this._regError = true;
      } finally {
        this._registryLoading = false;
        this._queueRender();
      }
    }
    _allowedEntries() {
      const all = this._registry || [];
      const grouped = new Map();
      for (const e of all) {
        const id = e.config_entry_id || "onbekend";
        grouped.set(id, (grouped.get(id) || 0) + 1);
      }
      const ids = [...grouped.keys()].sort();
      const selected = this._config.entry_id || ids[0] || null;
      return {
        ids,
        selected,
        multiple: ids.length > 1 && !this._config.entry_id,
      };
    }
    _data() {
      const { t, locale } = this._ui;
      const hass = this._hass,
        cfg = this._config,
        entries = this._allowedEntries();
      const allStates = hass?.states || {};
      const regs = (this._registry || []).filter(
        (e) =>
          !entries.selected ||
          e.config_entry_id === entries.selected ||
          (!e.config_entry_id && entries.selected === "onbekend"),
      );
      const registryById = new Map(regs.map((e) => [e.entity_id, e]));
      const registryAvailable = this._registry !== null;
      const stateEntries = Object.entries(allStates).filter(
        ([id, s]) =>
          id.startsWith("device_tracker.") &&
          s?.attributes?.device_type &&
          ["deco", "client"].includes(s.attributes.device_type) &&
          (!registryAvailable || registryById.has(id)),
      );
      // Prefer the integration registry. Fallback only if it cannot be read.
      const regFor = (entityId) => registryById.get(entityId);
      const sensorEntity = (suffix, deviceId = null, uniquePrefix = null) => {
        const match = regs.find(
          (e) =>
            e.entity_id?.startsWith("sensor.") &&
            normalize(e.unique_id).endsWith(`_${suffix}`) &&
            (deviceId == null || e.device_id === deviceId) &&
            (uniquePrefix == null ||
              normalize(e.unique_id).startsWith(uniquePrefix)),
        );
        return match?.entity_id || null;
      };
      const binEntity = (suffix, deviceId = null) =>
        regs.find(
          (e) =>
            e.entity_id?.startsWith("binary_sensor.") &&
            normalize(e.unique_id).endsWith(`_${suffix}`) &&
            (deviceId == null || e.device_id === deviceId),
        )?.entity_id || null;
      const switchEntity = (suffix) =>
        regs.find(
          (e) =>
            e.entity_id?.startsWith("switch.") &&
            normalize(e.unique_id).endsWith(suffix),
        )?.entity_id || null;
      const manual = cfg.entities || {};
      const nodes = stateEntries
        .filter(([, s]) => s.attributes.device_type === "deco")
        .map(([id, s]) => {
          const e = regFor(id),
            a = s.attributes,
            mac = macOf(e, s),
            deviceId = e?.device_id || null;
          const get = (suffix) =>
            reading(
              hass,
              sensorEntity(suffix, deviceId, deviceId ? null : mac),
            );
          const parentMac = normalize(a.deco_mac),
            parentName = String(a.deco_device || "");
          const label =
            (cfg.node_labels || {})[id] ||
            (cfg.node_labels || {})[mac] ||
            prettyName(
              a.friendly_name ||
                id.replace("device_tracker.", "").replace(/_/g, " "),
            );
          const internetEntity = binEntity("internet_online", deviceId);
          const onlineEntity = binEntity("online", deviceId);
          const internetState = stateVal(hass, internetEntity),
            onlineState = stateVal(hass, onlineEntity);
          const connection = modeLabel(a.connection_type, t);
          return {
            id,
            name: label,
            reportedName: a.friendly_name,
            mac,
            master: boolAttr(a.master),
            parentMac,
            parentName,
            deviceId,
            online:
              onlineState && valid(onlineState.state)
                ? isOnline(onlineState.state)
                : isOnline(s.state),
            internet:
              internetState && valid(internetState.state)
                ? isOnline(internetState.state)
                : typeof a.internet_online === "boolean"
                  ? a.internet_online
                  : valid(a.internet_online)
                    ? boolAttr(a.internet_online)
                    : null,
            connection,
            clients: get("client_count"),
            cpu: get("cpu_usage"),
            memory: get("mem_usage"),
            backhaulSpeed: get("backhaul_speed"),
            backhaulMax: get("backhaul_max_speed"),
            ip: a.ip_address || null,
            model: a.device_model || null,
            signal24: num(a.signal_band2_4),
            signal5: num(a.signal_band5),
            down: get("down"),
            up: get("up"),
            tracker: s,
          };
        })
        .sort(
          (a, b) =>
            Number(b.master) - Number(a.master) ||
            a.name.localeCompare(b.name, locale),
        );
      const master = nodes.find((x) => x.master) || nodes[0] || null;
      const clients = stateEntries
        .filter(([, s]) => s.attributes.device_type === "client")
        .map(([id, s]) => {
          const a = s.attributes;
          const registry = regFor(id);
          return {
            id,
            registry,
            reportedMac: a.mac,
            name: a.ui_device_name || a.friendly_name || id,
            online: isOnline(s.state),
            mac: normalize(a.deco_mac),
            decoName: String(a.deco_device || ""),
            type: modeLabel(a.connection_type, t),
            down: num(a.down_kilobytes_per_s),
            up: num(a.up_kilobytes_per_s),
          };
        });
      for (const n of nodes) {
        const associated = clients.filter(
          (c) =>
            c.online &&
            ((n.mac && c.mac === n.mac) ||
              (!c.mac &&
                c.decoName &&
                normalize(c.decoName) === normalize(n.name))),
        );
        n.associated = associated;
        n.clientsCount =
          n.clients ?? (clients.length ? associated.length : null);
      }
      const sourceDown = manual.down || sensorEntity("total_down");
      const sourceUp = manual.up || sensorEntity("total_up");
      const trafficRate = (source, key) =>
        reading(hass, source) ??
        clients.reduce((total, client) => {
          if (!client.online || client[key] == null) return total;
          return (total ?? 0) + client[key];
        }, null);
      const down = trafficRate(sourceDown, "down");
      const up = trafficRate(sourceUp, "up");
      const clientCount = clients.length
        ? clients.filter((c) => c.online).length
        : nodes.length && nodes.every((n) => n.clients != null)
          ? nodes.reduce((sum, n) => sum + n.clients, 0)
          : null;
      const wifiMesh = this._wifiMesh(regs, entries, nodes);
      const canSwitch =
        this._wifiControlsSupported() &&
        hass?.user?.is_admin === true &&
        !!hass.services?.switch?.turn_on &&
        !!hass.services?.switch?.turn_off &&
        typeof hass.callService === "function";
      const wifi = {};
      for (const band of ["main", "guest", "iot"]) {
        const auto = binEntity(`wifi_${band}`);
        const entity = manual[`wifi_${band}`] || auto;
        const state = stateVal(hass, entity);
        const networkSwitch =
          band !== "main"
            ? wifiMesh?.entityId("switch", `_wifi_${band}_switch`, wifiMesh.mac)
            : null;
        const switchState = stateVal(hass, networkSwitch)?.state;
        const switchAvailable = switchState === "on" || switchState === "off";
        wifi[band] = {
          id: entity,
          switchId: networkSwitch,
          on: switchAvailable
            ? switchState === "on"
            : state && valid(state.state)
              ? isOnline(state.state)
              : null,
          control: canSwitch && switchAvailable ? networkSwitch : null,
          ssid: state?.attributes?.ssid || null,
        };
      }
      const first = (suffix) =>
        sensorEntity(suffix, master?.deviceId) || sensorEntity(suffix);
      const status = (suffix, override) =>
        stateVal(hass, override || first(suffix));
      const lastErrors = manual.last_error
        ? [stateVal(hass, manual.last_error)?.state]
        : [
            status("client_last_error")?.state,
            status("deco_last_error")?.state,
          ];
      const lastError =
        lastErrors.find((value) => valid(value) && String(value) !== "0") ??
        (lastErrors.some((value) => String(value) === "0") ? "0" : null);
      const pollingID =
        manual.polling ||
        switchEntity("_polling") ||
        regs.find(
          (e) =>
            e.entity_id?.startsWith("switch.") &&
            normalize(e.entity_id).includes("polling"),
        )?.entity_id;
      const pollingState = stateVal(hass, pollingID);
      return {
        entries,
        nodes,
        master,
        clients,
        wifi,
        wifiMonitor: this._wifiMonitorData(wifiMesh),
        down,
        up,
        clientCount,
        internet: master?.internet ?? null,
        polling:
          pollingState && valid(pollingState.state)
            ? isOnline(pollingState.state)
            : null,
        pollingId: pollingID,
        decoUpdate:
          status("deco_last_successful_update", manual.deco_update)?.state ||
          null,
        clientUpdate:
          status("client_last_successful_update", manual.client_update)
            ?.state || null,
        response: reading(
          hass,
          manual.response_time || first("deco_response_time"),
        ),
        clientResponse: reading(
          hass,
          manual.client_response_time || first("client_response_time"),
        ),
        queryMode:
          status("client_query_mode", manual.query_mode)?.state || null,
        timeouts: reading(
          hass,
          manual.timeouts || first("client_timeout_count"),
        ),
        lastError,
        sourceDown,
        sourceUp,
        registryAvailable,
      };
    }
    _historyPeriod() {
      return Math.min(
        168,
        Math.max(1, Number(this._config.history_hours) || 1),
      );
    }
    async _ensureHistory(d) {
      const connection = this._hass?.connection;
      const ids = [...new Set([d.sourceDown, d.sourceUp].filter(Boolean))];
      if (this._isCompact() && this._config.compact_chart === false) return;
      if (
        !ids.length ||
        !this._sections().includes("traffic") ||
        !connection?.sendMessagePromise
      ) {
        this._historyKey = "";
        this._history = { down: [], up: [] };
        return;
      }
      const hours = this._historyPeriod();
      const key = JSON.stringify([d.sourceDown, d.sourceUp, hours]);
      const sameQuery =
        this._historyConnection === connection && this._historyKey === key;
      if (
        this._historyLoading ||
        (sameQuery && Date.now() - this._historyAt < 120000)
      )
        return;

      this._historyConnection = connection;
      this._historyKey = key;
      this._historyAt = Date.now();
      this._historyLoading = true;
      if (!sameQuery) this._history = { down: [], up: [] };
      const end = this._historyAt;
      const start = end - hours * 3600000;
      const parse = (rows) =>
        (Array.isArray(rows) ? rows : [])
          .flatMap((row) => {
            const raw =
              row?.lu ?? row?.lc ?? row?.last_updated ?? row?.last_changed;
            const t =
              typeof raw === "number"
                ? raw < 1e11
                  ? raw * 1000
                  : raw
                : Date.parse(raw);
            const v = num(row?.s ?? row?.state);
            return Number.isFinite(t) && v != null ? [{ t, v }] : [];
          })
          .sort((a, b) => a.t - b.t);
      try {
        const result = await connection.sendMessagePromise({
          type: "history/history_during_period",
          start_time: new Date(start).toISOString(),
          end_time: new Date(end).toISOString(),
          entity_ids: ids,
          minimal_response: true,
          no_attributes: true,
        });
        if (key === this._historyKey && connection === this._hass?.connection) {
          this._history = {
            down: parse(result?.[d.sourceDown]),
            up: parse(result?.[d.sourceUp]),
            start,
            end,
          };
        }
      } catch {
        if (key === this._historyKey && connection === this._hass?.connection) {
          this._history = { down: [], up: [] };
        }
      } finally {
        this._historyLoading = false;
        this._queueRender();
      }
    }
    _pointAtChart(event) {
      const plot = event.target.closest(".chart-plot");
      if (!plot) return false;
      const bounds = plot.getBoundingClientRect();
      const { start, end } = this._history;
      if (bounds.width > 0) {
        const fraction = Math.max(
          0,
          Math.min(1, (event.clientX - bounds.left) / bounds.width),
        );
        this._chartTime = start + fraction * (end - start);
        this._updateChartReadout(plot);
      }
      return true;
    }
    _chartKeydown(event) {
      const plot = event.target.closest(".chart-plot");
      if (!plot || !["ArrowLeft", "ArrowRight", "Escape"].includes(event.key))
        return;
      event.preventDefault();
      if (event.key === "Escape") this._chartTime = null;
      else {
        const { start, end } = this._history;
        const step = (end - start) / 20;
        const time = this._chartTime ?? (start + end) / 2;
        this._chartTime = Math.max(
          start,
          Math.min(end, time + (event.key === "ArrowRight" ? step : -step)),
        );
      }
      this._updateChartReadout(plot);
    }
    _updateChartReadout(plot) {
      const { t, chartNumber, measureTime } = this._ui;
      const cursor = plot.querySelector(".chart-cursor");
      const readout = plot.closest(".chart").querySelector(".chart-readout");
      const { down, up, start, end } = this._history;
      const time = this._chartTime;
      const download = time == null ? undefined : nearestSample(down, time);
      const upload = time == null ? undefined : nearestSample(up, time);
      const closest =
        !upload ||
        (download && Math.abs(download.t - time) <= Math.abs(upload.t - time))
          ? download
          : upload;
      cursor.hidden = !closest;
      if (closest)
        cursor.style.left = `${Math.max(0, Math.min(1, (closest.t - start) / (end - start))) * 100}%`;
      for (const [series, label, sample] of [
        ["down", t.download, download],
        ["up", t.upload, upload],
      ]) {
        readout.querySelector(`[data-series="${series}"]`).textContent = sample
          ? `${label} ${chartNumber.format(sample.v)} ${t.trafficUnit} · ${measureTime.format(sample.t)}`
          : closest
            ? `${label} —`
            : "";
      }
    }
    _sections() {
      return this._localSections || this._config.sections || DEFAULT_SECTIONS;
    }
    _clientActionTargets(data) {
      const entry = data.entries.selected;
      const canBlock =
        this._config.client_controls === true &&
        canCallClientAction(this._hass, CLIENT_BLOCK_ACTION);
      const canRename =
        this._config.client_rename === true &&
        canCallClientAction(this._hass, CLIENT_RENAME_ACTION);
      if (
        (!canBlock && !canRename) ||
        !this._sections().includes("clients") ||
        this._registryLoading ||
        this._registryConnection !== this._hass.connection ||
        !entry ||
        entry === "onbekend" ||
        data.entries.multiple ||
        !data.nodes.length
      )
        return [];

      return data.clients.flatMap((client) => {
        const registry = client.registry;
        if (
          registry?.platform !== DECO_DOMAIN ||
          registry.config_entry_id !== entry ||
          (!canBlock && client.online !== true)
        )
          return [];
        // v4.0.0 uses the client MAC as the tracker unique ID, including for linked devices.
        const mac = normalizeClientMac(registry.unique_id);
        if (
          !mac ||
          (client.reportedMac != null &&
            normalizeClientMac(client.reportedMac) !== mac)
        )
          return [];
        return [
          {
            id: client.id,
            name: client.name,
            entry,
            mac,
            key: JSON.stringify([entry, mac]),
            canBlock,
            canRename: canRename && client.online === true,
          },
        ];
      });
    }
    _findClientActionTarget(identity, permission, targets) {
      return targets.find(
        (client) =>
          client[permission] &&
          client.id === identity.id &&
          client.entry === identity.entry &&
          client.mac === identity.mac,
      );
    }
    async _setClientBlocked(button, blocked) {
      const target = this._findClientActionTarget(
        button.dataset,
        "canBlock",
        this._clientActionTargets(this._data()),
      );
      const { t } = this._ui;
      const feedback = this._clientActionFeedback;
      if (!target || feedback.get(target.key)?.pending) return;
      if (
        blocked &&
        !window.confirm(message(t.confirmBlock, { name: target.name }))
      )
        return;

      feedback.set(target.key, { pending: true, message: "running" });
      this._queueRender();
      try {
        const result = await this._hass.callService(
          DECO_DOMAIN,
          CLIENT_BLOCK_ACTION,
          { config_entry_id: target.entry, mac: target.mac, blocked },
          undefined,
          false,
          true,
        );
        if (result?.response?.blocked !== blocked) {
          feedback.set(target.key, {
            message: "blockFailed",
            reasonKey: "blockUnverified",
            error: true,
          });
          return;
        }
        const message = blocked ? "blocked" : "unblocked";
        feedback.set(target.key, { message });
      } catch (error) {
        const reason = error?.message || error?.error?.message;
        feedback.set(target.key, {
          message: "blockFailed",
          reason: typeof reason === "string" && reason ? reason : null,
          reasonKey: "blockUnknown",
          error: true,
        });
      } finally {
        this._queueRender();
      }
    }
    _openClientRename(button) {
      const { t, language } = this._ui;
      const target = this._findClientActionTarget(
        button.dataset,
        "canRename",
        this._clientActionTargets(this._data()),
      );
      if (!target || this._clientRenameDialog) return;

      const element = document.createElement("dialog");
      element.className = "client-rename-dialog";
      element.lang = language;
      element.setAttribute("aria-labelledby", "client-rename-title");
      element.innerHTML = `<form novalidate>
        <h3 id="client-rename-title">${t.renameTitle}</h3>
        <p>${esc(message(t.renamePrompt, { name: target.name }))}</p>
        <label>${t.newName} <input name="name" type="text" aria-describedby="client-rename-limit" autofocus required></label>
        <small id="client-rename-limit">${message(t.nameLimit, { count: CLIENT_NAME_MAX_BYTES })}</small>
        <p class="client-rename-error" role="alert"></p>
        <p class="client-rename-status" role="status"></p>
        <div class="client-control-actions">
          <button type="button" class="tiny-btn">${t.cancel}</button>
          <button type="submit" class="tiny-btn">${t.confirmRename}</button>
        </div>
      </form>`;
      const form = element.querySelector("form");
      const input = form.elements.name;
      input.value = target.name;
      const dialog = {
        element,
        target,
        input,
        submitted: false,
        cancel: form.querySelector('[type="button"]'),
        confirm: form.querySelector('[type="submit"]'),
        error: form.querySelector('[role="alert"]'),
        status: form.querySelector('[role="status"]'),
      };
      this._clientRenameDialog = dialog;
      dialog.cancel.addEventListener("click", () => element.close());
      element.addEventListener("cancel", (event) => {
        if (dialog.cancel.disabled) event.preventDefault();
      });
      element.addEventListener("close", () => {
        element.remove();
        if (this._clientRenameDialog !== dialog) return;
        this._clientRenameDialog = null;
        [...this.shadowRoot.querySelectorAll('[data-action="rename-client"]')]
          .find(
            (item) =>
              item.dataset.id === target.id &&
              item.dataset.entry === target.entry &&
              item.dataset.mac === target.mac,
          )
          ?.focus({ preventScroll: true });
      });
      input.addEventListener("input", () => {
        dialog.error.textContent = "";
        input.removeAttribute("aria-invalid");
      });
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        this._renameClient(dialog);
      });
      this.shadowRoot.append(element);
      element.showModal();
      input.select();
    }
    async _renameClient(dialog) {
      const { t } = this._ui;
      if (dialog.confirm.disabled || !dialog.element.open) return;
      const target = this._findClientActionTarget(
        dialog.target,
        "canRename",
        this._clientActionTargets(this._data()),
      );
      if (!target) {
        dialog.element.close();
        return;
      }

      const name = dialog.input.value.trim();
      if (
        !name ||
        /[\p{C}\p{Z}]/u.test(name.replaceAll(" ", "")) ||
        new TextEncoder().encode(name).length > CLIENT_NAME_MAX_BYTES
      ) {
        dialog.error.textContent = t.invalidName;
        dialog.input.setAttribute("aria-invalid", "true");
        dialog.input.focus();
        return;
      }

      dialog.error.textContent = "";
      dialog.status.textContent = t.renaming;
      dialog.submitted = true;
      dialog.input.disabled = true;
      dialog.confirm.disabled = true;
      dialog.cancel.disabled = true;
      try {
        const result = await this._hass.callService(
          DECO_DOMAIN,
          CLIENT_RENAME_ACTION,
          { config_entry_id: target.entry, mac: target.mac, name },
          undefined,
          false,
          true,
        );
        if (result?.response?.name !== name)
          throw new Error(t.renameUnverified);
        if (!dialog.element.open) return;
        dialog.status.textContent = t.renamed;
        dialog.cancel.textContent = t.close;
        dialog.cancel.disabled = false;
        dialog.cancel.focus();
      } catch (error) {
        if (!dialog.element.open) return;
        const reason = error?.message || error?.error?.message;
        dialog.status.textContent = "";
        dialog.error.textContent =
          typeof reason === "string" && reason
            ? `${t.renameFailed} ${reason}`
            : `${t.renameFailed} ${t.renameUnverified}`;
        dialog.input.disabled = false;
        dialog.confirm.disabled = false;
        dialog.cancel.disabled = false;
        dialog.input.focus();
      }
    }
    _onClick(e) {
      if (this._pointAtChart(e)) return;
      const b = e.target.closest("[data-action]");
      if (!b) return;
      const a = b.dataset.action;
      if (a === "node") {
        if (this._selectedNode !== b.dataset.id) this._showAllClients = false;
        this._selectedNode = b.dataset.id;
        this._queueRender();
        if (b.classList.contains("node-table-row"))
          Promise.resolve().then(() =>
            this._content.querySelector(".detail-panel")?.focus(),
          );
      } else if (a === "clear-node") {
        this._selectedNode = null;
        this._showAllClients = false;
        this._queueRender();
      } else if (a === "block-client" || a === "unblock-client") {
        this._setClientBlocked(b, a === "block-client");
      } else if (a === "rename-client") {
        this._openClientRename(b);
      } else if (a === "wifi-monitor") {
        this._openWifiMonitor();
      } else if (a === "wifi-switch") {
        this._setWifiNetwork(b);
      } else if (a === "toggle-clients") {
        this._showAllClients = !this._showAllClients;
        this._queueRender();
      } else if (a === "toggle-expand") {
        this._expanded = !this._expanded;
        this._queueRender();
      } else if (a === "toggle-section") {
        const section = b.dataset.section,
          set = new Set(this._sections());
        set.has(section) ? set.delete(section) : set.add(section);
        this._localSections = [...set];
        this._queueRender();
      } else if (a === "all-sections") {
        this._localSections = DEFAULT_SECTIONS.slice();
        this._queueRender();
      } else if (a === "retry") {
        this._registryConnection = null;
        this._ensureRegistry();
        this._queueRender();
      } else if (a === "hours") {
        this._config = {
          ...this._config,
          history_hours: Number(b.dataset.value),
        };
        this._historyKey = "";
        this._chartTime = null;
        this._queueRender();
      }
    }
    _statusPill(value, yes = this._ui.t.online, no = this._ui.t.offline) {
      const { t } = this._ui;
      return `<span class="status ${value === true ? "ok" : value === false ? "bad" : "unknown"}"><i></i>${esc(value === true ? yes : value === false ? no : t.unknown)}</span>`;
    }
    _metric(label, value, icon) {
      return `<div class="metric"><span class="metric-icon">${ico(icon, 22)}</span><div><small title="${esc(label)}">${esc(label)}</small><strong title="${esc(value)}">${esc(value)}</strong></div></div>`;
    }
    _topology(d, compact) {
      const { t, countLabel } = this._ui;
      const nodes = d.nodes,
        master = d.master;
      if (!nodes.length) return `<div class="empty-small">${t.noNodes}</div>`;
      const satellites = nodes.filter((n) => n !== master);
      const parents = new Map(
        satellites.map((n) => {
          const mac = normalizeClientMac(n.parentMac);
          const name = normalize(n.parentName);
          const matches = nodes.filter((p) =>
            n.parentMac
              ? mac && normalizeClientMac(p.mac) === mac
              : name && normalize(p.reportedName) === name,
          );
          return [
            n,
            matches.length === 1 && matches[0] !== n ? matches[0] : null,
          ];
        }),
      );
      const internet = `${ico("earth", 15)} Internet ${this._statusPill(d.internet)}`;
      const nodeButton = (n, root, position = "") => {
        const current = n.id === this._selectedNode;
        const type = root ? t.mainDeco : n.connection;
        const id = esc(n.id);
        return `<button type="button" data-action="node" data-id="${id}" aria-label="${esc(message(t.nodeDetails, { name: n.name }))}" aria-describedby="link-${id} status-${id}" aria-expanded="${current}" class="node ${root ? "root" : ""} ${current ? "selected" : ""} ${n.online === false ? "offline" : ""}" ${position}><span class="cylinder" aria-hidden="true"></span><span class="node-label"><b title="${esc(n.name)}">${esc(n.name)}</b><span id="link-${id}" class="node-type">${esc(type)}${!root && !parents.get(n) ? `<span class="node-link-unknown">${t.unknownNodeLink}</span>` : ""}</span></span><span id="status-${id}" class="node-info">${this._statusPill(n.online)}<small>${countLabel(n.clientsCount, t.client, t.clientCount)}</small></span></button>`;
      };
      const meta = `<div class="topology-meta">${ico("access-point-network", 17)} ${countLabel(nodes.length, t.unit, t.units)} · ${countLabel(satellites.length, t.satellite, t.satellites)}${!compact && satellites.length > 10 ? ` · ${esc(satellites.length - 10)} ${t.hiddenNodes}` : ""}</div>`;
      const desktopSlots = [
        [175, 138],
        [815, 126],
        [820, 290],
        [174, 300],
        [495, 42],
        [420, 313],
        [130, 47],
        [875, 45],
        [725, 35],
        [270, 38],
      ];
      const satelliteSlots = compact
        ? satellites.map((_, i) => [
            i % 2 === 0 ? (i === satellites.length - 1 ? 500 : 250) : 750,
            181 + Math.floor(i / 2) * 97,
          ])
        : desktopSlots.slice(0, satellites.length);
      const positions = [
        {
          n: master,
          x: compact ? 500 : 495,
          y: compact ? 79 : 207,
          root: true,
        },
        ...satelliteSlots.map(([x, y], i) => ({ n: satellites[i], x, y })),
      ];
      const w = 1000,
        h = compact ? positions.at(-1).y + 51 : 380;
      const lines = positions
        .filter((p) => !p.root)
        .map((p) => {
          const m = positions.find((q) => q.n === parents.get(p.n));
          if (!m) return "";
          if (compact && m.root)
            return `<path d="M${m.x} ${m.y} V${p.y - 52} H${p.x} V${p.y}" class="link-path"/>`;
          const midX = (m.x + p.x) / 2,
            midY = (m.y + p.y) / 2 - 20;
          return `<path d="M${m.x} ${m.y} Q${midX} ${midY} ${p.x} ${p.y}" class="link-path"/>`;
        })
        .join("");
      const cards = positions
        .map(({ n, x, y, root }) =>
          nodeButton(
            n,
            root,
            `style="left:${(x / w) * 100}%;top:${(y / h) * 100}%"`,
          ),
        )
        .join("");
      const canvas = compact
        ? `class="mesh-canvas mesh-canvas-compact" style="height:${h}px"`
        : 'class="mesh-canvas"';
      const internetLine = compact ? "M500 0 V79" : "M495 0 V157";
      return `<div class="topology">${meta}<div ${canvas}><div class="waves"></div><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${internetLine}" class="internet-path"/>${lines}</svg><div class="internet-node">${internet}</div>${cards}</div><div class="topology-note">${t.topologyNote}</div></div>`;
    }
    _nodeDetails(d) {
      const { t, field } = this._ui;
      const n = d.nodes.find((n) => n.id === this._selectedNode);
      if (!n) return "";
      const line = (l, v) =>
        `<div><small>${esc(l)}</small><b>${esc(v)}</b></div>`;
      const remaining = Math.max(0, n.associated.length - CLIENT_PREVIEW_LIMIT);
      const listed = this._showAllClients
        ? n.associated
        : n.associated.slice(0, CLIENT_PREVIEW_LIMIT);
      const clients = listed
        .map(
          (c) =>
            `<span class="client-chip">${ico("cellphone-link", 14)}${esc(c.name)}</span>`,
        )
        .join("");
      return `<section class="detail-panel" tabindex="-1" aria-labelledby="deco-detail-name"><div class="section-head"><h3 id="deco-detail-name">${ico("router-wireless", 17)} ${esc(n.name)}</h3><button type="button" class="tiny-btn" data-action="clear-node" aria-label="${t.detailsClose}">✕</button></div><div class="detail-grid">${line(t.status, n.online === true ? t.online : n.online === false ? t.offline : "—")}${line(t.backhaul, n.master ? t.mainDeco : n.connection)}${line("CPU", field(n.cpu, t.percent))}${line(t.memory, field(n.memory, t.percent))}${line(t.backhaulSpeed, field(n.backhaulSpeed, " Mbit/s"))}${line(t.backhaulMax, field(n.backhaulMax, " Mbit/s"))}${line(t.model, n.model || "—")}${line(t.connected, n.clientsCount == null ? "—" : n.clientsCount)}</div>${clients ? `<div class="client-chips">${clients}${remaining ? `<button type="button" class="tiny-btn" data-action="toggle-clients" aria-expanded="${this._showAllClients}">${this._showAllClients ? t.fewer : message(t.more, { count: remaining })}</button>` : ""}</div>` : ""}</section>`;
    }
    _nodesPanel(d) {
      const { t, field } = this._ui;
      return `<section class="panel"><div class="section-head"><h3>${ico("access-point-network", 19)} ${t.nodeStatus}</h3><small>${t.cpuPerNode}</small></div><div class="node-table"><div class="node-table-head"><span>Deco</span><span>${t.clients}</span><span>CPU</span><span>RAM</span><span>${t.backhaul}</span></div>${d.nodes.map((n) => `<button type="button" class="node-table-row" data-action="node" data-id="${esc(n.id)}"><span class="name-cell"><i class="dot ${n.online === true ? "on" : n.online === false ? "off" : ""}"></i>${esc(n.name)}</span><span>${n.clientsCount == null ? "—" : esc(n.clientsCount)}</span><span>${field(n.cpu, t.percent)}</span><span>${field(n.memory, t.percent)}</span><span>${esc(n.master ? t.main : n.connection)}</span></button>`).join("")}</div></section>`;
    }
    _clientControlsPanel(targets) {
      const { t, locale } = this._ui;
      if (!targets.length) return "";
      const rows = targets
        .sort((a, b) => String(a.name).localeCompare(String(b.name), locale))
        .map((client) => {
          const feedback = this._clientActionFeedback.get(client.key);
          const details = feedback?.reason || t[feedback?.reasonKey];
          const feedbackText = feedback
            ? [t[feedback.message], details].filter(Boolean).join(" ")
            : "";
          const actions = [];
          if (client.canBlock)
            actions.push(
              ["block-client", t.block],
              ["unblock-client", t.unblock],
            );
          if (client.canRename) actions.push(["rename-client", t.rename]);
          const buttons = actions
            .map(
              ([action, label]) =>
                `<button type="button" class="tiny-btn" data-action="${action}" data-id="${esc(client.id)}" data-entry="${esc(client.entry)}" data-mac="${esc(client.mac)}" aria-label="${label}: ${esc(client.name)}" ${feedback?.pending ? "disabled" : ""}>${label}</button>`,
            )
            .join("");
          return `<li class="client-control-row"><b>${esc(client.name)}</b><div class="client-control-actions">${buttons}</div><span class="client-control-feedback${feedback?.error ? " action-error" : ""}" role="${feedback?.error ? "alert" : "status"}">${esc(feedbackText)}</span></li>`;
        })
        .join("");
      return `<section class="panel client-controls"><div class="section-head"><h3>${ico("lock", 17)} ${t.controls}</h3></div><ul class="client-control-list">${rows}</ul></section>`;
    }
    _clientsPanel(d) {
      const { t, isSingular } = this._ui;
      const active = d.clients.filter((c) => c.online);
      const groups = [
        [t.band24, "wifi"],
        ["5 GHz", "wifi"],
        ["Ethernet", "lan"],
      ];
      const counts = new Map(groups.map(([label]) => [label, 0]));
      for (const client of active) {
        const label = counts.has(client.type) ? client.type : t.other;
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
      if (counts.has(t.other)) groups.push([t.other, "help-circle-outline"]);
      const bands = groups
        .map(
          ([label, icon]) =>
            `<div>${ico(icon, 16)} ${label} <strong>${d.clients.length ? counts.get(label) : "—"}</strong></div>`,
        )
        .join("");
      return `<section class="panel"><div class="section-head"><h3>${ico("devices", 19)} ${t.clientActivity}</h3></div><div class="clients-big">${d.clientCount == null ? "—" : esc(d.clientCount)} <span>${isSingular(d.clientCount) ? t.connectedSingle : t.connectedCount}</span></div><div class="bands">${bands}</div><small class="hint">${t.clientHint}</small></section>`;
    }
    _wifiControlsSupported() {
      return (
        this._hass?.connected !== false &&
        this._wifiManifest?.connection === this._hass?.connection &&
        this._wifiManifest?.supported === true
      );
    }
    async _ensureWifiManifest() {
      const connection = this._hass?.connection;
      if (
        !connection?.sendMessagePromise ||
        this._hass.connected === false ||
        this._wifiManifest?.connection === connection
      )
        return;
      const check = { connection, supported: false };
      this._wifiManifest = check;
      try {
        const manifest = await connection.sendMessagePromise({
          type: "manifest/get",
          integration: DECO_DOMAIN,
        });
        check.supported = supportsWifiControls(manifest);
      } catch {
        // Channel readings remain usable if Home Assistant cannot verify the version.
      } finally {
        if (this._wifiManifest === check) this._queueRender();
      }
    }
    async _setWifiNetwork(button) {
      const { band, entity } = button.dataset;
      if (band !== "guest" && band !== "iot") return;
      const network = this._data().wifi[band];
      const feedback = this._wifiSwitchFeedback;
      if (
        !network.control ||
        network.control !== entity ||
        String(network.on) !== button.getAttribute("aria-checked") ||
        feedback.get(entity)?.pending
      )
        return;

      feedback.set(entity, { pending: true });
      this._queueRender();
      try {
        await this._hass.callService(
          "switch",
          network.on ? "turn_off" : "turn_on",
          {},
          { entity_id: entity },
        );
        feedback.delete(entity);
      } catch (error) {
        const reason = error?.message || error?.error?.message;
        feedback.set(entity, {
          error: typeof reason === "string" ? reason : "",
        });
      } finally {
        this._queueRender();
      }
    }
    _wifiMesh(regs, entries, nodes) {
      const hass = this._hass;
      const entry = entries.selected;
      const masters = nodes.filter((node) => node.master);
      const master = masters[0];
      const mac = normalizeClientMac(master?.mac);
      if (
        !entry ||
        entries.multiple ||
        masters.length !== 1 ||
        !mac ||
        !master.deviceId ||
        this._registryLoading ||
        this._registryConnection !== hass?.connection
      )
        return null;

      const registry = regs.filter(
        (row) =>
          row.platform === DECO_DOMAIN &&
          row.config_entry_id === entry &&
          row.device_id === master.deviceId &&
          !row.disabled_by,
      );
      const entityId = (domain, key, deviceMac) => {
        const suffix = normalize(key);
        const matches = registry.filter((row) => {
          if (!row.entity_id?.startsWith(`${domain}.`)) return false;
          const id = normalize(row.unique_id);
          return deviceMac
            ? id.endsWith(suffix) &&
                normalizeClientMac(id.slice(0, -suffix.length)) === deviceMac
            : id === suffix;
        });
        return matches.length === 1 ? matches[0].entity_id : null;
      };
      return { entry, master, mac, entityId };
    }
    _wifiMonitorData(mesh) {
      if (!mesh) return null;
      const hass = this._hass;
      const { entry, master, mac, entityId } = mesh;
      const channels = Object.keys(WIFI_BANDS)
        .map((band) => ({
          band,
          channelId: entityId("sensor", `_wifi_channel_${band}`, mac),
          widthId: entityId("sensor", `_wifi_channel_width_${band}`, mac),
        }))
        .filter(({ channelId, widthId }) => channelId || widthId);
      const adviceId = entityId("sensor", `${entry}_wifi_optimization_advice`);
      const scan = entityId("button", `${entry}_wifi_scan`);
      const optimize = entityId("button", `${entry}_wifi_optimize`);
      if (!channels.length && !adviceId && !scan && !optimize) return null;
      const available = (id) => {
        const entity = stateVal(hass, id);
        // A freshly registered Home Assistant button can have state "unknown".
        return !!entity && entity.state !== "unavailable";
      };
      const canOpen = this._wifiControlsSupported();
      const canPress =
        canOpen &&
        !!hass.user?.id &&
        hass.user.is_admin === true &&
        hass.connected !== false &&
        !!hass.services?.button?.press &&
        typeof hass.callService === "function";
      return {
        key: JSON.stringify([entry, master.id, mac, hass.user?.id]),
        name: master.name,
        channels,
        bands: this._wifiReadings(channels),
        advice: stateVal(hass, adviceId),
        canOpen,
        scan: canPress && available(scan) ? scan : null,
        optimize: canPress && available(optimize) ? optimize : null,
      };
    }
    _wifiReadings(channels, reported = new Map()) {
      const state = (id) => {
        const live = stateVal(this._hass, id);
        const fetched = reported.get(id);
        if (!fetched) return live;
        return !live || wifiTimestamp(fetched) > wifiTimestamp(live)
          ? fetched
          : live;
      };
      return channels.map(({ band, channelId, widthId }) => {
        const channel = state(channelId);
        const width = state(widthId);
        return {
          band,
          channel: wifiSample(channel, channel?.state),
          width:
            wifiSample(width, width?.state) ||
            (valid(channel?.state)
              ? wifiSample(channel, channel.attributes?.channel_width_mhz)
              : null),
        };
      });
    }
    _wifiSession(wifi) {
      const connection = this._hass.connection;
      if (!wifiSessions.has(connection))
        wifiSessions.set(connection, new Map());
      const sessions = wifiSessions.get(connection);
      if (!sessions.has(wifi.key)) sessions.set(wifi.key, {});
      const session = sessions.get(wifi.key);
      if (session.arm && Date.now() >= session.arm.deadline) {
        session.arm = null;
        session.expired = true;
      }
      if (session.arm && wifi.advice?.state === "confirm_optimization")
        session.arm.observed = true;
      else if (session.arm?.observed) session.arm = null;
      if (session.optimization && wifi.advice?.state === "optimizing") {
        session.optimization.startedAt ??= wifiTimestamp(wifi.advice);
      }
      return session;
    }
    _openWifiMonitor() {
      const wifi = this._data().wifiMonitor;
      if (!wifi?.canOpen || this._wifiDialog) return;
      const element = document.createElement("dialog");
      element.className = "wifi-lab";
      element.setAttribute("aria-labelledby", "wifi-lab-title");
      const { t } = this._ui;
      element.innerHTML = `<header class="wifi-lab-head">
        <span class="wifi-lab-icon">${ico("wifi", 25)}</span>
        <div><small>${t.wifiLab}</small><h2 id="wifi-lab-title"></h2><p></p></div>
        <button type="button" class="tiny-btn wifi-lab-close" data-wifi="close" autofocus aria-label="${t.close}">✕</button>
      </header><div class="wifi-lab-body"></div><div class="wifi-announcement" role="status"></div>`;
      const dialog = { element, key: wifi.key };
      this._wifiDialog = dialog;
      this.shadowRoot.append(element);
      element.addEventListener("click", (event) => {
        const action = event.target.closest("[data-wifi]")?.dataset.wifi;
        if (action === "close") element.close();
        else if (action) this._pressWifi(action, dialog.key);
      });
      element.addEventListener("close", () => {
        element.remove();
        if (this._wifiDialog !== dialog) return;
        this._wifiDialog = null;
        const button = this.shadowRoot.querySelector(
          '[data-action="wifi-monitor"]',
        );
        button?.focus({ preventScroll: true });
      });
      this._renderWifiMonitor(wifi);
      element.showModal();
    }
    async _pressWifi(action, key) {
      const wifi = this._data().wifiMonitor;
      if (!wifi || wifi.key !== key) return;
      const session = this._wifiSession(wifi);
      if (session.pending) return;
      const state = wifi.advice?.state;
      const scan =
        action === "scan" &&
        wifi.scan &&
        state !== "unavailable" &&
        !WIFI_BUSY.has(state) &&
        !session.arm;
      const arm =
        action === "optimize" &&
        wifi.optimize &&
        state === "optimizable" &&
        !session.arm;
      const confirm =
        action === "confirm" &&
        wifi.optimize &&
        state === "confirm_optimization" &&
        session.arm?.observed;
      if (!scan && !arm && !confirm) return;

      if (scan) {
        session.baseline = wifi.bands;
        session.optimization = null;
      } else if (arm) {
        session.baseline ??= wifi.bands;
        session.arm = {
          deadline: Date.now() + WIFI_CONFIRM_MS,
          observed: false,
          owner: this._wifiOwner,
        };
        clearTimeout(this._wifiTimer);
        this._wifiTimer = setTimeout(
          () => this._queueRender(),
          WIFI_CONFIRM_MS,
        );
      } else {
        if (session.arm.owner !== this._wifiOwner) return;
        session.arm = null;
        session.optimization = {
          beforePress: wifi.bands,
          clickedAt: Date.now(),
          advice: wifi.advice,
          success: false,
        };
      }
      session.error = null;
      session.expired = false;
      session.previousAdvice = wifi.advice;
      session.pending = true;
      this._queueRender();
      const hass = this._hass;
      try {
        await hass.callService(
          "button",
          "press",
          {},
          { entity_id: scan ? wifi.scan : wifi.optimize },
          false,
        );
        if (confirm) {
          session.optimization.success = true;
          // Read the known sensor states once so unchanged values can include last_reported.
          if (
            typeof hass.callApi === "function" &&
            this._hass?.connection === hass.connection &&
            this._hass?.user?.id === hass.user.id
          ) {
            const ids = new Set(
              wifi.channels
                .flatMap(({ channelId, widthId }) => [channelId, widthId])
                .filter(Boolean),
            );
            const states = await Promise.allSettled(
              [...ids].map(async (id) => [
                id,
                await hass.callApi("GET", `states/${encodeURIComponent(id)}`),
              ]),
            );
            session.optimization.reported = new Map(
              states.flatMap((item) =>
                item.status === "fulfilled" ? [item.value] : [],
              ),
            );
          }
        }
      } catch (error) {
        if (arm) session.arm = null;
        if (confirm) session.optimization = null;
        session.error = error?.message || error?.error?.message || true;
      } finally {
        session.pending = null;
        this._queueRender();
      }
    }
    _wifiAdviceFeedback(advice, session) {
      const { t } = this._ui;
      const state = advice?.state;
      const notes = {
        scan_observed: t.wifiObserved,
        scan_not_observed: t.wifiNotObserved,
        advice_changed: t.wifiAdviceChanged,
        advice_cleared: t.wifiOptimized,
        not_started: t.wifiOutcomeError,
        rejected: t.wifiOutcomeError,
        unconfirmed: t.wifiOutcomeError,
        request_failed: t.wifiOutcomeError,
      };
      const titles = {
        scanning: t.wifiScanning,
        optimizing: t.wifiOptimizing,
        confirm_optimization: t.wifiAwaiting,
        optimal: t.wifiOptimal,
        optimizable: t.wifiRecommended,
        unavailable: t.wifiUnavailable,
      };
      const attrs = advice?.attributes;
      const freshAdvice =
        !WIFI_BUSY.has(state) &&
        state !== "unavailable" &&
        session.previousAdvice !== advice;
      const scanWithoutResult =
        freshAdvice && attrs?.outcome === "scan_not_observed";
      const title = Object.hasOwn(titles, state)
        ? titles[state]
        : t.wifiUnknown;
      const label =
        scanWithoutResult && (state === "optimal" || state === "optimizable")
          ? `${t.wifiLastAdvice} · ${state === "optimal" ? t.wifiNoOptimization : title}`
          : title;
      const acknowledged = freshAdvice && attrs?.acknowledged === true;
      return {
        label,
        scanWithoutResult,
        outcome:
          freshAdvice && Object.hasOwn(notes, attrs?.outcome)
            ? scanWithoutResult && acknowledged
              ? `${t.wifiScanAck} ${t.wifiNotObserved}`
              : notes[attrs.outcome]
            : "",
        acknowledged: acknowledged && !scanWithoutResult ? t.wifiAck : "",
        request:
          session.pending && !WIFI_BUSY.has(state) && !freshAdvice
            ? t.wifiRequest
            : "",
      };
    }
    _renderWifiMonitor(wifi) {
      const dialog = this._wifiDialog;
      if (!dialog) return;
      if (!wifi?.canOpen || wifi.key !== dialog.key) {
        dialog.element.close();
        return;
      }
      const { t, language } = this._ui;
      const session = this._wifiSession(wifi);
      const state = wifi.advice?.state;
      const scanning = state === "scanning";
      const optimizing = state === "optimizing";
      const animate = scanning || optimizing;
      const attrs = wifi.advice?.attributes;
      const { label, outcome, request, acknowledged } =
        this._wifiAdviceFeedback(wifi.advice, session);
      const canConfirm =
        state === "confirm_optimization" &&
        session.arm?.observed &&
        session.arm.owner === this._wifiOwner &&
        wifi.optimize;
      const confirmHint =
        state === "confirm_optimization"
          ? canConfirm
            ? t.wifiArmHint
            : session.expired
              ? t.wifiExpired
              : t.wifiOtherArm
          : "";
      const opt = session.optimization;
      const compares =
        opt?.success &&
        state === "optimal" &&
        wifi.advice !== opt.advice &&
        attrs?.outcome === "advice_cleared";
      const bands = compares
        ? this._wifiReadings(wifi.channels, opt.reported)
        : wifi.bands;
      const visible = bands.filter(
        ({ channel, width, band }) =>
          channel ||
          width ||
          (compares &&
            session.baseline?.some(
              (row) => row.band === band && (row.channel || row.width),
            )),
      );
      const bandMarkup = visible
        .map((row) => this._wifiBandMarkup(row, session, compares, animate))
        .join("");
      const error = session.error
        ? `<p class="wifi-error" role="alert">${t.wifiActionError} ${typeof session.error === "string" ? esc(session.error) : ""}</p>`
        : "";
      const scan =
        wifi.scan &&
        state !== "unavailable" &&
        !WIFI_BUSY.has(state) &&
        !session.arm;
      const optimize = wifi.optimize && state === "optimizable" && !session.arm;
      const disabled = session.pending ? "disabled" : "";
      const markup = `<div class="wifi-lab-grid"><section class="wifi-lab-section">
        <h3>${compares ? t.wifiComparison : t.wifiPanelTitle}</h3>
        ${bandMarkup || `<p>${t.wifiNoBands}</p>${animate ? '<div class="wifi-ruler wifi-scan-placeholder" aria-hidden="true"><i class="wifi-sweep"></i></div>' : ""}`}
        ${bandMarkup ? `<p class="wifi-schematic">${t.wifiSchematic}</p>` : ""}
      </section><section class="wifi-lab-section wifi-advice"><h3>${t.wifiAdvice}</h3>
        <div class="wifi-advice-ring" data-state="${esc(state)}" aria-hidden="true">${ico(optimizing ? "wifi-cog" : scanning ? "wifi-sync" : "wifi", 27)}</div>
        <div><strong>${label}</strong>
        ${request ? `<p>${request}</p>` : ""}
        ${outcome ? `<p>${outcome}</p>` : ""}
        ${acknowledged ? `<p>${acknowledged}</p>` : ""}
        ${confirmHint ? `<p class="wifi-warning">${confirmHint}</p>` : ""}</div>
        ${error}
      </section></div>
      ${
        scan || optimize || canConfirm
          ? `<footer class="wifi-lab-actions">
        ${scan ? `<button type="button" class="tiny-btn" data-wifi="scan" ${disabled}>${t.wifiScan}</button>` : ""}
        ${optimize ? `<button type="button" class="tiny-btn wifi-primary" data-wifi="optimize" ${disabled}>${t.wifiOptimize}</button>` : ""}
        ${canConfirm ? `<button type="button" class="tiny-btn wifi-primary" data-wifi="confirm" ${disabled}>${t.wifiConfirm}</button>` : ""}
      </footer>`
          : ""
      }`;
      const element = dialog.element;
      element.lang = language;
      element.dataset.operation = animate ? state : "";
      element.querySelector("header small").textContent = t.wifiLab;
      element.querySelector("header h2").textContent = t.wifiMonitor;
      element.querySelector("header p").textContent = wifi.name;
      const close = element.querySelector(".wifi-lab-close");
      close.setAttribute("aria-label", t.close);
      const announcement = element.querySelector(".wifi-announcement");
      const spoken = [label, request, outcome, acknowledged, confirmHint]
        .filter(Boolean)
        .join(" ");
      if (announcement.textContent !== spoken)
        announcement.textContent = spoken;
      if (dialog.markup !== markup) {
        dialog.markup = markup;
        const focused = this.shadowRoot.activeElement?.dataset.wifi;
        element.querySelector(".wifi-lab-body").innerHTML = markup;
        if (focused && focused !== "close") {
          const next = element.querySelector(
            `[data-wifi="${focused}"]:not([disabled])`,
          );
          (next || close).focus({ preventScroll: true });
        }
      }
    }
    _wifiBandMarkup(row, session, compares, animate) {
      const { t, number } = this._ui;
      const { band, channel, width } = row;
      const [name, start, end] = WIFI_BANDS[band];
      const label = name || t.band24;
      const position =
        channel && (100 * (channel.value - start)) / (end - start);
      const measure = (sample, kind) =>
        sample
          ? `${number.format(sample.value)}${kind === "width" ? " MHz" : ""}`
          : "—";
      const prior = session.baseline?.find((item) => item.band === band);
      const beforePress = session.optimization?.beforePress.find(
        (item) => item.band === band,
      );
      const comparison = (kind, heading) => {
        const prev = prior?.[kind];
        const sample = row[kind];
        if (!prev && !sample) return "";
        const initiation =
          session.optimization.startedAt ?? session.optimization.clickedAt;
        const cutoff = Math.max(initiation, beforePress?.[kind]?.at ?? 0);
        const fresh = sample?.at != null && sample.at > cutoff;
        const same = !!prev && prev.value === sample?.value;
        const result = fresh
          ? !prev
            ? t.wifiNoBaseline
            : same
              ? t.wifiUnchanged
              : `${measure(prev, kind)} → ${measure(sample, kind)}`
          : same
            ? t.wifiSameLastReported
            : t.wifiNoFreshValue;
        const after = !fresh && sample ? t.wifiLastReported : t.wifiAfter;
        return `<div><dt>${heading}</dt><dd>${t.wifiBefore} ${measure(prev, kind)} · ${after} ${measure(sample, kind)}<small>${result}</small></dd></div>`;
      };
      return `<article class="wifi-lab-band" data-band="${band}">
        <header><h4>${label}</h4><span>${t.wifiChannel} <b>${measure(channel, "channel")}</b> · ${t.wifiWidth} <b>${measure(width, "width")}</b></span></header>
        <div class="wifi-ruler" aria-hidden="true">${animate ? '<i class="wifi-sweep"></i>' : ""}
          ${channel && position >= 0 && position <= 100 ? `<i class="wifi-marker" style="--channel-position:${position}%"></i>` : ""}
        </div><div class="wifi-axis" aria-hidden="true"><span>${start}</span><span>${end}</span></div>
        ${compares ? `<dl class="wifi-band-comparison">${comparison("channel", t.wifiChannel)}${comparison("width", t.wifiWidth)}</dl>` : ""}
      </article>`;
    }
    _wifiPanel(d) {
      const { t, number } = this._ui;
      const monitor = d.wifiMonitor;
      if (monitor || d.wifi.guest.switchId || d.wifi.iot.switchId)
        this._ensureWifiManifest();
      const session = monitor?.canOpen ? this._wifiSession(monitor) : null;
      const feedback =
        session && monitor.advice
          ? this._wifiAdviceFeedback(monitor.advice, session)
          : null;
      const status = feedback
        ? `<div class="wifi-overview-status" data-state="${esc(monitor.advice.state)}">
          <strong>${feedback.request || feedback.label}</strong>
          ${feedback.outcome && !feedback.scanWithoutResult ? `<small>${feedback.outcome}</small>` : ""}
          ${feedback.acknowledged ? `<small>${feedback.acknowledged}</small>` : ""}
        </div>`
        : "";
      const channels = (monitor?.bands || [])
        .filter(({ channel, width }) => channel || width)
        .map(({ band, channel, width }) => {
          const label = WIFI_BANDS[band][0] || t.band24;
          const readings = [
            channel && `${t.wifiChannel} ${number.format(channel.value)}`,
            width &&
              `${channel ? "" : `${t.wifiWidth} `}${number.format(width.value)} MHz`,
          ]
            .filter(Boolean)
            .join(" · ");
          return `<div data-band="${band}"><dt>${label}</dt><dd>${readings}</dd></div>`;
        })
        .join("");
      const names = {
        main: t.primaryNetwork,
        guest: t.guestNetwork,
        iot: t.iotNetwork,
      };
      return `<section class="panel"><div class="section-head"><h3>${ico("wifi", 19)} ${t.wifi}</h3></div><div class="wifi-list">${Object.keys(
        names,
      )
        .map((k) => {
          const e = d.wifi[k];
          const feedback = this._wifiSwitchFeedback.get(e.control);
          const busy = feedback?.pending === true;
          const control = e.control
            ? `<button type="button" class="wifi-switch" role="switch" data-action="wifi-switch" data-band="${k}" data-entity="${esc(e.control)}" aria-label="${esc(names[k])}" aria-checked="${e.on}" aria-busy="${busy}" aria-disabled="${busy}"><span class="wifi-switch-state" aria-hidden="true">${e.on ? t.on : t.off}</span><span class="wifi-switch-track" aria-hidden="true"></span></button>`
            : this._statusPill(e.on, t.on, t.off);
          const error =
            feedback?.error != null
              ? `<small class="wifi-error" role="alert">${t.wifiSwitchError} ${esc(feedback.error)}</small>`
              : "";
          return `<div><div class="wifi-row"><span>${ico("wifi", 18)}<span><b>${esc(names[k])}</b>${e.ssid ? `<small>${esc(e.ssid)}</small>` : ""}</span></span>${control}</div>${error}</div>`;
        })
        .join("")}</div>${
        channels
          ? `<div class="wifi-channel-summary">
          <h4>${t.wifiCurrentChannels}</h4><dl>${channels}</dl>
        </div>`
          : ""
      }${status}<small class="hint">${t.wifiHint}</small>${
        monitor?.canOpen
          ? `<div class="wifi-monitor-links">
          <button type="button" class="tiny-btn" data-action="wifi-monitor" aria-haspopup="dialog" aria-describedby="wifi-selected-mesh">${t.wifiMonitor}</button>
          <span class="wifi-selected-mesh" id="wifi-selected-mesh">${t.meshEntry} · <b>${esc(monitor.name)}</b></span>
        </div>`
          : ""
      }</section>`;
    }
    _apiPanel(d) {
      const { t, duration, timeLabel } = this._ui;
      const err =
        d.lastError === "0"
          ? t.noError
          : valid(d.lastError)
            ? String(d.lastError)
            : "—";
      const queryMode = {
        per_node: t.perNode,
        global_fallback: t.globalFallback,
      };
      const mode = Object.hasOwn(queryMode, d.queryMode)
        ? queryMode[d.queryMode]
        : valid(d.queryMode)
          ? d.queryMode
          : "—";
      return `<section class="panel api-panel"><div class="section-head"><h3>${ico("code-braces", 19)} ${t.api}</h3><small>${t.optionalDiagnostics}</small></div><div class="api-grid"><div><small>${t.decoUpdated}</small><strong>${esc(timeLabel(d.decoUpdate))}</strong></div><div><small>${t.clientsUpdated}</small><strong>${esc(timeLabel(d.clientUpdate))}</strong></div><div><small>${t.decoResponse}</small><strong>${esc(duration(d.response))}</strong></div><div><small>${t.clientResponse}</small><strong>${esc(duration(d.clientResponse))}</strong></div><div><small>${t.queryMode}</small><strong>${esc(mode)}</strong></div><div><small>${t.timeouts}</small><strong>${esc(d.timeouts == null ? "—" : d.timeouts)}</strong></div><div class="error-text"><small>${t.lastError}</small><strong title="${esc(err)}">${esc(err)}</strong></div><div><small>${t.polling}</small><strong>${d.polling === true ? t.active : d.polling === false ? t.paused : "—"}</strong></div></div></section>`;
    }
    _trafficPanel(d) {
      const { t, field } = this._ui;
      const hours = this._historyPeriod();
      const showHistory =
        !this._isCompact() || this._config.compact_chart !== false;
      const controls = showHistory
        ? `<div class="chart-controls">${[1, 6, 24].map((h) => `<button type="button" data-action="hours" data-value="${h}" class="hour ${hours === h ? "active" : ""}" aria-pressed="${hours === h}">${h}${t.hourShort}</button>`).join("")}</div>`
        : "";
      const loading =
        this._historyLoading &&
        !this._history.down.length &&
        !this._history.up.length;
      const history = showHistory
        ? `
        ${loading ? `<div class="empty-small">${t.historyLoading}</div>` : trendSvg(this._history, this._ui)}
        <div class="legend"><span class="teal-dot"></span> ${t.download} <span class="blue-dot"></span> ${t.upload} <span class="legend-note">Recorder · ${historyLength(hours, t)}</span></div>`
        : "";
      return `<section class="panel traffic-panel">
        <div class="section-head"><h3>${ico("chart-areaspline", 19)} ${t.activity}</h3>${controls}</div>
        <div class="traffic-now"><span>${ico("arrow-down-bold", 15)} ${esc(field(d.down, ` ${t.trafficUnit}`))}</span><span>${ico("arrow-up-bold", 15)} ${esc(field(d.up, ` ${t.trafficUnit}`))}</span></div>
        ${history}
        <small class="hint">${t.rateHint}</small>
      </section>`;
    }
    _sectionChoices() {
      const { t } = this._ui;
      return `<section class="widget-picker"><div class="section-head"><h3>${ico("view-dashboard-edit", 18)} ${t.visible}</h3><button type="button" data-action="all-sections" class="tiny-btn">${t.showAll}</button></div><div class="choices">${Object.entries(
        SECTION_KEYS,
      )
        .map(
          ([id, label]) =>
            `<button type="button" data-action="toggle-section" data-section="${esc(id)}" aria-pressed="${this._sections().includes(id)}" class="choice ${this._sections().includes(id) ? "chosen" : ""}">${this._sections().includes(id) ? "✓" : "+"} ${esc(t[label])}</button>`,
        )
        .join("")}</div><small class="hint">${t.widgetsHint}</small></section>`;
    }
    _render() {
      if (!this._hass) return;
      const { t, field, duration, timeLabel } = this._ui;
      const d = this._data();
      this._renderWifiMonitor(d.wifiMonitor);
      const clientTargets = this._clientActionTargets(d);
      const renameDialog = this._clientRenameDialog;
      if (
        renameDialog?.element.open &&
        !renameDialog.submitted &&
        !this._findClientActionTarget(
          renameDialog.target,
          "canRename",
          clientTargets,
        )
      )
        renameDialog.element.close();
      const layout = this._layout();
      const sections = this._sections();
      const section = (id, body) => (sections.includes(id) ? body : "");
      const loaded = d.nodes.length > 0;
      if (loaded) this._ensureHistory(d);
      const topInfo = d.entries.multiple
        ? `<div class="notice">${message(t.multipleMeshes, { setting: `<b>${esc(t.meshEntry)}</b>` })}</div>`
        : "";
      const noData = `<div class="no-data">${ico("access-point-network-off", 36)}<b>${t.noUnits}</b><p>${t.noUnitsHint}</p><button type="button" data-action="retry">${t.retry}</button>${this._regError ? `<small>${esc(t.registryError)}</small>` : ""}</div>`;
      let body = noData;
      if (loaded) {
        const topology = section(
          "topology",
          this._topology(d, layout === "compact"),
        );
        const details = this._nodeDetails(d);
        const health = `<div class="health-strip">
          ${this._metric(t.mainCpu, field(d.master?.cpu, t.percent), "chip")}
          ${this._metric(t.memory, field(d.master?.memory, t.percent), "memory")}
          ${this._metric(t.backhaul, field(d.master?.backhaulSpeed, " Mbit/s"), "lan-connect")}
          ${this._metric(t.response, duration(d.response), "timer-outline")}
        </div>`;
        const traffic = section("traffic", this._trafficPanel(d));
        const wifi = section("wifi", this._wifiPanel(d));
        const nodes = section("nodes", this._nodesPanel(d));
        const clients = section("clients", this._clientsPanel(d));
        const clientControls = this._clientControlsPanel(clientTargets);
        const api = section("api", this._apiPanel(d));
        const diagnostics =
          nodes || api
            ? `<details class="diagnostics"><summary>${ico("wrench", 18)} <span>${t.technicalDiagnostics}</span>${ico("chevron-down", 18)}</summary><div class="diagnostics-body">${nodes}${api}</div></details>`
            : "";
        const overview = topology + traffic;
        const dashboard =
          layout === "wide" && overview
            ? `<div class="mesh-columns">
              <div>${overview}</div>
              <div>${health}${details}<div class="mesh-secondary">${wifi}${clients}</div>${clientControls}</div>
            </div>`
            : `${topology}${details}${health}<div class="lower-grid">${traffic}${wifi}${clients}</div>${clientControls}`;
        body = dashboard + diagnostics;
      }
      const lastUpdate = Math.max(
        ...[d.decoUpdate, d.clientUpdate]
          .map((value) => Date.parse(value))
          .filter(Number.isFinite),
      );
      const updateLabel = Number.isFinite(lastUpdate)
        ? message(t.updated, { time: timeLabel(lastUpdate) })
        : t.noUpdate;
      const markup = `<style>${STYLE}</style><ha-card lang="${this._ui.language}" class="frame ${layout}"><div class="aura"></div><div class="header"><div class="logo">${ico("access-point-network", 27)}</div><div class="head-title"><h2>${esc(this._config.title || CARD_NAME)}</h2><p>${t.subtitle}</p></div><div class="header-actions"><span class="update-mark">${ico("refresh", 14)} ${esc(updateLabel)}</span><button type="button" data-action="toggle-expand" aria-expanded="${this._expanded}" title="${t.chooseSections}">${ico("tune-variant", 18)}<span class="action-label"> ${t.widgets}</span></button></div></div>${topInfo}<div class="summary">${this._metric("Internet", d.internet === true ? t.online : d.internet === false ? t.offline : t.unknown, "earth")}${this._metric(t.connected, d.clientCount == null ? "—" : d.clientCount, "devices")}${this._metric(t.download, field(d.down, ` ${t.trafficUnit}`), "arrow-down-bold")}${this._metric(t.upload, field(d.up, ` ${t.trafficUnit}`), "arrow-up-bold")}</div>${this._expanded ? this._sectionChoices() : ""}${body}<div class="footer"><span>${this._statusPill(d.polling, t.pollingOn, t.pollingOff)}</span><span>${esc(CARD_NAME)}</span></div></ha-card>`;
      if (this._lastMarkup !== markup) {
        this._lastMarkup = markup;
        const activeElement = this.shadowRoot.activeElement;
        const chartFocused = activeElement?.classList.contains("chart-plot");
        const clientToggleFocused =
          activeElement?.dataset.action === "toggle-clients";
        const nodeFocusId = activeElement?.classList.contains("node")
          ? activeElement.dataset.id
          : null;
        const wifiOpenerFocused =
          activeElement?.dataset.action === "wifi-monitor";
        const wifiSwitchFocus =
          activeElement?.dataset.action === "wifi-switch"
            ? activeElement.dataset.entity
            : null;
        const previousDiagnostics =
          this._content.querySelector?.(".diagnostics");
        const diagnosticsOpen = previousDiagnostics?.open;
        const diagnosticsFocused =
          activeElement &&
          activeElement === previousDiagnostics?.firstElementChild;
        const clientScroll = this.shadowRoot.querySelector?.(
          ".client-control-list",
        )?.scrollTop;
        this._content.innerHTML = markup;
        if (diagnosticsOpen || diagnosticsFocused) {
          const diagnostics = this._content.querySelector(".diagnostics");
          if (diagnostics) {
            diagnostics.open = diagnosticsOpen;
            if (diagnosticsFocused)
              diagnostics.firstElementChild.focus({ preventScroll: true });
          }
        }
        if (clientScroll) {
          const list = this.shadowRoot.querySelector(".client-control-list");
          if (list) list.scrollTop = clientScroll;
        }
        if (this._chartTime != null || chartFocused) {
          const plot = this.shadowRoot.querySelector(".chart-plot");
          if (plot && this._chartTime != null) this._updateChartReadout(plot);
          if (chartFocused) plot?.focus({ preventScroll: true });
        }
        if (clientToggleFocused)
          this.shadowRoot
            .querySelector('[data-action="toggle-clients"]')
            ?.focus({ preventScroll: true });
        if (nodeFocusId)
          Array.from(this._content.querySelectorAll(".node"))
            .find((node) => node.dataset.id === nodeFocusId)
            ?.focus({ preventScroll: true });
        if (wifiOpenerFocused)
          this._content
            .querySelector('[data-action="wifi-monitor"]')
            ?.focus({ preventScroll: true });
        if (wifiSwitchFocus)
          Array.from(this._content.querySelectorAll(".wifi-switch"))
            .find((control) => control.dataset.entity === wifiSwitchFocus)
            ?.focus({ preventScroll: true });
      }
    }
  }
  const STYLE = `
    :host {display:block;min-width:0;--teal:#34ead0;--blue:#62b6f8;color:#eaf6ff;font-family:Roboto,Arial,sans-serif;font-size:14px}
    *{box-sizing:border-box} button{font:inherit;cursor:pointer} ha-icon{display:inline-flex;align-items:center;justify-content:center;flex:none}
    .frame{position:relative;display:block;overflow:hidden;isolation:isolate;background:radial-gradient(ellipse at 45% 0%,#0a3945 0%,transparent 48%),linear-gradient(146deg,#081c2b,#071322 58%,#0b2133)!important;color:#eaf6ff!important;border:1px solid rgba(65,221,218,.36);box-shadow:0 14px 42px #0005,inset 0 1px 0 #ffffff0e;border-radius:20px;min-width:0;padding:18px}
    .aura{position:absolute;inset:-100px -150px auto 5%;height:230px;background:radial-gradient(ellipse,#25d6b81b,transparent 70%);pointer-events:none;z-index:-1}
    .header,.header-actions,.summary,.metric,.section-head,.status,.topology-meta,.topology-note,.footer,.wifi-row,.wifi-row>span,.legend,.traffic-now,.detail-grid,.client-chips{display:flex;align-items:center;gap:9px}
    .header{margin-bottom:16px}.logo{height:42px;width:42px;display:grid;place-items:center;color:#72ffdc;background:linear-gradient(135deg,#0a706d,#113143);border:1px solid #55ead34e;border-radius:13px;box-shadow:0 0 25px #00bfa427}
    .head-title{flex:1;min-width:0}.head-title h2{font-size:21px;letter-spacing:-.4px;margin:0;line-height:1.25;color:#fff}.head-title p{margin:3px 0 0;color:#9fbdc6;font-size:12px}
    .header-actions{gap:10px}.header-actions button,.tiny-btn,.hour{display:inline-flex;align-items:center;justify-content:center;gap:5px;color:#d5eaff;border:1px solid #78cfdc44;background:#112f3c;border-radius:11px;padding:7px 10px;transition:background .2s}.header-actions button:hover,.tiny-btn:hover,.hour:hover{background:#174d57}
    .update-mark{display:flex;align-items:center;gap:4px;color:#add0d9;font-size:11px}.status i,.dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#72939d;margin-right:4px}.status.ok i,.dot.on{background:#36ef9d;box-shadow:0 0 8px #36efa388}.status.bad i,.dot.off{background:#ff7b70}.status{gap:3px;font-size:11px;color:#afcdd5;white-space:nowrap}.status.ok{color:#5bf0b6}.status.bad{color:#ff988b}
    .summary,.health-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:13px;align-items:stretch}.metric{min-height:70px;padding:10px;background:linear-gradient(140deg,#102e3bda,#071d2bca);border:1px solid #5ac0ca2d;border-radius:13px;min-width:0}.metric-icon{height:32px;width:32px;color:#5ef3d2;display:grid;place-items:center;border-radius:50%;background:#0d535a63;flex:none}.metric div{min-width:0}.metric small{display:block;color:#9cbbc5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px}.metric strong{display:block;color:#fff;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px}.metric .status{margin-top:4px}.metric strong:not(:last-child){margin-bottom:0}
    .topology{background:radial-gradient(ellipse at 50% 57%,#03635d21,transparent 45%),#04172340;border:1px solid #1e7f846e;border-radius:16px;margin:0 0 13px;overflow:hidden}.topology-meta{margin:13px 14px 0;color:#a7d5df;font-size:11px}.mesh-canvas{position:relative;height:370px;overflow:hidden;min-width:0}.mesh-canvas svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}.mesh-canvas .link-path{fill:none;stroke:#36efdb;stroke-width:2.2;stroke-dasharray:8 8;opacity:.85;filter:drop-shadow(0 0 6px #32ffde80);animation:flow 8s linear infinite}.mesh-canvas .internet-path{fill:none;stroke:#36e2aa;stroke-width:2;stroke-dasharray:3 9;opacity:.45}.waves{position:absolute;inset:30% 0 0;background:radial-gradient(ellipse at 50% 70%,#02c9ab12,transparent 60%);pointer-events:none}.internet-node{position:absolute;top:1px;left:50%;transform:translateX(-50%);z-index:3;display:flex;align-items:center;gap:4px;font-size:11px;background:#0b303d;border:1px solid #1f8086;border-radius:18px;padding:6px 10px;white-space:nowrap}.internet-node .status{margin-left:4px}
    .node{position:absolute;z-index:2;transform:translate(-50%,-50%);width:158px;min-height:106px;border:1px solid #1b8297;background:linear-gradient(155deg,#0b3445,#07232eeb);color:#f4ffff;border-radius:14px;padding:8px;box-shadow:0 0 20px #00d4be17;text-align:center;display:flex;flex-direction:column;align-items:center;gap:3px;outline:none}.node.root{width:181px;min-height:123px;border-color:#39eccd;box-shadow:0 0 31px #00efc34b;background:linear-gradient(145deg,#10525b,#042734)}.node.selected,.node:focus-visible{outline:2px solid #eaffff;outline-offset:2px}.node.offline{border-color:#d06c70;opacity:.85}.node b{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere;max-width:100%;font-size:13px;line-height:1.2}.node.root b{font-size:17px}.node-type{font-size:10px;color:#aad5de}.node-info{display:flex;justify-content:center;align-items:center;gap:5px}.node-info small{font-size:10px;color:#b4d5dd}.cylinder{display:block;position:relative;width:31px;height:30px;margin-top:-13px;border-radius:50% 50% 30% 30%/18% 18% 22% 22%;background:linear-gradient(90deg,#9db9c8,#fff 43%,#9cb9c8 95%);box-shadow:0 7px 19px #54fdcc30}.cylinder:before{content:"";position:absolute;left:0;right:0;top:0;height:10px;background:linear-gradient(90deg,#c2d4da,#f8ffff,#a2cad1);border-radius:50%}.root .cylinder{width:39px;height:36px}.topology-note{padding:9px 14px;color:#83adb8;font-size:10px;border-top:1px solid #144859}
    @keyframes flow{to{stroke-dashoffset:-80}}@media (prefers-reduced-motion:reduce){.mesh-canvas .link-path{animation:none}}
    .health-strip{margin:13px 0}.health-strip .metric{min-height:65px}
    .lower-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(235px,1fr);gap:12px;margin-bottom:12px}.panel,.detail-panel,.widget-picker{background:linear-gradient(155deg,#092c3c,#091c2d);border:1px solid #24697990;border-radius:14px;padding:13px;min-width:0}.panel h3,.detail-panel h3,.widget-picker h3{font-size:13px;margin:0;color:#e6ffff;display:flex;align-items:center;gap:7px}.section-head{justify-content:space-between;gap:8px;margin-bottom:12px}.section-head small,.hint{color:#83aab6;font-size:10px}.hint{display:block;margin-top:10px;line-height:1.5}
    .traffic-panel .section-head{flex-wrap:wrap}.chart-controls{display:flex;gap:4px}.hour{font-size:10px;padding:4px 8px;border-radius:7px}.hour.active{border-color:#36edcb;color:#59f6d5;background:#0a464a}.chart{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 8px;margin:10px 0 6px;color:#a9c9d4;font-size:10px}
    .chart-unit{grid-column:1/-1}
    .chart-scale{display:flex;flex-direction:column;justify-content:space-between;text-align:right}
    .chart-plot{position:relative;min-width:0;cursor:crosshair;touch-action:pan-y}
    .chart-svg{display:block;width:100%;height:140px;overflow:visible}
    .chart-cursor{position:absolute;top:0;bottom:0;border-left:1px dashed #def5ff;pointer-events:none}
    .chart-times{grid-column:2;display:flex;justify-content:space-between;gap:6px}
    .chart-readout{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:3px 12px;min-height:1.4em;color:#e1f5fa;line-height:1.4}.grid-line{fill:none;stroke:#87cfd51c;stroke-width:1}.traffic-now{color:#cdf3f3;font-size:12px;gap:18px}.traffic-now span{display:flex;align-items:center;gap:4px}.legend{font-size:10px;color:#9fbeca;gap:6px}.teal-dot,.blue-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#21e8ca;margin-left:4px}.blue-dot{background:#71b8fd}.legend-note{margin-left:auto;color:#779caa}.empty-small{min-height:115px;display:grid;place-items:center;color:#88a9b6;font-size:12px;text-align:center}
    .wifi-list{display:flex;flex-direction:column;gap:5px}.wifi-row{justify-content:space-between;border-bottom:1px solid #2b71822d;padding:6px 0;gap:6px}.wifi-row>span{color:#60e4c9;gap:8px;min-width:0}.wifi-row>span span{display:flex;flex-direction:column;color:#e7f5fc;font-size:11px}.wifi-row small{font-size:10px;color:#7daaba}.wifi-row .status{font-size:10px}
    .node-table-head,.node-table-row{display:grid;grid-template-columns:minmax(90px,1.4fr) repeat(3,minmax(40px,.6fr)) minmax(75px,.9fr);align-items:center;gap:5px}.node-table-head{color:#7eaab4;font-size:10px;margin-bottom:8px}.node-table-row{width:100%;color:#e4f3fa;font-size:11px;background:transparent;border:0;border-top:1px solid #29808c20;text-align:left;padding:9px 0}.node-table-row:hover{background:#ffffff06}.name-cell{display:flex;align-items:center;gap:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.node-table-row .dot{width:7px;height:7px;flex:none}.clients-big{font-size:30px;font-weight:750;color:#fff}.clients-big span{font-size:11px;font-weight:400;color:#a9c5cc}.bands{margin-top:13px;display:grid;gap:10px}.bands div{display:flex;align-items:center;gap:7px;font-size:12px}.bands ha-icon{color:#53eccb}.bands strong{margin-left:auto}.api-grid,.detail-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.api-grid>div,.detail-grid>div{min-width:0;padding-right:10px;border-right:1px solid #4a8e993d}.api-grid small,.detail-grid small{display:block;color:#91bbc4;font-size:10px}.api-grid strong,.detail-grid b{display:block;color:#fff;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:5px}.error-text{grid-column:span 1}.detail-panel{margin:0 0 13px}.detail-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.client-chips{flex-wrap:wrap;margin-top:14px}.client-chip{display:flex;align-items:center;gap:4px;background:#10404a;color:#afe8e7;padding:5px 7px;border-radius:7px;font-size:10px}
    .footer{justify-content:space-between;margin-top:12px;padding:10px 12px;border:1px solid #4b9ab53b;border-radius:12px;background:#0c344267;color:#aac4cf;font-size:11px;gap:10px;flex-wrap:wrap}.footer span{display:flex;align-items:center;gap:5px}.footer .status{font-size:11px}.footer ha-icon{color:#5ee6d5}
    .notice{background:#634c122a;border:1px solid #ffdb986b;padding:10px;border-radius:9px;font-size:12px;color:#ffdeb5;margin-bottom:12px}.notice code{font-family:monospace}.no-data{display:flex;align-items:center;flex-direction:column;text-align:center;gap:10px;padding:45px 18px;color:#a6cad2}.no-data>b{color:#fff}.no-data p{max-width:460px;line-height:1.6}.no-data button{border:1px solid #20cbb7;background:#0b5459;color:#e9fffd;border-radius:9px;padding:9px 14px}.widget-picker{margin-bottom:12px}.choices{display:flex;flex-wrap:wrap;gap:7px}.choice{border:1px solid #43838b;color:#9dc6cb;background:#071f2d;border-radius:8px;padding:6px 9px;font-size:11px}.choice.chosen{border-color:#2fe1be;color:#6ff4d6;background:#11534755}
    .frame:is([lang="de"],[lang="fr"]) .metric small{white-space:normal;overflow-wrap:anywhere}
    .compact[lang="fr"] :is(.node-table-head,.node-table-row){grid-template-columns:minmax(78px,1.3fr) minmax(46px,.7fr) repeat(2,minmax(37px,.6fr)) minmax(66px,.9fr)}
    .compact{padding:13px;border-radius:16px}.compact .summary{grid-template-columns:repeat(2,minmax(0,1fr))}.compact .header-actions .action-label{display:none}.compact .update-mark{max-width:88px;font-size:10px}.compact .head-title h2{font-size:18px}.compact .metric{min-height:63px}.compact .health-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.compact .lower-grid{grid-template-columns:1fr}.compact .mesh-canvas{height:280px}.compact .node{width:103px;min-height:81px;padding:6px;gap:2px}.compact .node.root{width:114px;min-height:91px}.compact .node b,.compact .node.root b{font-size:11px}.compact .node-info{flex-wrap:wrap;gap:0}.compact .node-info small{display:none}.compact .cylinder,.compact .node.root .cylinder{width:26px;height:24px;margin-top:-9px}.compact .node-type{font-size:9px}.compact .topology-meta{font-size:10px}.compact .api-grid,.compact .detail-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.compact .topology-note{font-size:9px}.compact .panel{padding:12px}.compact .chart-svg{height:110px}
    .client-control-list{list-style:none;margin:0;padding:0;max-height:18rem;overflow:auto}
    .client-control-row{display:flex;align-items:center;flex-wrap:wrap;gap:6px;padding:8px 2px;border-top:1px solid #29808c40;font-size:11px}
    .client-control-row>b{overflow-wrap:anywhere;flex:1 1 96px}
    .client-control-actions{display:flex;flex-wrap:wrap;gap:5px}
    .client-control-actions .tiny-btn{font-size:11px;padding:5px 7px}
    .client-control-actions button:disabled{opacity:.65;cursor:wait}
    .client-control-feedback{flex-basis:100%;color:#c1dde4;overflow-wrap:anywhere}
    .client-control-feedback:empty{display:none}
    .client-control-feedback.action-error{color:#ffad9d}
    .client-rename-dialog{width:min(420px,calc(100% - 32px));padding:20px;color:#eaf6ff;background:#0b2535;border:1px solid #42848e;border-radius:14px}
    .client-rename-dialog::backdrop{background:#06131bbc}
    .client-rename-dialog form{display:grid;gap:10px}
    .client-rename-dialog h3,.client-rename-dialog p{margin:0;overflow-wrap:anywhere}
    .client-rename-dialog label{display:grid;gap:5px}
    .client-rename-dialog input{width:100%;padding:8px;font:inherit;color:inherit;background:#071c2b;border:1px solid #42848e;border-radius:8px}
    .client-rename-dialog small{color:#add0d9}
    .client-rename-dialog p:empty{display:none}
    .client-rename-error{color:#ffad9d}
    .client-rename-dialog .client-control-actions{justify-content:flex-end}
    .wifi-monitor-links,.wifi-lab-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
    .wifi-monitor-links{align-items:center}.wifi-selected-mesh{font-size:11px;color:#a9c9d4;overflow-wrap:anywhere;min-width:0}.wifi-selected-mesh b{color:#e6ffff}
    .wifi-switch{display:flex;flex:none;align-items:center;gap:6px;min-height:32px;padding:3px 2px;border:0;background:none;color:#bed5df;font-size:10px}
    .wifi-switch:focus-visible{outline:2px solid #b7fff6;outline-offset:2px;border-radius:5px}
    .wifi-switch[aria-checked="true"]{color:#82f6dc}.wifi-switch[aria-busy="true"]{opacity:.6;cursor:progress}
    .wifi-switch-track{display:flex;align-items:center;width:30px;height:17px;padding:2px;border:1px solid #587d8b;border-radius:12px;background:#152c38}
    .wifi-switch-track::before{content:"";width:11px;height:11px;border-radius:50%;background:#b5c9d1}
    .wifi-switch[aria-checked="true"] .wifi-switch-track{justify-content:flex-end;border-color:#37bda7;background:#15534d}
    .wifi-switch[aria-checked="true"] .wifi-switch-track::before{background:#80f4d7}
    .diagnostics{margin-top:12px;border:1px solid #24697990;border-radius:14px;background:#092637}
    .diagnostics>summary{display:flex;align-items:center;gap:8px;min-height:44px;padding:8px 13px;list-style:none;cursor:pointer;color:#def6fb;font-size:13px;font-weight:650;border-radius:13px}
    .diagnostics>summary::-webkit-details-marker{display:none}.diagnostics>summary:focus-visible{outline:2px solid #b7fff6;outline-offset:2px}
    .diagnostics>summary ha-icon{color:#70dacd}.diagnostics>summary ha-icon:last-child{margin-inline-start:auto}.diagnostics[open]>summary ha-icon:last-child{transform:rotate(180deg)}
    .diagnostics-body{display:grid;gap:10px;padding:0 10px 10px}.wide .diagnostics-body{grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr));align-items:start}
    .wifi-overview-status{display:grid;gap:3px;margin-top:10px;padding:7px 9px;border-inline-start:2px solid #387788;background:#0b3243;border-radius:5px;font-size:12px;overflow-wrap:anywhere}
    .wifi-overview-status small{color:#b0ccd7;font-size:11px}
    .wifi-overview-status:is([data-state="scanning"],[data-state="optimizing"]){border-color:#59dace}
    .wifi-overview-status:is([data-state="optimizable"],[data-state="confirm_optimization"]){border-color:#ffd38c;color:#ffd38c}
    .node-label{display:grid;gap:2px;min-width:0;max-width:100%}.node-link-unknown{display:block;color:#ffd38c;font-size:10px;line-height:1.2}
    .mesh-canvas-compact{margin-top:8px}.mesh-canvas-compact .internet-node{top:2px}
    .compact .mesh-canvas-compact .node{width:44%;max-width:178px;min-height:78px;justify-content:center;padding:13px 5px 6px;gap:3px;border-radius:10px}
    .compact .mesh-canvas-compact .node.root{width:52%;max-width:190px;min-height:79px}
    .mesh-canvas-compact .node-label{width:100%}.compact .mesh-canvas-compact .node b{font-size:12px}
    .compact .mesh-canvas-compact .node-type{font-size:10px;line-height:1.2;overflow-wrap:anywhere}
    .compact .mesh-canvas-compact .cylinder{position:absolute;left:50%;top:-8px;transform:translateX(-50%);width:22px;height:18px;margin:0}
    .compact .mesh-canvas-compact .node-info{gap:2px 5px}.compact .mesh-canvas-compact .node-info small{display:block}
    .mesh-canvas-compact .link-path,.mesh-canvas-compact .internet-path{vector-effect:non-scaling-stroke;stroke-width:1.4;stroke-dasharray:4 4}
    .wifi-channel-summary{margin-top:10px;padding-top:9px;border-top:1px solid #29808c40}
    .wifi-channel-summary h4{margin:0 0 5px;font-size:12px}
    .wifi-channel-summary dl{display:grid;gap:4px;margin:0;font-size:11px}
    .wifi-channel-summary dl>div{display:flex;justify-content:space-between;flex-wrap:wrap;column-gap:8px;row-gap:2px}
    .wifi-channel-summary dt{color:#b0ccd7}
    .wifi-channel-summary dd{margin:0;text-align:right;font-weight:650}
    .wifi-monitor-links button{text-align:start;max-width:100%;overflow-wrap:anywhere}
    .wifi-lab{width:min(940px,calc(100% - 24px));max-height:calc(100% - 24px);overflow:auto;padding:clamp(14px,3vw,24px);color:#eaf6ff;background:radial-gradient(ellipse at 40% 0%,#123d49,#091e2d 70%);border:1px solid #2b6976;border-radius:20px;box-shadow:0 20px 65px #031319d9}
    .wifi-lab::backdrop{background:#031119c9}
    .wifi-announcement{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
    .wifi-lab-head{display:flex;align-items:center;gap:12px;margin-bottom:17px}
    .wifi-lab-head>div{flex:1;min-width:0}
    .wifi-lab-icon{display:grid;place-items:center;flex:none;width:44px;height:44px;color:#8afbe5;background:#14515a;border:1px solid #34848a;border-radius:12px}
    .wifi-lab-head small{color:#77e4d4;font-size:11px}
    .wifi-lab-head h2{margin:2px 0;font-size:clamp(18px,4vw,24px)}
    .wifi-lab-head p{margin:2px 0;color:#b0ccd7;overflow-wrap:anywhere}
    .wifi-lab-close{align-self:flex-start}
    .wifi-lab-grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:12px}
    .wifi-lab-section{min-width:0;padding:clamp(12px,2vw,18px);border:1px solid #28616e;border-radius:14px;background:#102f3d9c;overflow-wrap:anywhere}
    .wifi-lab-section h3{margin:0 0 12px;font-size:15px}
    .wifi-lab-section p{margin:10px 0 0;color:#c3dbe4;font-size:13px}
    .wifi-lab-band+.wifi-lab-band{margin-top:16px}
    .wifi-lab-band header{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:5px;margin-bottom:7px}
    .wifi-lab-band h4{margin:0;font-size:14px}
    .wifi-lab-band header span{color:#aed6e0;font-size:12px}
    .wifi-lab-band header b{color:#eaf6ff}
    .wifi-ruler{position:relative;height:72px;overflow:hidden;border:1px solid #275867;border-radius:8px;background:repeating-linear-gradient(90deg,transparent 0 calc(10% - 1px),#64b6bb32 calc(10% - 1px) 10%),repeating-linear-gradient(0deg,transparent 0 23px,#65b5bd21 23px 24px),linear-gradient(0deg,#071c2a,#092c39)}
    .wifi-marker,.wifi-sweep{position:absolute;top:0;bottom:0;width:2px}
    .wifi-marker{left:clamp(0px,var(--channel-position),calc(100% - 2px));background:repeating-linear-gradient(180deg,#b9fff0 0 6px,transparent 6px 10px);filter:drop-shadow(0 0 4px #56e1d8)}
    .wifi-scan-placeholder{margin-top:12px}
    .wifi-sweep{left:0;width:100%;background:linear-gradient(90deg,transparent 30%,#43e7d842 48%,#b4fff6 50%,#43e7d823 51%,transparent 60%);animation:wifi-sweep 2s linear infinite}
    .wifi-lab[data-operation="optimizing"] .wifi-sweep{background:linear-gradient(90deg,transparent 30%,#ffd38c33 48%,#ffe1ac 50%,#ffd38c28 51%,transparent 60%);animation-direction:reverse}
    @keyframes wifi-sweep{from{transform:translateX(-62%)}to{transform:translateX(62%)}}
    .wifi-axis{display:flex;justify-content:space-between;color:#9bbdca;font-size:10px;margin-top:4px}
    .wifi-lab-section .wifi-schematic{font-size:11px;color:#a8c8d4}
    .wifi-advice-ring{display:grid;place-items:center;margin:7px auto 14px;width:66px;height:66px;border-radius:50%;border:4px solid #2a6472;color:#8dede4}
    .wifi-advice-ring[data-state="scanning"],.wifi-advice-ring[data-state="optimizing"]{border-color:#59aeb0;color:#b0fff7;box-shadow:0 0 16px #55e3d637}
    .wifi-advice-ring:is([data-state="scanning"],[data-state="optimizing"]){position:relative}
    .wifi-advice-ring:is([data-state="scanning"],[data-state="optimizing"])::after{content:"";position:absolute;inset:-4px;border:3px solid transparent;border-top-color:#a2fff0;border-radius:50%;animation:wifi-ring 1.15s linear infinite}
    .wifi-advice-ring[data-state="optimizing"]::after{border-top-color:#ffd38c;animation-direction:reverse}
    @keyframes wifi-ring{to{transform:rotate(1turn)}}
    .wifi-advice-ring[data-state="optimizable"],.wifi-advice-ring[data-state="confirm_optimization"]{border-color:#9d7940;color:#ffd38c}
    .wifi-advice .wifi-warning{color:#ffdb96}
    .wifi-advice .wifi-error{color:#ffaaa1}
    .wifi-lab-actions{justify-content:flex-end}
    .wifi-primary{background:#12615f;border-color:#439d96}
    .wifi-lab button:disabled,.wifi-monitor-links button:disabled{opacity:.55;cursor:default}
    .wifi-lab button:focus-visible,.wifi-monitor-links button:focus-visible{outline:2px solid #b7fff6;outline-offset:2px}
    .wifi-band-comparison{display:grid;gap:6px;margin:10px 0 0;font-size:12px}
    .wifi-band-comparison div{display:grid;grid-template-columns:minmax(68px,1fr) 2fr;gap:8px;padding-top:6px;border-top:1px solid #2e606a}
    .wifi-band-comparison dd{margin:0}
    .wifi-band-comparison small{display:block;color:#9fd5d1}
    @media(max-width:620px){.wifi-lab-grid{grid-template-columns:1fr}.wifi-ruler{height:52px}.wifi-advice-ring{margin:0 0 10px;width:44px;height:44px}}
    @media(prefers-reduced-motion:reduce){.wifi-sweep,.wifi-advice-ring:is([data-state="scanning"],[data-state="optimizing"])::after{display:none;animation:none}}
    .mesh-columns{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start;gap:12px}
    .mesh-columns>div{display:grid;gap:10px;min-width:0}
    .mesh-columns .topology,.mesh-columns .detail-panel,.mesh-columns .health-strip{margin:0}
    .mesh-columns .mesh-canvas{height:300px}
    .mesh-columns .node{min-height:85px}
    .mesh-columns .node.root{min-height:98px}
    .mesh-columns .chart-svg{height:108px}
    .mesh-columns .traffic-panel .empty-small{min-height:65px}
    .mesh-columns .health-strip{grid-template-columns:repeat(2,minmax(0,1fr))}
    .mesh-columns .health-strip .metric{min-height:54px}
    .mesh-secondary{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(175px,100%),1fr));gap:10px}
    .mesh-secondary:empty{display:none}
    .node{width:min(158px,29%)}
    .node.root{width:min(181px,31%)}
    .compact .node{width:min(126px,29%)}
    .compact .node.root{width:min(142px,31%)}
    .node-table-head,.node-table-row{grid-template-columns:minmax(0,1.5fr) repeat(3,minmax(35px,.6fr)) minmax(49px,.85fr)}
    .node-table-row>span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .wifi-row small{overflow-wrap:anywhere}
    @media(max-width:700px){.expanded .summary,.expanded .health-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.expanded .lower-grid{grid-template-columns:1fr}.expanded .api-grid,.expanded .detail-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  class DecoMeshCardEditor extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._config = {};
      this._entries = [];
      this._entryTrackers = new Map();
      this._entriesConnection = null;
      this.shadowRoot.addEventListener("change", (e) => this._change(e));
    }
    setConfig(config) {
      this._config = {
        ...config,
        sections: [...(config.sections || DEFAULT_SECTIONS)],
      };
      this._render();
    }
    set hass(hass) {
      if (this._hass === hass) return;
      const connectionChanged = this._hass?.connection !== hass?.connection;
      const capabilitiesChanged = [
        CLIENT_BLOCK_ACTION,
        CLIENT_RENAME_ACTION,
      ].some(
        (action) =>
          canCallClientAction(this._hass, action) !==
          canCallClientAction(hass, action),
      );
      const languageChanged = hassUi(this._hass) !== hassUi(hass);
      this._hass = hass;
      if (connectionChanged) {
        this._entriesConnection = null;
        this._entryTrackers = new Map();
      }
      if (this._updateEntryNames() || capabilitiesChanged || languageChanged)
        this._render();
      this._loadEntries();
    }
    async _loadEntries() {
      const connection = this._hass?.connection;
      if (
        !connection?.sendMessagePromise ||
        this._entriesConnection === connection
      )
        return;
      this._entriesConnection = connection;
      const trackers = this._entryTrackers;
      try {
        const rows = await connection.sendMessagePromise({
          type: "config/entity_registry/list",
        });
        if (trackers !== this._entryTrackers || !Array.isArray(rows)) return;
        for (const row of rows) {
          if (row.platform !== DECO_DOMAIN || !row.config_entry_id) continue;
          const id = row.config_entry_id;
          if (!trackers.has(id)) trackers.set(id, []);
          if (!row.disabled_by && row.entity_id?.startsWith("device_tracker."))
            trackers.get(id).push(row.entity_id);
        }
        if (this._updateEntryNames()) this._render();
      } catch (e) {}
    }
    _updateEntryNames() {
      const entries = [...this._entryTrackers.keys()].sort().map((id) => {
        const main = this._entryTrackers
          .get(id)
          .map((entityId) => stateVal(this._hass, entityId)?.attributes)
          .filter(
            (attrs) => attrs?.device_type === "deco" && boolAttr(attrs.master),
          );
        const name =
          main.length === 1 ? String(main[0].friendly_name || "").trim() : "";
        return { id, name: name || id };
      });
      const changed =
        entries.length !== this._entries.length ||
        entries.some(
          ({ id, name }, index) =>
            id !== this._entries[index].id ||
            name !== this._entries[index].name,
        );
      if (changed) this._entries = entries;
      return changed;
    }
    _change(e) {
      const t = e.target;
      if (!t.name) return;
      const next = { ...this._config };
      if (t.dataset.section) {
        const set = new Set(next.sections || DEFAULT_SECTIONS);
        t.checked ? set.add(t.name) : set.delete(t.name);
        next.sections = DEFAULT_SECTIONS.filter((s) => set.has(s));
      } else if (t.name === "client_controls" || t.name === "client_rename")
        next[t.name] = t.checked;
      else if (t.name === "history_hours") next[t.name] = Number(t.value);
      else next[t.name] = t.value;
      this._config = next;
      this.dispatchEvent(
        new CustomEvent("config-changed", {
          detail: { config: next },
          bubbles: true,
          composed: true,
        }),
      );
    }
    _render() {
      if (!this.shadowRoot) return;
      const { t, language } = hassUi(this._hass);
      const c = this._config,
        styles = `<style>:host{display:block} .editor{display:grid;gap:15px;padding:8px 0;font-family:Roboto,Arial,sans-serif}label{display:grid;gap:4px;font-size:13px}input,select{box-sizing:border-box;width:100%;padding:10px;border-radius:8px;border:1px solid var(--divider-color,#777);background:var(--card-background-color,#fff);color:var(--primary-text-color,#222)}.checks{display:grid;grid-template-columns:1fr 1fr;gap:9px}.checks label{display:flex;gap:7px;align-items:center}.checks input,.control-setting input{width:auto}.control-setting{display:flex;align-items:center}small{opacity:.75;font-size:11px}</style>`;
      const entries = [...this._entries];
      if (c.entry_id && !entries.some(({ id }) => id === c.entry_id))
        entries.push({ id: c.entry_id, name: c.entry_id });
      const entryOptions = entries
        .map(({ id, name }) => {
          const duplicate = entries.some(
            (entry) =>
              entry.id !== id && normalize(entry.name) === normalize(name),
          );
          const label = duplicate && name !== id ? `${name} (${id})` : name;
          return `<option value="${esc(id)}" ${c.entry_id === id ? "selected" : ""}>${esc(label)}</option>`;
        })
        .join("");
      this.shadowRoot.innerHTML = `${styles}<div lang="${language}" class="editor"><label>${t.title}<input name="title" value="${esc(c.title || CARD_NAME)}"/></label><label>${t.layout}<select name="view">${VIEWS.map(
        (view) =>
          `<option value="${view}" ${c.view === view ? "selected" : ""}>${t[view]}</option>`,
      ).join(
        "",
      )}</select></label><label>${t.meshEntry}<select name="entry_id"><option value="">${t.firstEntry}</option>${entryOptions}</select></label><label>${t.historyRange}<select name="history_hours">${[1, 6, 24].map((h) => `<option value="${h}" ${Number(c.history_hours || 1) === h ? "selected" : ""}>${historyLength(h, t)}</option>`).join("")}</select></label>${canCallClientAction(this._hass, CLIENT_BLOCK_ACTION) ? `<label class="control-setting"><input type="checkbox" name="client_controls" ${c.client_controls === true ? "checked" : ""}/> ${t.allowBlock}</label>` : ""}${canCallClientAction(this._hass, CLIENT_RENAME_ACTION) ? `<label class="control-setting"><input type="checkbox" name="client_rename" ${c.client_rename === true ? "checked" : ""}/> ${t.allowRename}</label>` : ""}<label>${t.editorSections}</label><div class="checks">${Object.entries(
        SECTION_KEYS,
      )
        .map(
          ([id, label]) =>
            `<label><input type="checkbox" data-section="true" name="${esc(id)}" ${c.sections?.includes(id) ? "checked" : ""}/> ${esc(t[label])}</label>`,
        )
        .join("")}</div><small>${t.editorHint}</small></div>`;
    }
  }
  if (!customElements.get(CARD_TYPE))
    customElements.define(CARD_TYPE, DecoMeshCard);
  if (!customElements.get(`${CARD_TYPE}-editor`))
    customElements.define(`${CARD_TYPE}-editor`, DecoMeshCardEditor);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((x) => x.type === CARD_TYPE))
    window.customCards.push({
      type: CARD_TYPE,
      name: CARD_NAME,
      get description() {
        return hassUi().t.description;
      },
      preview: true,
    });
  console.info(`%c ${CARD_NAME} v3.0.1 `, "background:#008a80;color:white;");
})();
