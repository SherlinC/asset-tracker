# Technical Architecture: OpenClaw Asset Tracker Skill (Local Privacy Mode)

This document outlines the technical design for the local-first version of the asset-tracker. It focuses on privacy, data portability, and a simplified single-user experience within the OpenClaw skill environment.

## 1. Architecture Principles

- **Local Sovereignty**: All user data stays on the local machine. There's no cloud database or external sync.
- **Stateless Backend**: The server layer acts as a local proxy for data operations and API requests.
- **Data Integrity**: Current holdings are treated as a replaceable state, while historical snapshots are treated as an append-only ledger.
- **Portability**: Users can move their entire state via standardized file formats (Excel and JSON).

## 2. System Layers

### Frontend (React 19)

- **UI Components**: Built with Tailwind CSS v4 and Shadcn UI primitives.
- **State Management**: TanStack Query handles data fetching and caching from the local tRPC API.
- **Routing**: Wouter manages client-side navigation.

### API Layer (tRPC)

- **Procedures**: Exposes methods for managing holdings, fetching prices, and handling imports/exports.
- **Local Context**: Bypasses authentication middleware. It assumes a single "Local User" context for all operations.

### Storage Layer (Drizzle ORM + SQLite)

- **Database**: A local SQLite file serves as the primary data store.
- **Schema**: Optimized for quick lookups of current holdings and efficient storage of time-series history.

### Integration Layer

- **Excel Engine**: Handles parsing and generation of .xlsx files for holdings management.
- **Price Service**: Fetches real-time data from external APIs (CoinGecko, Finnhub) with aggressive local caching to respect rate limits.

## 3. Feature Modules

### Holdings Manager

Manages the `holdings` table. It supports CRUD operations and bulk overwrites from Excel imports.

### History Tracker

A background service or triggered task that captures the total portfolio value and saves it to the `portfolio_value_history` table.

### Data Porter

Handles the logic for "Full Backup" and "Full Restore". It serializes the entire database state into a JSON structure for portability.

## 4. Data Model

### Holdings Table

Stores the current assets owned by the user.

- `id`: Primary Key.
- `symbol`: Asset ticker (e.g., BTC, AAPL).
- `name`: Display name.
- `type`: Category (Crypto, Stock, Currency).
- `quantity`: Amount held.
- `cost_basis`: Original purchase price.
- `currency`: Base currency (USD/CNY).

### Portfolio Value History Table

Stores snapshots for line charts.

- `id`: Primary Key.
- `timestamp`: Date of the snapshot.
- `total_value`: Aggregate value in the primary currency.
- `asset_breakdown`: JSON blob storing the value per asset type at that time.

## 5. Key Data Flows

### Excel Import (Overwrite)

1. User uploads an Excel file.
2. The Excel Engine parses the rows into a standardized JSON format.
3. The Holdings Manager clears the existing `holdings` table.
4. The parsed data is inserted into the `holdings` table.
5. The UI triggers a refetch of the portfolio summary.

### Historical Snapshotting

1. A snapshot is triggered (either daily or on significant data changes).
2. The Price Service fetches current prices for all holdings.
3. The system calculates the total portfolio value.
4. A new record is appended to the `portfolio_value_history` table.

## 6. Chart Snapshot Strategy

To ensure line charts remain continuous even after an Excel import, the history table is decoupled from the holdings table.

- **Persistence**: Imports do not touch the history table.
- **Granularity**: Snapshots are taken once per day or manually when the user requests a "Save Point".
- **Cleanup**: Users can manually prune old history records if the file size grows too large.

## 7. Local Storage Strategy

The skill uses a local SQLite database file. This file is stored within the OpenClaw skill's persistent storage directory.

- **No Browser Cache Dependency**: Unlike `localStorage`, the SQLite file is more resilient to browser cache clearing.
- **Direct Access**: The backend server has direct file system access to the database.

## 8. Security Boundaries

- **No Network Inbound**: The local server does not accept connections from outside the local machine.
- **API Key Safety**: If users provide their own API keys, they are stored in the local database, never transmitted to a central server.
- **Sanitization**: All Excel imports are validated and sanitized to prevent injection attacks.

## 9. Error Handling

- **Validation Failures**: Excel imports provide a detailed report of skipped or malformed rows.
- **API Failures**: If a price cannot be fetched, the system uses the last known cached price and displays a "Stale Data" warning.
- **Database Corruption**: The "Full Restore" feature acts as the primary recovery mechanism for a corrupted local state.

## 10. Extensibility

- **New Asset Types**: The schema uses a generic `type` field, making it easy to add support for real estate, commodities, or custom assets.
- **Plugin Support**: The architecture allows for future "Price Adapters" to support additional data sources.

## 11. MVP Technical Scope

- **Database**: SQLite with Drizzle.
- **API**: tRPC with no-auth mode.
- **Excel**: `xlsx` library for parsing and generation.
- **Charts**: Recharts for allocation and history visualization.
- **Deployment**: Packaged as an OpenClaw skill manifest with a local runtime.
