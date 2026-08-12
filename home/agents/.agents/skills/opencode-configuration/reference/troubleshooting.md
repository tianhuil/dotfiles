# Troubleshooting OpenCode Configuration

Common issues and solutions for OpenCode configuration problems.

## Configuration Not Loading

### Symptoms

- Config settings not applied
- Default values being used
- `/config` shows unexpected values

### Solutions

1. **Verify file location**
   ```bash
   # Check global config
   cat ~/.config/opencode/opencode.json

   # Check project config
   cat opencode.json
   ```

2. **Validate JSON syntax**
   ```bash
   # Use a JSON validator
   python3 -m json.tool ~/.config/opencode/opencode.json
   ```

3. **Check schema reference**
   - Ensure `$schema` is: `https://opencode.ai/config.json`
   - Use an editor with JSON schema support

4. **Verify file permissions**
   ```bash
   chmod 644 ~/.config/opencode/opencode.json
   chmod 644 opencode.json
   ```

5. **Check config precedence**
   - Remember configs are merged, not replaced
   - Later configs override earlier ones
   - Run `/config` to see merged result

6. **Enable debug logging**
   ```bash
   export DEBUG=opencode:*
   opencode
   ```

## Provider Not Working

### Symptoms

- `/models` shows no models for provider
- API errors when calling models
- "Provider not found" errors

### Solutions

1. **Verify credentials**
   ```bash
   # List stored credentials
   opencode auth list

   # Remove and re-add if needed
   opencode auth remove <provider>
   ```

2. **Check environment variables**
   ```bash
   # Verify variables are set
   echo $ANTHROPIC_API_KEY
   echo $OPENAI_API_KEY

   # Check in current shell
   env | grep -i api
   ```

3. **Test API key**
   ```bash
   # Test with curl (example: Anthropic)
   curl https://api.anthropic.com/v1/messages \
     -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "content-type: application/json" \
     -d '{
       "model": "claude-sonnet-4-5",
       "max_tokens": 1024,
       "messages": [{"role": "user", "content": "Hi"}]
     }'
   ```

4. **Verify provider ID matches**
   - Ensure provider ID in `/connect` matches config
   - Check for typos in provider names
   - Use exact provider name from docs

5. **Check custom provider config**
   - Verify `npm` package is correct
   - Check `baseURL` is accessible
   - Ensure models are defined in `models` section

6. **Check provider filtering**
   ```bash
   # Check if provider is disabled
   cat opencode.json | grep disabled_providers

   # Check if provider is in allowlist
   cat opencode.json | grep enabled_providers
   ```

   Note: `disabled_providers` takes priority over `enabled_providers`

7. **Verify network connectivity**
   ```bash
   # Test endpoint connectivity
   curl -I https://api.anthropic.com
   curl -I https://api.openai.com
   ```

## Skills Not Showing

### Symptoms

- Skill not listed in `/skill` tool
- Agent can't find skill by name
- "Skill not found" errors

### Solutions

1. **Verify file structure**
   ```bash
   # Check SKILL.md exists and is capitalized
   ls -la .opencode/skills/<name>/
   ls -la ~/.config/opencode/skills/<name>/

   # Must be SKILL.md (all caps)
   ```

2. **Check frontmatter**
   ```bash
   # View first 10 lines
   head -10 .opencode/skills/<name>/SKILL.md

   # Must include:
   # - name: (required)
   # - description: (required, 1-1024 chars)
   ```

3. **Validate skill name**
   - Must match directory name exactly
   - Regex: `^[a-z0-9]+(-[a-z0-9]+)*$`
   - 1-64 characters
   - Lowercase with single hyphens
   - Can't start or end with `-`

4. **Check for duplicate names**
   ```bash
   # Find all skill directories
   find .opencode ~/.config/opencode -type d -name skills -exec find {} -name SKILL.md \;

   # Extract skill names
   grep -h "^name:" .opencode/skills/*/SKILL.md ~/.config/opencode/skills/*/SKILL.md
   ```

5. **Verify permissions**
   ```bash
   # Check opencode.json for skill permissions
   cat opencode.json | grep -A5 '"permission"' | grep -A5 '"skill"'

   # Common patterns:
   # - "allow" - skill loads immediately
   # - "deny" - skill hidden from agent
   # - "ask" - prompt user before loading
   ```

6. **Restart OpenCode**
   ```bash
   # Exit and restart to reload skills
   # Press Ctrl+C to exit, then run:
   opencode
   ```

7. **Check skill discovery path**
   ```bash
   # OpenCode searches these locations:
   # - .opencode/skills/<name>/SKILL.md
   # - ~/.config/opencode/skills/<name>/SKILL.md
   # - .claude/skills/<name>/SKILL.md
   # - ~/.claude/skills/<name>/SKILL.md
   # - .agents/skills/<name>/SKILL.md
   # - ~/.agents/skills/<name>/SKILL.md
   ```

