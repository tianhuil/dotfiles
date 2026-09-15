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

Install dotenvx using the repository's package manager when one exists; otherwise use the official installer or `npm install -g @dotenvx/dotenvx`.

```sh
dotenvx encrypt -f .env.development
dotenvx encrypt -f .env.test
dotenvx encrypt -f .env.production
```

Encryption is idempotent for already-encrypted values. After encryption, commit the changed `.env.*` file and keep `.env.keys` private. The key names are derived from the file name:

- `.env.development` → `DOTENV_PRIVATE_KEY_DEVELOPMENT`
- `.env.test` → `DOTENV_PRIVATE_KEY_TEST`
- `.env.production` → `DOTENV_PRIVATE_KEY_PRODUCTION`

Run a command with one environment:

```sh
dotenvx run -f .env.development -- <command>
dotenvx run -f .env.test -- <command>
dotenvx run -f .env.production -- <command>
```

Use multiple files only when layering is intentional. The first file wins by default:

```sh
dotenvx run -f .env.test,.env -- <command>
```

Use `--overload` only when the later file should win. Never use `--debug` in CI or production because it prints secret values.

## One-time GitHub Actions setup

Use a GitHub **environment** secret when the workflow targets a deployment environment; use a repository secret for shared CI. The key must match the encrypted file used by the job.

For test/CI using `.env.test` and a GitHub environment named `test`:

```sh
dotenvx get -f .env.keys DOTENV_PRIVATE_KEY_TEST \
  | gh secret set DOTENV_PRIVATE_KEY_TEST --env test
```

For a repository-wide CI secret instead:

```sh
dotenvx get -f .env.keys DOTENV_PRIVATE_KEY_TEST \
  | gh secret set DOTENV_PRIVATE_KEY_TEST --repo OWNER/REPO
```

The workflow must pass the secret into the dotenvx command:

```yaml
- run: dotenvx run -f .env.test -- npm test
  env:
    DOTENV_PRIVATE_KEY_TEST: ${{ secrets.DOTENV_PRIVATE_KEY_TEST }}
```

Install dotenvx before that step, for example with `curl -sfS https://dotenvx.sh | sh` or the project's package manager. Do not print the key or write it to a workflow artifact.

## One-time Vercel production setup

From a linked Vercel project, load the production key as a sensitive production variable:

```sh
dotenvx get -f .env.keys DOTENV_PRIVATE_KEY_PRODUCTION \
  | vercel env add DOTENV_PRIVATE_KEY_PRODUCTION production --sensitive
```

Configure the Vercel build/start command to invoke dotenvx against `.env.production`, for example:

```json
{
  "scripts": {
    "build": "dotenvx run -f .env.production -- next build",
    "start": "dotenvx run -f .env.production -- next start"
  }
}
```

Deploy again after adding or changing the variable. Vercel environment-variable changes apply to new deployments, not an already-built deployment.

## Change checklist

1. Put every environment-specific config or secret in the matching `.env.*` file.
2. Encrypt secret values with `dotenvx encrypt -f <file>`.
3. Confirm `.env.keys` is ignored and never staged.
4. Commit the encrypted `.env.*` diff.
5. Load the matching private key once into GitHub or Vercel using the commands above.
6. Run the target command through `dotenvx run -f <file> -- ...`.
7. Verify the key name, environment file, and deployment target all match.

## References

- [https://dotenvx.com/docs/quickstart/environments/](https://dotenvx.com/docs/quickstart/environments/)
- [https://dotenvx.com/docs/github-actions/](https://dotenvx.com/docs/github-actions/)
- [https://dotenvx.com/docs/platforms/vercel/](https://dotenvx.com/docs/platforms/vercel/)
- [https://12factor.net/config](https://12factor.net/config)

