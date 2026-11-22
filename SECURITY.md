# Security policy

Security fixes target the latest release. Use [GitHub private vulnerability reporting](https://github.com/dkwolf1/ha-tplink-deco-mesh-card/security/advisories/new) after the repository is published and reporting is enabled. Include the card version, Home Assistant version, impact, and a minimal reproduction with fictional or redacted data. Keep credentials, addresses, device identifiers and private logs out of reports.

The module reads Home Assistant states and uses the authenticated Home Assistant connection for the entity registry and Recorder. It does not issue router commands or make separate network requests. Dashboard resources under `/local/` can be downloaded by anyone who can reach the Home Assistant endpoint. The package contains code and a license only.

See [repository settings](docs/RELEASE.md#github-instellingen) for the maintainer's security checklist.
