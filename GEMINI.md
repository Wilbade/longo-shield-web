# **AI Development Guidelines for Modern Web Projects in Firebase Studio**

These guidelines define the operational principles and capabilities of an AI agent (e.g., Gemini) interacting with framework-less web projects (HTML, CSS, JavaScript) within the Firebase Studio environment. The goal is to enable an efficient, automated, and error-resilient application design and development workflow that leverages modern, widely supported web standards (Baseline).

## **Environment & Context Awareness**

The AI operates within the Firebase Studio development environment, which provides a Code OSS-based IDE and a simple, pre-configured environment for web development.

* **Project Structure:** The AI assumes a basic web project structure. The primary entry point is `index.html`. CSS and JavaScript are expected to be in files like `style.css` and `main.js`, linked from the HTML.
* **`dev.nix` Configuration:** The AI is aware of the `.idx/dev.nix` file for environment configuration, which may include tools like `pkgs.nodejs` for development servers or build tools.
* **Preview Server:** Firebase Studio provides a running preview server. The AI will monitor the server's output (e.g., console logs, network requests) for real-time feedback on changes.
* **Firebase Integration:** The AI recognizes standard Firebase integration patterns, such as including the Firebase SDKs from the CDN and initializing the app with a configuration object.

## **Code Modification & Dependency Management**

The AI is empowered to modify the codebase autonomously based on user requests.  The AI is creative and anticipates features that the user might need even if not explicitly requested.

* **Core Code Assumption:** The AI will primarily modify `.html`, `.css`, and `.js` files. It will create new files as needed and ensure they are correctly linked in `index.html`.
* **Dependency Management:** For a framework-less project, the AI will prefer to use ES Modules for JavaScript, importing/exporting functionality between files. For third-party libraries, it will use CDN links with Subresource Integrity (SRI) hashes for security, or install them via npm if a `package.json` is present.

## **Modern HTML: Web Components**

The AI will use Web Components to create encapsulated, reusable UI elements without external frameworks.

* **Custom Elements:** Define new HTML tags with custom behavior using JavaScript classes.
* **Shadow DOM:** Encapsulate a component's HTML structure, styling, and behavior, preventing conflicts with the main document.
* **HTML Templates (`<template>` and `<slot>`):** Create inert chunks of markup to be cloned and used in custom elements, with slots for flexible content injection.

*Example of a simple Web Component:*

```javascript
// in main.js
class SimpleGreeting extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    const wrapper = document.createElement('span');
    wrapper.setAttribute('class', 'wrapper');
    const text = document.createElement('p');
    text.textContent = `Hello, ${this.getAttribute('name') || 'World'}!`;
    const style = document.createElement('style');
    style.textContent = `
      .wrapper {
        padding: 15px;
        border: 1px solid #ccc;
        border-radius: 8px;
      }
    `;
    shadow.appendChild(style);
    shadow.appendChild(wrapper);
    wrapper.appendChild(text);
  }
}
customElements.define('simple-greeting', SimpleGreeting);

// in index.html
// <simple-greeting name="User"></simple-greeting>
```

## **Modern CSS (Baseline Features)**

The AI will use modern, widely supported CSS features to create responsive and maintainable styles.

* **Container Queries (`@container`):** Create components that respond to the size of their parent container, not just the viewport.
* **Cascade Layers (`@layer`):** Manage the CSS cascade with explicit layers to prevent style conflicts, especially when integrating third-party styles.
* **The `:has()` Selector:** Select parent elements based on their children, simplifying complex styling scenarios without JavaScript.
* **Logical Properties:** Use properties like `margin-inline-start` instead of `margin-left` for better support in different writing modes.
* **Modern Color Spaces (`oklch`, `lch`):** Use color functions that provide access to more vibrant and perceptually uniform colors.
* **CSS Variables:** Use custom properties (`--main-color: #333;`) for theming and easier maintenance.

## **Modern JavaScript (Baseline Features)**

The AI will write clean, efficient, and modern JavaScript.

* **ES Modules:** Use `import` and `export` to organize code into reusable modules.
* **Async/Await:** Handle asynchronous operations (like `fetch`) with clean, readable syntax.
* **The `fetch` API:** Make network requests to APIs.
* **Promises:** Work with asynchronous results in a structured way.
* **Modern Syntax:** Utilize arrow functions, destructuring, spread/rest operators, and optional chaining (`?.`).

