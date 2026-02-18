# Provider Configuration Examples

Detailed examples for configuring various LLM providers in OpenCode.

## Amazon Bedrock

### Environment Variables

```bash
# Quick start - Access keys
AWS_ACCESS_KEY_ID=XXX AWS_SECRET_ACCESS_KEY=YYY opencode

# Named profile
AWS_PROFILE=my-profile opencode

# Bearer token
AWS_BEARER_TOKEN_BEDROCK=XXX opencode
```

### Config File

```json
{
  "provider": {
    "amazon-bedrock": {
      "options": {
        "region": "us-east-1",
        "profile": "my-aws-profile"
      }
    }
  }
}
```

### VPC Endpoints

```json
{
  "provider": {
    "amazon-bedrock": {
      "options": {
        "region": "us-east-1",
        "profile": "production",
        "endpoint": "https://bedrock-runtime.us-east-1.vpce-xxxxx.amazonaws.com"
      }
    }
  }
}
```

### Custom Inference Profiles

```json
{
  "provider": {
    "amazon-bedrock": {
      "models": {
        "anthropic-claude-sonnet-4.5": {
          "id": "arn:aws:bedrock:us-east-1:xxx:application-inference-profile/yyy"
        }
      }
    }
  }
}
```

## Azure OpenAI

### Environment Variables

```bash
AZURE_RESOURCE_NAME=your-resource opencode
```

### Config File

```json
{
  "provider": {
    "azure-openai": {
      "options": {
        "resourceName": "your-resource",
        "apiKey": "{env:AZURE_OPENAI_API_KEY}"
      }
    }
  }
}
```

## Google Vertex AI

### Environment Variables

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json GOOGLE_CLOUD_PROJECT=your-project-id VERTEX_LOCATION=global opencode
```

### Bash Profile

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
export GOOGLE_CLOUD_PROJECT=your-project-id
export VERTEX_LOCATION=global
```

## Anthropic

### Using /connect

1. Run `/connect`
2. Select "Claude Pro/Max" for browser auth
3. Or select "Create an API Key" to generate one

### Config File

```json
{
  "provider": {
    "anthropic": {
      "options": {
        "apiKey": "{env:ANTHROPIC_API_KEY}",
        "timeout": 600000,
        "setCacheKey": true
      }
    }
  }
}
```

## OpenAI

### Using /connect

1. Run `/connect`
2. Select "ChatGPT Plus/Pro" for browser auth
3. Or select "Manually enter API Key"

### Config File

```json
{
  "provider": {
    "openai": {
      "options": {
        "apiKey": "{env:OPENAI_API_KEY}",
        "baseURL": "https://api.openai.com/v1"
      }
    }
  }
}
```

## OpenCode Zen

### Using /connect

