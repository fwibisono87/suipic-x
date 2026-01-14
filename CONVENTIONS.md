1. Always use Typescript! Never use any, strict typing only!
2. Use `const` by default.
3. Use `type` instead of `interface`.
4. Always create enums for constants.
5. types should begin with `T`, i.e. `TUser`.
6. enums should begin with `E`, i.e. `EUserType`.
7. true constants (that never change) should be in `SCREAMING_SNAKE_CASE`, i.e. `MAX_USERS`.

# Backend-specific Conventions

1. All functions and API endpoints must have corresponding tests.
2. Use `Bun.test` for testing.
3. Follow the Arrange-Act-Assert (AAA) pattern for test structure.

# Frontend-specific Conventions

1. For data fetching and mutations, use Tanstack Query.
2. If anything might be long-running, add loading states.
3. If something is used commonnly (i.e. dialog, toast, etc), create a component and a composable.
4. Only create custom components if DaisyUI does not have one for the purpose.
5. Use mutation and fetch keys for efficent data.
6. All actual http calls should be put under /services, which are called by /composables, containing Tanstack queries/mutations, which are then called by /pages.

# Deployment
1. Docker and compose should always be first-class
2. We should always create our own network, our own object storage, db, auth, and so on, and not rely on existing containers
3. Remember to put data in gitignore