## Models Not Available

### Symptoms

- `/models` shows empty or missing models
- "Model not found" errors
- Only default models available

### Solutions

1. **Verify provider credentials**
   - Run `opencode auth list`
   - Ensure provider has API key configured
   - Test credentials with provider's API directly

2. **Check model name spelling**
   - Use exact model name from provider
   - Run `/models` to see available models
   - Model names are case-sensitive

3. **Verify provider config**
   ```bash
   # Check provider section in config
   cat opencode.json | grep -A10 '"provider"'

   # Ensure provider is not in disabled_providers
   ```

4. **For custom providers: define models**
   ```json
   {
     "provider": {
       "myprovider": {
         "npm": "@ai-sdk/openai-compatible",
         "models": {
           "my-model": {
             "name": "My Model Display Name"
           }
         }
       }
     }
   }
   ```

5. **Check model access**
   - Verify you have access to the model (e.g., paid tier)
   - Check provider console for model availability
   - Some models require approval (e.g., Anthropic, Azure)

6. **Clear cache**
   ```bash
   # Remove OpenCode cache
   rm -rf ~/.local/share/opencode/cache

   # Restart OpenCode
   opencode
   ```

## Commands Not Working

### Symptoms

- Custom command not found
- Command executes but produces errors
- Template variables not replaced

### Solutions

1. **Verify command structure**
   ```json
   {
     "command": {
       "my-cmd": {
         "template": "Run tests for $ARGUMENTS",
         "description": "Test command",
         "agent": "build",
         "model": "anthropic/claude-sonnet-4-5"
       }
     }
   }
   ```

2. **Check template variables**
   - `$ARGUMENTS` is replaced with user input
   - Use single quotes to prevent shell expansion
   - Test template manually before adding to config

3. **Verify agent exists**
   - Agent must be built-in or defined in config
   - Check spelling of agent name
   - Use `/agents` to see available agents

4. **Test command execution**
   ```
   /my-cmd some-arguments
   ```

## Agents Not Available

### Symptoms

- Custom agent not listed
- Agent can't be selected
- "Agent not found" errors

### Solutions

1. **Verify agent structure**
   ```json
   {
     "agent": {
       "my-agent": {
         "description": "Agent description",
         "model": "anthropic/claude-sonnet-4-5",
         "prompt": "You are...",
         "tools": {
           "write": true,
           "edit": true
         }
       }
     }
   }
   ```

2. **Check required fields**
   - `description` - required
   - `model` - required (unless inherited)
   - `prompt` - optional but recommended
   - `tools` - optional

3. **Test agent**
   ```
   /agent my-agent
   ```

## Permission Issues

### Symptoms

- Tools asking for approval unexpectedly
- Can't execute certain commands
- "Permission denied" errors

### Solutions

1. **Check permission config**
   ```bash
   cat opencode.json | grep -A20 '"permission"'
   ```

2. **Verify tool names**
   - Common tools: `write`, `read`, `edit`, `bash`, `skill`
   - Exact tool names required
   - Case-sensitive

3. **Check skill permissions**
   ```json
   {
     "permission": {
       "skill": {
         "*": "allow",
         "internal-*": "deny"
       }
     }
   }
   ```

4. **Per-agent permissions**
   ```json
   {
     "agent": {
       "plan": {
         "permission": {
           "bash": "deny"
         }
       }
     }
   }
   ```

## View Loaded Configuration

### Check merged config in TUI

Run `/config` to see the final merged configuration from all sources.

### Check config sources

```bash
# List all config file locations
echo "Global: ~/.config/opencode/opencode.json"
echo "Project: $(pwd)/opencode.json"
echo "Custom: $OPENCODE_CONFIG"
echo "Remote: .well-known/opencode"
```

### Debug environment variables

```bash
# Show all OpenCode-related env vars
env | grep -i opencode

# Show API keys
env | grep -i api_key
env | grep -i anthropic
env | grep -i openai
```

## Common Error Messages

### "Failed to parse config"

- JSON syntax error
- Missing comma or bracket
- Use a JSON validator

### "Provider not found"

- Provider ID doesn't match
- Provider not in `/connect` list
- Check for typos

### "Invalid skill name"

- Name doesn't match regex
- Capital letters or special chars
- Check skill naming rules

### "Model not available"

- Model access issue
- Provider not configured
- Model name misspelled

### "Permission denied"

- Tool requires approval
- Permission set to "ask" or "deny"
- Check permission config

## Get Help

### Documentation

- [Config docs](https://opencode.ai/docs/config)
- [Providers docs](https://opencode.ai/docs/providers)
- [Troubleshooting](https://opencode.ai/docs/troubleshooting)

### Community

- [Discord](https://opencode.ai/discord)
- [GitHub Issues](https://github.com/anomalyco/opencode/issues)

### Debug Mode

```bash
export DEBUG=opencode:*
opencode
```

This enables verbose logging to help diagnose issues.
