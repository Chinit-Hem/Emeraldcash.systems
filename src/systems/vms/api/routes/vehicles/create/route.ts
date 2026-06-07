/**
 * Compatibility endpoint for POST /api/vehicles/create.
 *
 * Keep vehicle creation logic in the canonical POST /api/vehicles handler so
 * validation, audit logging, image normalization, and cache invalidation stay
 * in one place.
 */
export { OPTIONS, POST } from "../route";
