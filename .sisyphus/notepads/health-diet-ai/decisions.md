# Decisions

- Use Vitest as the workspace test runner with a lightweight root config and per-package test scripts.
- Tests include minimal runtime checks for shared mocks and a small health-endpoint integration example for the server.
- Keep changes minimal to avoid affecting existing build/test flows; do not modify the plan file as per guidelines.
