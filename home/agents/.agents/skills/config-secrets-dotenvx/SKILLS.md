---
name: config-secrets-dotenvx
description: Use when configuring dotenvx, encrypted .env files, multiple environments, CI secrets, GitHub Actions, or Vercel environment variables. Covers this repository's .env.development, .env.test, and .env.production convention and one-time private-key setup.
---
# dotenvx configuration and secrets

Use dotenvx as the single workflow for configuration and secrets. Keep one file per environment:

- `.env.development`
- `.env.test`
- `.env.production`

The above are default options but more environments can be created as needed. Commit these environment files. Plain configuration remains readable; secret values are encrypted in place. 

> **IMPORTANT:** Never commit `.env.keys`, which contains the private decryption keys. Add both `.env.keys` and any unencrypted local override files to `.gitignore`.

## Environment differences

Encode every config difference between environments in the corresponding `.env.*` file. Do not hide environment-specific values in application code, CI YAML, Vercel settings, or ad-hoc shell conditionals. This follows [The Twelve-Factor App](https://12factor.net/config): deploy-specific configuration belongs in the environment, separate from code.

## Create or update an environment file

Use pnpm by default. Install dotenvx as a project dependency, then invoke it with `pnpx`:

```sh
pnpm add -D @dotenvx/dotenvx
```

Encrypt only the named secret key in each environment file. `-k`/`--key` selects the key; without it, `encrypt` encrypts the whole file.

```sh
pnpx dotenvx encrypt -f .env.development -k API_KEY
pnpx dotenvx encrypt -f .env.test -k API_KEY
pnpx dotenvx encrypt -f .env.production -k API_KEY
```

Use the actual secret key name in place of `API_KEY`. Select several matching keys with a glob, for example `-k 'API_*'`. For a new or changed value, `pnpx dotenvx set API_KEY value -f .env.production --encrypt` also encrypts that one key. After encryption, commit the changed `.env.*` file and keep `.env.keys` private. The key names are derived from the file name:

- `.env.development` → `DOTENV_PRIVATE_KEY_DEVELOPMENT`
- `.env.test` → `DOTENV_PRIVATE_KEY_TEST`
- `.env.production` → `DOTENV_PRIVATE_KEY_PRODUCTION`

Run a command with one environment:

```sh
pnpx dotenvx run -f .env.development -- <command>
pnpx dotenvx run -f .env.test -- <command>
pnpx dotenvx run -f .env.production -- <command>
```

Use multiple files only when layering is intentional. The first file wins by default:

```sh
pnpx dotenvx run -f .env.test,.env -- <command>
```

Use `--overload` only when the later file should win. Never use `--debug` in CI or production because it prints secret values.

## Next.js: use `@dotenvx/next-env`

Next.js has special environment loading through `@next/env`. For a Next.js app, prefer `@dotenvx/next-env` over wrapping every Next command with `dotenvx run`: it is a drop-in replacement that decrypts the `.env*` files while Next loads them, so server-side code can continue using `process.env`.

Install both packages and override Next's loader in `package.json`:

```sh
pnpm add @dotenvx/dotenvx @dotenvx/next-env
```

```json
{
  "overrides": {
    "@next/env": "npm:@dotenvx/next-env"
  }
}
```

Encrypt the environment files using the repository convention:

```sh
pnpx dotenvx encrypt -f .env.development -k API_KEY
pnpx dotenvx encrypt -f .env.test -k API_KEY
pnpx dotenvx encrypt -f .env.production -k API_KEY
```

Provide the matching private key in the environment where Next runs:

- `.env.development` → `DOTENV_PRIVATE_KEY_DEVELOPMENT`
- `.env.test` → `DOTENV_PRIVATE_KEY_TEST`
- `.env.production` → `DOTENV_PRIVATE_KEY_PRODUCTION`

The encrypted values are then available through `process.env` in server code and route handlers. Keep browser-exposed values subject to Next's normal `NEXT_PUBLIC_` rules; never make a private secret public by adding that prefix.

If the override does not take effect, remove `node_modules` and the lockfile, then reinstall so the package manager resolves the override:

```sh
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

Use `pnpx dotenvx run -f ... -- next build` as the fallback when the application cannot use the package override or when a non-Next command also needs the environment.

## One-time GitHub Actions setup

Use a GitHub **environment** secret when the workflow targets a deployment environment; use a repository secret for shared CI. The key must match the encrypted file used by the job.

A `test` environment is a good default for integration tests and test deployments: it scopes the key, supports protection rules, and keeps test credentials separate from repository-wide secrets. It is not a replacement for dotenvx file selection: `environment: test` is GitHub Actions metadata, while `-f .env.test` selects the file. Environment secrets are also unavailable to forked pull requests, and protection rules can make CI wait for approval, so use a repository secret when untrusted PRs or approval-free CI are required.

For test/CI using `.env.test` and a GitHub environment named `test`:

```sh
pnpx dotenvx get -f .env.keys DOTENV_PRIVATE_KEY_TEST \
  | gh secret set DOTENV_PRIVATE_KEY_TEST --env test
```

For a repository-wide CI secret instead:

```sh
pnpx dotenvx get -f .env.keys DOTENV_PRIVATE_KEY_TEST \
  | gh secret set DOTENV_PRIVATE_KEY_TEST --repo OWNER/REPO
```

The workflow must select the GitHub environment and pass its secret into the dotenvx command. A complete example:

```yaml
name: test

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    environment: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: pnpm install --global @dotenvx/dotenvx
      - run: pnpx dotenvx run -f .env.test -- pnpm test
        env:
          DOTENV_PRIVATE_KEY_TEST: ${{ secrets.DOTENV_PRIVATE_KEY_TEST }}
```

For forked pull requests, the environment secret will not be available. Do not weaken that boundary; either skip secret-dependent tests for forks or run them only after a trusted event.

Install dotenvx before the test step, for example with `curl -sfS https://dotenvx.sh | sh` or `pnpm install --global @dotenvx/dotenvx`. Do not print the key or write it to a workflow artifact.

## One-time Vercel production setup

From a linked Vercel project, load the production key as a sensitive production variable:

```sh
pnpx dotenvx get -f .env.keys DOTENV_PRIVATE_KEY_PRODUCTION \
  | vercel env add DOTENV_PRIVATE_KEY_PRODUCTION production --sensitive
```

Configure the Vercel build/start command to invoke dotenvx against `.env.production`, for example:

```json
{
  "scripts": {
    "build": "pnpx dotenvx run -f .env.production -- next build",
    "start": "pnpx dotenvx run -f .env.production -- next start"
  }
}
```

Deploy again after adding or changing the variable. Vercel environment-variable changes apply to new deployments, not an already-built deployment.

## Change checklist

1. Put every environment-specific config or secret in the matching `.env.*` file.
2. Encrypt selected secret values with `pnpx dotenvx encrypt -f <file> -k <KEY>`.
3. Confirm `.env.keys` is ignored and never staged.
4. Commit the encrypted `.env.*` diff.
5. Load the matching private key once into GitHub or Vercel using the commands above.
6. Run the target command through `pnpx dotenvx run -f <file> -- ...`.
7. Verify the key name, environment file, and deployment target all match.

## References

- [https://dotenvx.com/docs/quickstart/environments/](https://dotenvx.com/docs/quickstart/environments/)
- [https://dotenvx.com/docs/github-actions/](https://dotenvx.com/docs/github-actions/)
- [https://dotenvx.com/docs/platforms/vercel/](https://dotenvx.com/docs/platforms/vercel/)
- [https://12factor.net/config](https://12factor.net/config)

