# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Vue 3 + TypeScript single-page application for fetching and visualizing Chinese stock market data from multiple exchanges (SSE, SZSE). The project features a modular architecture with modern tooling and supports real-time data fetching, caching, and historical data management.

## Technology Stack

- **Frontend:** Vue 3 (Composition API) with TypeScript
- **Build Tool:** Vite 5.2.0 with custom plugins
- **UI Components:** Element Plus 2.8.0 (Chinese UI library)
- **State Management:** Pinia 2.2.0
- **Routing:** Vue Router 4.4.0
- **HTTP Client:** Axios 1.13.1
- **Date Handling:** Day.js 1.11.19, Moment.js 2.30.1
- **Styling:** SCSS with CSS variables
- **Auto-imports:** Unplugin-auto-import and Unplugin-vue-components

## Development Commands

```bash
# Development
npm run dev              # Start development server on port 3000

# Build
npm run build            # Production build with TypeScript compilation
npm run preview          # Preview production build locally

# Data Generation
npm run generate:data:today     # Generate today's data for all sources
npm run generate:sse:today      # Generate SSE data for today
npm run generate:szse:today     # Generate SZSE data for today
npm run generate:data:date YYYY-MM-DD  # Generate data for specific date
npm run generate:sse YYYY-MM-DD        # Generate SSE data for specific date
npm run generate:data              # Generate all historical data

# Development Tools
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript type checking
```

## Architecture Overview

### Dual Architecture Pattern

The codebase features a **dual architecture** approach:

1. **Modern Module Architecture** (`src/modules/stock-data/`): New modular, scalable approach
2. **Legacy Architecture** (`src/services/dataService.ts`): Maintains backward compatibility

### Modern Module Structure

`src/modules/stock-data/` follows a layered architecture:

```
stock-data/
├── index.ts              # Main module API surface
├── types/                # TypeScript definitions
├── config/               # Configuration management
├── services/             # Core business logic (Data, Cache, API)
├── sources/              # Data source implementations (SSE, SZSE, EastMoney)
└── utils/                # Utility functions
```

**Key Services:**
- `StockDataService`: Main service orchestrating data operations
- `CacheService`: Multi-level caching (memory + file system)
- `ApiService`: HTTP client with interceptors and error handling
- Data Sources: Pluggable implementations for each exchange

### Application Structure

```
src/
├── main.ts               # App entry point with plugin registration
├── App.vue              # Root component with router-view
├── router/              # Vue Router configuration
├── layouts/             # Layout components (DefaultLayout)
├── views/               # Page components (DataView)
├── components/          # Reusable UI components
├── stores/              # Pinia state management
├── services/            # Legacy service layer
└── modules/             # Modern modular architecture
```

## State Management

### Pinia Store (`useDataStore`)

Centralized state management for:
- **Loading States**: Per data type (SSE, SZSE, LIMIT_UP, LIMIT_DOWN, INDICES)
- **Cached Data**: 30-minute TTL with timestamp validation
- **Computed Properties**: Statistics, filters, search results
- **Data Generation**: Status tracking for generation processes

**Store Structure:**
```typescript
{
  // State
  data: Record<string, any[]>
  loading: Record<string, boolean>
  lastUpdated: Record<string, string>

  // Getters
  groupedData, statistics, searchResults, filteredData

  // Actions
  fetchData, refreshData, generateData, searchData
}
```

## Data Flow

```
UI Components → Pinia Store → Service Layer → Data Sources → External APIs
     ↓                ↓              ↓           ↓              ↓
  User Actions → State Updates → Cache Management → Fallback Logic → Error Handling
```

### Data Sources Strategy

1. **Primary Sources**: SSE (Shanghai), SZSE (Shenzhen) exchanges
2. **Fallback Source**: EastMoney when primary sources fail
3. **Cache Strategy**: Memory → File system → Network
4. **TTL Management**: 30-minute expiration with auto-refresh

## Special Build Configuration

### Custom Vite Plugins

The project uses advanced Vite configuration with custom middleware:

1. **Data Middleware**: Serves JSON data files from `/data` endpoint
2. **File Fallback**: Auto-fallback to latest available data when date unavailable
3. **Data Copy Plugin**: Automatically copies data files during build
4. **Auto-imports**: Vue, Vue Router, and Pinia auto-imported
5. **Component Registration**: Element Plus components auto-imported

### Path Aliases

```typescript
'@/': './src/',
'@/components/': './src/components/',
'@/stores/': './src/stores/',
'@/modules/': './src/modules/'
```

## Development Patterns

### Working with Data Sources

When adding new data sources or modifying existing ones:

1. Implement the `IDataSource` interface in `src/modules/stock-data/sources/`
2. Register the source in `DataSourceManager`
3. Add configuration in `src/modules/stock-data/config/`
4. Update TypeScript types in `src/modules/stock-data/types/`

### Adding New Components

1. Use Composition API with `<script setup>` syntax
2. Leverage auto-imports for Vue, Element Plus components
3. Follow the existing component patterns in `src/components/`
4. Use Pinia store for state management

### API Integration

For API calls and data fetching:
- Use `StockDataService` from `src/modules/stock-data/`
- Leverage the caching system for performance
- Handle errors through the unified error classification system
- Use the existing data source fallback mechanisms

## Key Files to Understand

- **`src/main.ts`**: Application bootstrap and plugin registration
- **`src/stores/dataStore.ts`**: Central state management
- **`src/modules/stock-data/index.ts`**: Modern module API entry point
- **`src/modules/stock-data/services/StockDataService.ts`**: Core data service
- **`vite.config.ts`**: Advanced build configuration
- **`src/services/dataService.ts`**: Legacy compatibility layer

## Data Management

The application manages multiple data types:
- **SSE**: Shanghai Stock Exchange equities
- **SZSE**: Shenzhen Stock Exchange equities
- **LIMIT_UP**: Daily limit-up stocks
- **LIMIT_DOWN**: Daily limit-down stocks
- **INDICES**: Market indices data

Each data type has its own caching, loading state, and generation process managed through the Pinia store.