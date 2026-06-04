# Systems

This folder is the product-module boundary for the platform.

Each system owns its feature code:

- `auth/` - authentication routes and screens.
- `lms/` - learning management features.
- `sms/` - stock / asset management features.
- `vms/` - vehicle management features.

Inside a system, use the same local structure where it applies:

- `api/` for route handlers, repositories, and external API adapters.
- `components/` for UI owned by that system.
- `hooks/` for system-specific React hooks.
- `services/` for business workflows and data operations.
- `types/` for system-specific TypeScript types and schemas.
- `utils/` for small pure helpers.
- `views/` for Next.js page-level route implementations.

Cross-system code should live outside this folder, usually in `src/shared` for UI and layout utilities or `src/lib` for infrastructure-level code.