1. Run `/connect`
2. Select "OpenCode Zen"
3. Go to [opencode.ai/auth](https://opencode.ai/auth)
4. Sign in and copy API key

### Run /models

```
/models
```

Shows recommended models from the OpenCode team.

## Custom OpenAI-Compatible Provider

### Step 1: Add Credentials

Run `/connect`, select "Other", and enter:
- Provider ID: `myprovider`
- API Key: `your-api-key`

### Step 2: Configure in opencode.json

```json
{
  "provider": {
    "myprovider": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "My AI Provider",
      "options": {
        "baseURL": "https://api.myprovider.com/v1",
        "apiKey": "{env:MY_PROVIDER_API_KEY}",
        "headers": {
          "Authorization": "Bearer custom-token"
        }
      },
      "models": {
        "my-model-name": {
          "name": "My Model Display Name",
          "limit": {
            "context": 200000,
            "output": 65536
          }
        }
      }
    }
  }
}
```

## Local Models

### Ollama

```json
{
  "provider": {
    "ollama": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Ollama (local)",
      "options": {
        "baseURL": "http://localhost:11434/v1"
      },
      "models": {
        "llama2": {
          "name": "Llama 2"
        }
      }
    }
  }
}
```

**Tip**: If tool calls aren't working, increase `num_ctx` in Ollama (start around 16k-32k).

### LM Studio

```json
{
  "provider": {
    "lmstudio": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "LM Studio (local)",
      "options": {
        "baseURL": "http://127.0.0.1:1234/v1"
      },
      "models": {
        "google/gemma-3n-e4b": {
          "name": "Gemma 3n-e4b (local)"
        }
      }
    }
  }
}
```

### llama.cpp

```json
{
  "provider": {
    "llama.cpp": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "llama-server (local)",
      "options": {
        "baseURL": "http://127.0.0.1:8080/v1"
      },
      "models": {
        "qwen3-coder:a3b": {
          "name": "Qwen3-Coder: a3b-30b (local)",
          "limit": {
            "context": 128000,
            "output": 65536
          }
        }
      }
    }
  }
}
```

## GitLab Duo

### Self-Hosted Instance

```bash
export GITLAB_INSTANCE_URL=https://gitlab.company.com
export GITLAB_TOKEN=glpat-...
```

### Custom AI Gateway

```bash
export GITLAB_AI_GATEWAY_URL=https://ai-gateway.company.com
```

### Config File

```json
{
  "provider": {
    "gitlab": {
      "options": {
        "instanceUrl": "https://gitlab.com",
        "featureFlags": {
          "duo_agent_platform_agentic_chat": true,
          "duo_agent_platform": true
        }
      }
    }
  }
}
```

### Lock to GitLab-Hosted Models Only

```json
{
  "small_model": "gitlab/duo-chat-haiku-4-5",
  "share": "disabled"
}
```

## GitHub Copilot

### Using /connect

1. Run `/connect`
2. Select "GitHub Copilot"
3. Go to [github.com/login/device](https://github.com/login/device)
4. Enter the code displayed

## Cloudflare AI Gateway

### Environment Variables

```bash
export CLOUDFLARE_ACCOUNT_ID=your-32-character-account-id
export CLOUDFLARE_GATEWAY_ID=your-gateway-id
export CLOUDFLARE_API_TOKEN=your-api-token
```

### Config File

```json
{
  "provider": {
    "cloudflare-ai-gateway": {
      "models": {
        "openai/gpt-4o": {},
        "anthropic/claude-sonnet-4": {}
      }
    }
  }
}
```

## Helicone

### Basic Config

```json
{
  "provider": {
    "helicone": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Helicone",
      "options": {
        "baseURL": "https://ai-gateway.helicone.ai"
      },
      "models": {
        "gpt-4o": {
          "name": "GPT-4o"
        }
      }
    }
  }
}
```

### With Custom Headers

```json
{
  "provider": {
    "helicone": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Helicone",
      "options": {
        "baseURL": "https://ai-gateway.helicone.ai",
        "headers": {
          "Helicone-Cache-Enabled": "true",
          "Helicone-User-Id": "opencode"
        }
      }
    }
  }
}
```

## Vercel AI Gateway

### Config with Provider Routing

```json
{
  "provider": {
    "vercel": {
      "models": {
        "anthropic/claude-sonnet-4": {
          "options": {
            "order": ["anthropic", "vertex"]
          }
        }
      }
    }
  }
}
```

## OpenRouter

### Add Additional Models

```json
{
  "provider": {
    "openrouter": {
      "models": {
        "somecoolnewmodel": {}
      }
    }
  }
}
```

### Specify Provider Routing

```json
{
  "provider": {
    "openrouter": {
      "models": {
        "moonshotai/kimi-k2": {
          "options": {
            "provider": {
              "order": ["baseten"],
              "allow_fallbacks": false
            }
          }
        }
      }
    }
  }
}
```

## Authentication Precedence (Amazon Bedrock)

1. **Bearer Token** - `AWS_BEARER_TOKEN_BEDROCK` env var or `/connect` token
2. **AWS Credential Chain** - Profile, access keys, shared credentials, IAM roles

Note: When a bearer token is set, it takes precedence over all AWS credential methods.
