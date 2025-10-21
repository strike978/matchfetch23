# MatchFetch — 23andMe Edition

MatchFetch is a Chrome extension that extracts and saves your 23andMe DNA match data for off-site analysis and research. It collects match details and ancestry composition data to make it easier to export, analyze, or archive your matches.

> Note: This extension is designed for personal use with your own 23andMe account. Use responsibly and follow 23andMe's Terms of Service and privacy rules. This project is not affiliated with 23andMe.

## Key features

- Extracts detailed match information from your 23andMe account pages
- Captures ancestry composition and related match metadata
- Saves results as local files for analysis

## Installation (developer / local)

1. Clone this repository:

```powershell
git clone https://github.com/strike978/matchfetch23.git
cd matchfetch23
```

2. Open Chrome and navigate to chrome://extensions
3. Enable "Developer mode" (top-right)
4. Click "Load unpacked" and select the repository folder (`matchfetch23`)
5. The extension should appear in the toolbar. Pin it if you like.

## Usage

1. Log into your 23andMe account in Chrome.
2. Navigate to the Matches or Ancestry pages you want to extract.
3. Click the extension icon to start extraction.
4. Follow any on-screen prompts. Output files will be saved locally (or as prompted) for your analysis.

## Security & privacy

- This extension requires access only to cookies and pages on `*.23andme.com` to collect match data.
- The extension stores data locally; it does not transmit data to external servers (unless you add such functionality).
- Do not share exported match files without consent from the people they reference.

## Contributing

Contributions, bug reports, and feature requests are welcome. Please open an issue or submit a PR. When contributing, include:

- A clear description of the change
- Steps to reproduce (for bugs)
- Small, focused commits

## Acknowledgements

Built by strike978.

---
