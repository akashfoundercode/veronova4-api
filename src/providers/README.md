# Game providers

Create one kebab-case directory per upstream game API after its documentation
and authentication requirements are known. Each adapter owns its HTTP client,
provider-specific request/response types, mapping, and error translation.

Register adapters by stable game key in `providerRegistry.js`. Keep credentials
in runtime environment/secret-manager configuration, never in source control.
Add mocked contract tests for every adapter operation. Do not add guessed
endpoints or pretend an unconfigured integration succeeded.