## **Advanced Capabilities**

### **3D Graphics with Three.js**

When 3D graphics are requested, the AI will use the **Three.js** library.

* **Setup:** The AI will add Three.js to the project, typically via a CDN or by installing the `three` package from npm.
* **Core Concepts:** The AI will create a `Scene`, a `Camera`, and a `WebGLRenderer`. It will add `Meshes` (geometry \+ material) to the scene and render the result.
* **Performance:** For complex scenes, the AI will employ optimization techniques like reducing draw calls, using Level of Detail (LOD), and optimizing 3D assets.
* **Shaders:** For custom visual effects, the AI can write and implement GLSL shaders using `ShaderMaterial`.

### **High-Performance with WebAssembly (WASM)**

For computationally intensive tasks, the AI can integrate WebAssembly modules.

* **Use Cases:** Ideal for tasks like in-browser image/video processing, scientific simulations, or games.
* **Integration:** The AI will load and instantiate the `.wasm` file using the `WebAssembly` JavaScript API and call its exported functions. It will manage the data transfer between JavaScript and WASM efficiently.

## **Automated Error Detection & Remediation**

A critical function of the AI is to continuously monitor for and automatically resolve errors to maintain a runnable and correct application state.

* **Post-Modification Checks:** After every code modification, the AI will:
  1. Monitor the IDE's diagnostics (problem pane) for errors.
  2. Check the browser preview's developer console for runtime errors, 404s, and rendering issues.
* **Automatic Error Correction:** The AI will attempt to automatically fix detected errors. This includes, but is not limited to:
  * Syntax errors in HTML, CSS, or JavaScript.
  * Incorrect file paths in `<script>`, `<link>`, or `<img>` tags.
  * Common JavaScript runtime errors.
* **Problem Reporting:** If an error cannot be automatically resolved, the AI will clearly report the specific error message, its location, and a concise explanation with a suggested manual intervention or alternative approach to the user.

## **Visual Design**

**Aesthetics:** The AI always makes a great first impression by creating a unique user experience that incorporates modern components, a visually balanced layout with clean spacing, and polished styles that are easy to understand.

1. Build beautiful and intuitive user interfaces that follow modern design guidelines.
2. Ensure your app is mobile responsive and adapts to different screen sizes, working perfectly on mobile and web.
3. Propose colors, fonts, typography, iconography, animation, effects, layouts, texture, drop shadows, gradients, etc.
4. If images are needed, make them relevant and meaningful, with appropriate size, layout, and licensing (e.g., freely available). If real images are not available, provide placeholder images.
5. If there are multiple pages for the user to interact with, provide an intuitive and easy navigation bar or controls.

**Bold Definition:** The AI uses modern, interactive iconography, images, and UI components like buttons, text fields, animation, effects, gestures, sliders, carousels, navigation, etc.

1. Fonts \- Choose expressive and relevant typography. Stress and emphasize font sizes to ease understanding, e.g., hero text, section headlines, list headlines, keywords in paragraphs, etc.
2. Color \- Include a wide range of color concentrations and hues in the palette to create a vibrant and energetic look and feel.
3. Texture \- Apply subtle noise texture to the main background to add a premium, tactile feel.
4. Visual effects \- Multi-layered drop shadows create a strong sense of depth. Cards have a soft, deep shadow to look "lifted."
5. Iconography \- Incorporate icons to enhance the user’s understanding and the logical navigation of the app.
6. Interactivity \- Buttons, checkboxes, sliders, lists, charts, graphs, and other interactive elements have a shadow with elegant use of color to create a "glow" effect.

## **Accessibility or A11Y Standards:** The AI implements accessibility features to empower all users, assuming a wide variety of users with different physical abilities, mental abilities, age groups, education levels, and learning styles.

## **Iterative Development, Single Source of Truth (SSOT) & User Interaction**

The AI's workflow is iterative, transparent, modular, and strictly governed by `blueprint.md`.

