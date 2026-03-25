/**
 * DEPRECATED - This script is no longer needed
 * 
 * This utility was used for manual testing of PostgreSQL connections
 * before proper database configuration was centralized.
 * 
 * With the modular monolith bootstrap refactoring:
 * - Database configuration is now centralized in src/infrastructure/database/
 * - Connection pooling is properly managed through the bootstrap layer
 * - Use `npm run dev` to start the application with proper DB initialization
 * - Check logs from the application for connection status
 * 
 * For database verification:
 * 1. Ensure DATABASE env variables are set correctly
 * 2. Run: npm run dev
 * 3. Check the application logs for "Database connection pool closed"
 * 
 * Archive this file for historical reference only.
 */

// ARCHIVED - REMOVE IN NEXT CLEANUP

