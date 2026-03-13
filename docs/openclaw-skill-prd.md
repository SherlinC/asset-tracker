# Product Requirements Document: OpenClaw Asset Tracker Skill (Local Privacy Mode)

## 1. Background
The OpenClaw Asset Tracker Skill is a local-first, privacy-focused version of the asset-tracker application. It is designed to run as a standalone skill within the OpenClaw environment, prioritizing user data sovereignty and simplicity. Unlike the cloud-based version, this skill operates entirely on the user's local machine, requiring no accounts or external data synchronization.

## 2. Goals
- **Privacy First**: Ensure all financial data remains local to the user's machine.
- **Zero Friction**: No account creation or login required.
- **Data Portability**: Provide robust import/export and backup/restore capabilities.
- **Visual Insights**: Maintain high-quality dashboard visualizations for portfolio analysis.
- **Excel-Centric Workflow**: Support users who prefer managing their primary data in spreadsheets.

## 3. Non-Goals
- Cloud synchronization or multi-device handoff.
- Social features or public portfolio sharing.
- Direct brokerage API integrations (e.g., Plaid).
- Support for non-OpenClaw environments.

## 4. Target Users
- **Privacy Advocates**: Users who refuse to upload their financial data to cloud services.
- **Excel Power Users**: Investors who maintain their "source of truth" in spreadsheets but want a better UI for visualization.
- **OpenClaw Enthusiasts**: Users looking for high-quality, local-first utility skills.

## 5. User Scenarios
- **The Spreadsheet Migrator**: A user with a complex Excel sheet wants to see their portfolio allocation and history visually. They download the template, paste their data, and import it into the skill.
- **The Privacy-Conscious HODLer**: A user wants to track their crypto and stock holdings without any third party knowing their net worth.
- **The Safe Keeper**: A user wants to move their data between different OpenClaw instances using the full backup/restore feature.

## 6. Feature Scope

### 6.1 Dashboard & Visualization
- **Portfolio Summary**: Total value, 24h change, and currency toggle (USD/CNY).
- **Asset Allocation**: Pie chart showing distribution by asset type (Crypto, Stock, Currency).
- **Performance Trend**: Line chart showing historical portfolio value over time.

### 6.2 Holdings Management
- **Manual Entry**: Add, edit, and delete individual holdings via UI forms.
- **Real-time Prices**: Automatic price fetching for supported assets (Stocks, Crypto, Forex) using local API calls.

### 6.3 Excel Integration
- **Template Download**: Provide a standardized .xlsx template for data entry.
- **Overwrite Import**: Import holdings from Excel. This action replaces all current holdings but preserves historical snapshots.
- **Data Export**: Export current holdings to an Excel file for external editing.

### 6.4 Data Portability & Privacy
- **Full Local Backup**: Export a single file containing all holdings and historical data.
- **Full Restore**: Wipe current state and restore everything from a backup file.
- **Local-Only Storage**: Use a local database (e.g., SQLite) with no external telemetry.

## 7. Workflows

### 7.1 Excel Import Workflow
1. User clicks "Import Excel".
2. System displays a warning: "This will overwrite all current holdings. Historical charts will be preserved."
3. User selects the file.
4. System validates the file format and data.
5. System replaces the `holdings` table content.
6. Dashboard refreshes with new data.

### 7.2 Backup & Restore Workflow
- **Backup**: User triggers "Full Backup" -> System bundles DB state into a JSON/ZIP file -> Browser triggers download.
- **Restore**: User triggers "Restore" -> User uploads backup file -> System clears current DB -> System populates DB from backup -> App reloads.

## 8. Product Rules
- **Import = Overwrite**: Excel imports are destructive to the *current* holdings list to ensure consistency with the spreadsheet.
- **History is Sacred**: The `portfolio_value_history` table is never cleared by an Excel import. It only grows as new snapshots are taken.
- **No Account Concept**: The `users` table is either removed or contains a single "Local User" record. Authentication logic is bypassed or removed.

## 9. Copy & UX Suggestions
- **Privacy Banner**: "Local Privacy Mode Active. Your data stays on this machine."
- **Import Warning**: "Importing will replace your current holdings list. We recommend taking a backup first."
- **Empty State**: "Your portfolio is empty. Start by adding a holding or importing an Excel file."

## 10. Risks & Mitigations
- **Risk**: User loses data due to hardware failure or browser cache clearing.
  - **Mitigation**: Prominent "Backup" button and periodic reminders to export data.
- **Risk**: API rate limits for price fetching.
  - **Mitigation**: Implement aggressive local caching and allow users to provide their own API keys if needed.

## 11. MVP Scope
- Functional dashboard with summary, pie chart, and history chart.
- Excel Template Download, Import (Overwrite), and Export.
- Manual Add/Edit/Delete for holdings.
- Basic Full Backup/Restore (JSON format).
- Real-time price fetching for BTC, ETH, and major US stocks.
