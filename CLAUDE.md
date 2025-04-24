# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- `npm run dev` - Start development server
- `npm run deploy` - Deploy to Cloudflare Workers
- `npm run cf-typegen` - Generate TypeScript types for Cloudflare bindings

## Code Style Guidelines
- **Formatting**: 2-space indentation, semicolons, double quotes
- **Imports**: Group imports at top of file, starting with framework imports
- **Types**: 
  - Use TypeScript with strict mode
  - Use generics for Hono app: `new Hono<{ Bindings: CloudflareBindings }>()`
  - Use explicit return types for functions
- **Naming**: 
  - camelCase for variables, functions, methods
  - PascalCase for types, interfaces, classes
- **Documentation**: Use JSDoc-style comments for exported functions
- **Error Handling**: Use try/catch for async operations
- **Framework**: Cloudflare Workers with Hono, following their best practices