# Security Overview

Inua is a wellness application and not a medical device. We implement a safety‑first design with guardrails for crisis inputs and pregnancy contexts.

This document summarizes the security posture and the safeguards currently implemented in the codebase.

## Implemented Safeguards
- **CORS allowlist** via `ALLOWED_ORIGINS` with wildcard credentials disabled
- **Rate limiting** on core endpoints using `slowapi`
- **Optional API authentication** (`API_AUTH_REQUIRED` + `API_AUTH_KEY`)
- **Input validation** with Pydantic and basic XSS/prompt‑injection pattern checks
- **Prompt‑injection sanitization** before LLM calls
- **Safe JSON parsing** with key whitelisting for LLM outputs
- **Sensitive logging reduction** (no raw user input or LLM output in logs)
- **Health endpoint rate limiting** to reduce abuse

## Operational Notes
- Use HTTPS in production.
- Keep `ALLOWED_ORIGINS` restricted to trusted domains.
- Rotate `API_AUTH_KEY` regularly if enabled.
- Avoid committing secrets or `.env` files.

## Known Limitations / Future Work
- Formal penetration testing
- Automated dependency vulnerability scanning
- Centralized secrets management

## Responsible Disclosure
If you discover a security issue, please open a GitHub issue with a minimal reproducible report. Do not include sensitive data.
