# Insighta Labs+ Web Portal

This directory contains the Backend-For-Frontend (BFF) interface securely mapping non-technical users to the Insighta core via web.

## Security Paradigms & HTTP Patterns
Acting dynamically as a middle-layer between Client Browsers and the primary API Backend:
1. **CSRF Protection**: All EJS layout renders force `csurf` verification routines natively on mutable links like `/logout`.
2. **Cookie Abstraction**: Resolves authentication using purely Backend-supplied HTTP-Only Cookies natively mapped. No `localStorage` Javascript tokens are structurally required, mitigating Cross Site Scripting risks directly.
3. **Data Bridging**: Native routing directly acts upon API results parsing parameters. Endpoints sequentially convert standard JSON metadata formats (`total_pages`, `links.self`) rendering dynamic pagination matrices flawlessly.
#