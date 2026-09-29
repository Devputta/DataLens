# Security Policy

## Supported Versions

Security fixes are intended for the latest version of the project on its default branch. Older versions may not receive security updates.

## Reporting a Vulnerability

Please report suspected security vulnerabilities privately and allow the maintainers time to investigate before public disclosure.

1. **Preferred:** If private vulnerability reporting is enabled for this GitHub repository, use the repository’s **Security** tab and select **Report a vulnerability**.
2. **If private reporting is unavailable:** Open a public issue containing only a brief request for a private security contact. Do **not** include exploit steps, sensitive logs, personal information, credentials, or details that would help others reproduce the issue publicly. Wait for the maintainer to provide a private reporting channel.

Include in your private report, where possible:

- A concise description of the potential vulnerability and its impact.
- The affected version, commit, or deployment configuration.
- Reproduction steps or a minimal proof of concept.
- Any suggested mitigation.

Please do not test against systems or data you do not own or have explicit permission to assess.

## Response and Disclosure

The maintainers will make a reasonable effort to acknowledge reports, investigate the issue, and coordinate a fix and disclosure with the reporter. Response and remediation timelines depend on severity, reproducibility, and maintainer availability.

## Security Recommendations for Users

- Never commit `.env.local`, API keys, tokens, or other secrets.
- Treat uploaded datasets and exported reports as potentially sensitive.
- Use server-side secret storage for credentials; do not expose private keys in browser code.
- Keep dependencies and deployment runtimes updated.
- Review the privacy and access controls of your hosting provider before uploading sensitive information.
