# GitHub Copilot Instructions for NAICS Repository

## Project Overview

This repository provides a **free, static JSON REST API** for 2,404 NAICS (North American Industry Classification System) classification codes, served via GitHub Pages. The project uses Node.js to generate static JSON files from source data.

**Live API:** https://upholdjd.github.io/NAICS/  
**Base URL:** `https://upholdjd.github.io/NAICS/api/v1/`

## Project Architecture

### Data Sources
- **NAICS.json**: Contains 2,404 NAICS classification codes with full details
- **NAICS_Mini.json**: Contains a simplified version of NAICS codes

### Build System
- **scripts/build-api.js**: Node.js script (zero dependencies) that generates ~6,100 static JSON files
  - Uses only Node.js built-ins (fs, path)
  - Reads source JSON files and generates hierarchical API structure
  - Outputs to `dist/` directory

### Generated API Structure
The build script creates multiple endpoint types:
- Individual code lookups with breadcrumb ancestry
- Children listings for codes
- Level-based filtering (sector, subsector, industry-group, industry, us-industry)
- Sector-based listings and hierarchical trees
- Search index for client-side search
- Full hierarchical tree representation

### Deployment
- **GitHub Actions**: Automated deployment via `.github/workflows/deploy.yml`
- Triggers on changes to: NAICS.json, NAICS_Mini.json, build script, index.html
- Uses GitHub Pages for hosting
- Node.js version: 20

## Technical Stack

- **Runtime**: Node.js 20 (built-ins only, no external dependencies)
- **Hosting**: GitHub Pages
- **CI/CD**: GitHub Actions
- **Frontend**: Static HTML (index.html) with vanilla JavaScript

## Code Standards and Conventions

### JavaScript
- Use Node.js built-in modules only (fs, path)
- Follow the existing code style in `scripts/build-api.js`
- Use `const` for immutable values, avoid `var`
- Prefer arrow functions where appropriate
- Keep functions focused and well-documented

### Data Format
- **NAICS codes are strings** (preserve leading zeros, e.g., "09")
- All API endpoints return a consistent envelope format:
  ```json
  {
    "meta": {
      "version": "1.0.0",
      "generated": "2026-02-18T00:00:00.000Z",
      "source": "https://github.com/upholdjd/NAICS",
      "endpoint": "/naics/51.json"
    },
    "data": { ... }
  }
  ```

### File Organization
- Source data files in root: `NAICS.json`, `NAICS_Mini.json`
- Build scripts in `scripts/` directory
- Generated files in `dist/` directory (gitignored)
- GitHub configuration in `.github/` directory

## Building the Project

```bash
# Generate the static API files
node scripts/build-api.js

# Output will be in dist/ directory
```

No dependencies need to be installed - the build script uses only Node.js built-ins.

## Testing

Currently, there is no automated test suite. When making changes:
1. Run the build script and verify it completes without errors
2. Check that the generated JSON files in `dist/` are valid and well-formed
3. Verify the envelope structure matches the expected format
4. Test endpoints locally if possible

## Making Changes

### When modifying the build script:
1. Maintain zero-dependency approach (use only Node.js built-ins)
2. Preserve the envelope structure for all generated endpoints
3. Test locally by running `node scripts/build-api.js`
4. Verify generated files are valid JSON

### When updating data files:
1. Ensure NAICS codes remain strings (preserve leading zeros)
2. Maintain consistent structure with existing records
3. Run the build script to regenerate all endpoints
4. Check that the API version in the build script is updated if needed

### When updating workflows:
1. Maintain Node.js version consistency (currently 20)
2. Preserve the GitHub Pages deployment configuration
3. Keep the build path trigger patterns accurate

## Important Notes

- CORS is enabled by default on GitHub Pages
- All codes must be treated as strings to preserve leading zeros
- The project is designed to be simple and maintainable with zero runtime dependencies
- Generated files (~6,100 JSON files) are not committed to the repository
- Changes to source data files trigger automatic rebuild and deployment

## License

- Data: Public domain
- Code: MIT License
