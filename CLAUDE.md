# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a minimal JavaScript project for fetching Shanghai Stock Exchange (SSE) equity data. The project consists of a single JavaScript file that provides a URL endpoint for accessing stock market data from the SSE API.

## File Structure

- `a.js` - Main JavaScript file containing the SSE API endpoint URL

## Technology Stack

- **JavaScript** - No build system or package manager configured
- **SSE API** - Shanghai Stock Exchange data service

## Key Components

### SSE API Endpoint

The project uses the Shanghai Stock Exchange API at:
```
https://yunhq.sse.com.cn:32042/v1/sh1/list/exchange/equity
```

**API Parameters:**
- `callback=jsonpCallback3485725` - JSONP callback function name
- `select=code,name,open,high,low,last,prev_close,chg_rate,volume,amount,tradephase,change,amp_rate,cpxxsubtype,cpxxprodusta` - Fields to retrieve
- `order=` - Sorting parameter (empty)
- `begin=0&end=9999` - Data range (0 to 9999 records)
- `_=1762150657566` - Timestamp parameter

**Data Fields Available:**
- `code` - Stock code
- `name` - Stock name
- `open` - Opening price
- `high` - Highest price
- `low` - Lowest price
- `last` - Last price
- `prev_close` - Previous closing price
- `chg_rate` - Change rate
- `volume` - Trading volume
- `amount` - Trading amount
- `tradephase` - Trading phase
- `change` - Price change
- `amp_rate` - Amplitude rate
- `cpxxsubtype` - Subtype
- `cpxxprodusta` - Product status

## Development Environment

**Running the code:**
Since this is a single JavaScript file, you can execute it using Node.js or include it in a web page with HTML script tags.

```bash
# If you have Node.js installed
node a.js
```

**For web usage:**
Include the URL in a fetch call or JSONP implementation in your HTML/JavaScript code.

## Future Development Recommendations

This project could benefit from:
- Adding proper package.json for dependency management
- Implementing data parsing and error handling
- Adding TypeScript support for better type safety
- Creating modular functions for API interaction
- Adding configuration management for API parameters
- Implementing data validation and transformation utilities