* **Blueprint Management (Single Source of Truth - SSOT):**
  * The `blueprint.md` file in the project's root directory is the **absolute and single source of truth** for all specifications, architectural boundaries, and business rules.
  * **MANDATORY PRE-CHECK:** Before starting any research or modifying any code, the AI MUST reference `blueprint.md` to guarantee full context and prevent regressions.
  * **MANDATORY POST-MODIFICATION UPDATE:** Whenever any code, feature, bugfix, or refactoring is applied, the AI MUST update `blueprint.md` to document what was changed and maintain the documentation in sync with reality. No task is complete until `blueprint.md` is updated.
  * Keep the root directory clean: scratch or temporary prompt files (e.g. `PROMPT_CONTEXTO.md`) must be consolidated into `blueprint.md` and deleted.

* **Critical Architectural Boundaries:**
  * **Strict Modular Separation:**
    * `/` (Root): Cybersecurity, Antiphishing Solutions, Corporate Longo Shield.
    * `/manutencao/`: Commercial landing page for computer maintenance in ABC Paulista.
    * `/os/`: Internal CRM for Service Orders, bench tickets, and repair reports.
    * `/ofertas/`: Public deals showcase, 4-in-1 comparison engine, and Operations Admin (`afiliados.html` / `admin-app.js`).
    * Modules must NEVER cross-contaminate code, styles, or logic.

* **Critical Business Rules for Offers (`/ofertas/`):**
  * **Image Shielding:** Never use unstable external URLs. Always use official packshots in `/ofertas/img/` or test asynchronously via `Image.onload`. Strictly forbid cross-category image fallbacks (e.g., motorcycle mount photos or shields on headphones/creatine/clothing).
  * **Operator Price Sovereignty:** Human operator prices and verified listings are authoritative. The AI re-scan engine must NEVER overwrite operator-audited prices with AI hallucinations.
  * **Search vs Direct Links:** Broad search listings (`/lista...`, `/search...`) must be displayed as "Consultar Cotação", never as fixed direct offer prices.
  * **XSS Prevention:** All dynamic content inserted into the DOM must be sanitized via `escapeHtml()`.

* **Prompt Understanding & Contextual Responses:** The AI will interpret user prompts to understand the desired changes. It will ask clarifying questions if the prompt is ambiguous and provide concise, professional responses.

* **Autonomous Multi-Agent Orchestration:**
  * For complex tasks, deep refactoring, or multi-step validations, the AI has full autonomy to spawn subagents or task-oriented workflows within the workspace without cluttering the primary conversation.

* **Trava de Segurança de Refatoração (Integridade de Funções Utilitárias & Escopo):**
  * É **terminantemente proibido** remover, omitir ou deixar de declarar funções utilitárias compartilhadas ou de suporte (como `escapeHtml`, `obterFotoSeguraProduto`, geradores de links e parsers) durante alterações de interface, layout ou templates.
  * Antes de finalizar qualquer alteração de código, o agente deve garantir que todas as funções chamadas dentro de interpolações (`${...}`), loops (`.map()`, etc.) e atributos inline estejam declaradas no escopo do arquivo e disponíveis para prevenir erros em tempo de execução como `Uncaught ReferenceError`.

* **STRICT PROHIBITION OF USER BROWSER ACCESS:**
  * The AI is **strictly forbidden** from launching, manipulating, or performing visual testing with the user's personal web browser.
  * All interface checks, route validations, DOM tests, scripts, or unit validations must be performed exclusively via command-line interface (CLI), headless scripts, static code analysis, or automated workspace simulations.

* **Error Checking Flow:**
  1. **Code Change:** AI applies a code modification.
  2. **Dependency Check:** If a `package.json` was modified, AI runs `npm install`.
  3. **Verification:** Automated tests via CLI, headless runs, or static syntax checks (NEVER personal browser).
  4. **Documentation Sync:** AI updates `blueprint.md`.
  5. **Remediation/Report:** If errors are found, AI attempts automatic fixes. If unsuccessful, it reports details to the user.


# Firebase MCP

When requested for Firebase add the following the server configurations to .idx/mcp.json. Just add the following and don't add anything else.

{
    "mcpServers": {
        "firebase": {
            "command": "npx",
            "args": [
                "-y",
                "firebase-tools@latest",
                "experimental:mcp"
            ]
        }
    }
}