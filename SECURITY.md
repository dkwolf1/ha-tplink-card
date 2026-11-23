# Security policy

Security fixes target the latest release. Use [GitHub private vulnerability reporting](https://github.com/dkwolf1/ha-tplink-card/security/advisories/new) after the repository is published and reporting is enabled. Include the card version, Home Assistant version, impact, and a minimal reproduction with fictional or redacted data. Keep credentials, addresses, device identifiers and private logs out of reports.

The module reads Home Assistant states and uses the authenticated Home Assistant connection for the entity registry and Recorder. It is read-only by default. Optional client controls use Home Assistant's administrator-only Deco action. Home Assistant and the Deco integration enforce access and execute the change. Dashboard resources under `/local/` can be downloaded by anyone who can reach the Home Assistant endpoint. The package contains code and a license only.

See [repository settings](docs/RELEASE.md#github-instellingen) for the maintainer's security checklist.
