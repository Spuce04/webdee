# Working on Webdee

These instructions apply throughout this repository. Read the relevant source before changing it, and update this guide when the architecture, commands, or content contracts change. Distinguish existing problems from regressions introduced by your work.

## Project and priorities

Webdee is a web development agency. This project reuses the Hugo site originally built for Loom Deli, a real deli in Dundee. The technical site identity is now Webdee, with `https://webdee.co.uk/` as the configured base URL. Much of the original deli content remains as template material, including menus, opening hours, directions, catering and merchandise.

- The current task scope is a project rebrand: preserve page copy, imagery and business data unless a later task explicitly requests their replacement. Existing Shopify, enquiry, delivery and social connections are intentionally retained; do not invent Webdee destinations or assume these connections belong to Webdee.
- Analytics, delivery click tracking, cookie consent controls and the Sveltia CMS have been removed at the user's request. Edit content and menu YAML directly in the repository. Do not reintroduce these integrations without a new request.
- Preserve the user's agency design work, including the Webdee logos, favicons, home page, navigation and Get Started partial. The deli design notes below describe inherited pages and behaviour, not a requirement to reverse agency styling.

- Keep those visitor journeys easy to find and usable on phones.
- Preserve the established dark, food-photography-led design and friendly local voice unless the task calls for a redesign.
- Use British English for new copy and GBP for prices. The configured `languageCode` is currently `en-us`; this is an implementation detail, not a reason to introduce US pricing or spelling.
- Treat prices, ingredients, dietary claims, opening hours, business details, and delivery destinations as business data. Do not invent or silently reconcile conflicting values.
- Check `git status --short` before editing. Preserve existing user changes and untracked files. At the initial review, `content/display-menu/` and `layouts/display-menu.html` were already untracked work in progress.
- Keep changes focused. Retain Hugo, Bootstrap, and vanilla JavaScript for ordinary work; a new framework, package manager setup, or build pipeline needs a task that warrants it.

## Stack and local commands

This is a standalone Hugo site with local Go HTML templates, YAML menu data, Markdown/front matter, CSS, and browser JavaScript. There is no Hugo theme, `package.json`, dependency lockfile, or checked-in CI/deployment configuration. Backend tests use Node’s built-in test runner in `tests/send.test.mjs` (verified with Node v25.9.0). Node is useful for JavaScript checks, but is not required to build the site.

The review build passed with **Hugo v0.160.1 extended**. A Hugo version is not pinned in the repository. The templates use `try` and Hugo image processing, so use a recent Hugo release and check `hugo version` when diagnosing compatibility failures.

Run from the repository root:

```sh
hugo version
hugo server --bind 127.0.0.1 --port 1313
hugo --minify
```

The development site is normally at `http://127.0.0.1:1313/`. A normal build writes to `public/` and generates resources under `resources/`; both directories are ignored. Never edit generated HTML, bundled files, or processed images there as the implementation.

For an isolated production-style build:

```sh
webdee_check_dir="$(mktemp -d "${TMPDIR:-/tmp}/webdee-check.XXXXXX")"
HUGO_RESOURCEDIR="$webdee_check_dir/resources" hugo --minify \
  --destination "$webdee_check_dir/site" \
  --cacheDir "$webdee_check_dir/cache"
```

Useful syntax checks when the corresponding JavaScript changes:

```sh
node --check assets/js/main.js
node --input-type=module --check < functions/api/send.js
node --check assets/js/catering.js
node --test tests/send.test.mjs
```

Hugo does not run the contact API. `functions/api/send.js` follows the Cloudflare Pages Functions convention and needs that runtime, or a mocked handler test, for API verification. There is no checked-in Wrangler setup; do not assume a particular account, project name, deployment command, or secret configuration. The configured base URL is `https://webdee.co.uk/`; this does not establish deployment status.

## Where to make changes

| Location | Responsibility |
| --- | --- |
| `hugo.toml` | Base URL, language, site title and robots output. Shopify parameters were removed during the agency adaptation; see the Shopify caveat below. |
| `content/_index.md` | Home metadata and image lists: `heroSlides`, `topPicks`, `showcaseImages`. |
| `content/*.md` | Page metadata and layout selection. Most visible page copy is in the corresponding template. |
| `content/privacy-policy.md` | Privacy policy body rendered as Markdown. |
| `content/catering.md` | Catering SEO/social metadata, occasion and food cards, and FAQs. |
| `data/menu.yml` | Food/drinks menu data consumed by the public menu and edited directly in YAML. |
| `layouts/_default/baseof.html` | Shared document head, asset pipeline, navigation/footer and order modal. |
| `layouts/index.html` | Home sections, opening hours, map, merchandise preview, top picks, reviews, social cards, and slider setup. |
| `layouts/{about,catering,contact,menu,shop,privacy-policy}.html` | Page-specific markup and, where applicable, inline styles/scripts. |
| `layouts/partials/` | Shared navigation, footer, order controls, hero slides, social cards, and an unused Shopify client. |
| `assets/css/main.css`, `assets/js/main.js` | First-party shared styles and browser behaviour. |
| `assets/css/bootstrap.css`, `assets/js/bootstrap.bundle.js` | Vendored Bootstrap 5.3.8, including the bundled modal/collapse behaviour. |
| `assets/images/`, `assets/icons/` | Hugo-managed images and SVG icons. |
| `static/favicon/` | Favicons and web manifest copied directly to `/favicon/`. |
| `functions/api/send.js` | Shared `POST /api/send` handler for contact and catering enquiries using Resend. |
| `layouts/partials/catering-form.html`, `assets/js/catering.js` | Catering form, success modal, validation and submission behaviour. |
| `tests/send.test.mjs` | Node tests for Resend payloads, validation, legacy contact submissions and failures. |
| `content/display-menu/{1,2,3}.md`, `layouts/display-menu.html` | In-progress full-screen menu boards, separate from the public site's shared layout. |
| `archetypes/default.md` | Default new-content front matter, using TOML and `draft = true`. |
| `layouts/robots.txt` | Robots output pointing to the generated sitemap. |

## Templates, pages, and assets

- Public routes are `/`, `/menu/`, `/about/`, `/catering/`, `/contact/`, `/shop/`, and `/privacy-policy/`. Preserve existing URLs and inbound links.
- Ordinary page templates implement `{{ define "main" }}` inside the shared `baseof.html`. Keep common navigation, footer and order markup in their partials.
- Content pages select their template using front matter such as `layout: "about"`. Set `title`, `draft`, and `metaDescription` deliberately when adding a page. New content made with the default archetype starts as a draft.
- `layouts/_default/single.html` has an empty main block. Adding Markdown body text to an ordinary page will not make it visible unless its template renders `.Content`. The privacy policy template does render `.Content`.
- The base template reads `.Params.metaDescription` and uses `seoTitle` for the browser title, falling back to the site title. The `head` block allows page-specific metadata. Catering supplies its canonical, Open Graph/Twitter metadata, and business/service JSON-LD through this block; other pages retain their existing head behaviour.
- The logo alt text, footer copyright, Apple web app title and standalone display-board title use `.Site.Title`. The favicon URLs use the same `20261117` cache version as the existing Webdee manifest icons.
- Images and icons in `assets/` are retrieved with `resources.Get`, using asset-relative keys such as `images/hero-1.jpg` and `icons/instagram.svg`. Use the resource's `.RelPermalink` for output URLs.
- Follow existing image processing patterns (`.Process "webp q75"`, resize operations). Check for missing resources before processing new optional images. Supply descriptive alt text, appropriate dimensions, and lazy loading for below-the-fold images.
- CSS is concatenated in the order Bootstrap, then `main.css`; JavaScript is concatenated in the order Bootstrap bundle, then `main.js`. Both bundles are minified and fingerprinted with integrity attributes in the base template. Preserve that pipeline.
- Page-specific scripts also live in templates. Check them as well as `main.js` when changing a feature. Preserve script load order, particularly Bootstrap modal use and Splide initialization.
- Inline SVG via `safeHTML` is used for trusted repository icons. Do not extend this pattern to untrusted form input or remote HTML.
- `static/` files are copied without Hugo template evaluation or asset processing. Keep this distinction in mind for favicons.

The catering page is server-rendered from `content/catering.md` and `layouts/catering.html`. All three main section containers match the About page’s `col-10 col-md-6` widths below 992px, with ordinary Bootstrap gutters; desktop uses `col-lg-12` for the image/occasions section and `col-lg-10` for the food panels and enquiries/FAQs. Keep these mobile/tablet widths consistent across sections. Its `occasions`, `food`, and `faqs` lists are edited directly in front matter. It deliberately follows the About page: a centred heading, narrow Bootstrap content column, one rounded food photo, ordinary text sections and links, and native FAQ disclosures. The introductory image and occasions share a Bootstrap row: equal-width columns from 992px upwards, with the image on the left and all three cards stacked on the right. Below 992px, the image sits above the cards. From 992px upwards, each occasion card places an optional image on the left and text on the right; the image fills the card height and only its outer left corners are rounded. Below 992px, the image is full-width below the text in a 16:9 crop, with only its bottom corners rounded. Card overflow clips the image corners; use object-fit cover for the crop. Each occasion has optional editable `image` and `alt` fields in `content/catering.md`; preserve empty image values. The What We Offer section uses two food panels with the existing text: a 2:1 width split for sandwiches and sweet treats from 992px, and a stacked 2:1 height split below that breakpoint. The panels render each food entry’s optional `image` and `alt` fields behind its text, with a dark readability gradient. An empty image value retains the grey background. The catering form and FAQs share a row from 992px upwards, with two-fifths (40%) for the form and three-fifths (60%) for FAQs; below that breakpoint they stack. FAQs use a simple dark panel, subtle dividers and native disclosure controls. Keep future changes modest and incremental; do not introduce a separate landing-page visual style. `partials/catering-image.html` creates responsive WebP variants without upscaling; the introductory catering photo is eager/high-priority, and occasion card images are lazy-loaded. Its simple homepage/menu links and header/footer links consistently use `/catering/`. Keep structured data limited to confirmed business/service facts; do not add unverified prices, opening hours, ratings, or delivery promises.

## Design and responsive behaviour

The home opening hours and location share one section in `layouts/index.html`: stacked below 992px, with one-third for hours and two-thirds for the map from that breakpoint. Each weekday has its own row. The page's independent inline script highlights the current day in `Europe/London`, refreshes every minute and when visibility changes, and marks it with `aria-current="date"` plus a visible Today label. Keep the Google Maps directions link below the map pointed at the same deli as the embed. Displayed hours retain Monday–Saturday 8am–5pm and Sunday 10am–4pm; the existing Sunday metadata discrepancy still needs confirmation.

Use the existing Bootstrap grid, utilities, cards, rounded corners, and modal patterns. Put shared custom rules in `assets/css/main.css`; avoid changing vendored Bootstrap or the generated bundle for ordinary styling work. Keep formatting consistent with the surrounding file and avoid broad formatting churn.

The reusable `.scale-on-hover` class enlarges elements by 8% on hover or keyboard focus without changing layout spacing. It uses the CSS `scale` property and disables its transition for reduced motion. Apply it to block or inline-block elements (add Bootstrap's `d-inline-block` for inline links). Get Started buttons and project carousel cards use it; the project track has vertical padding with compensating margins to allow the cards to grow.

The current palette is defined in `main.css`:

| Token | Value | Use |
| --- | --- | --- |
| `--bs-primary` / `--bs-primary-rgb` | `#C26015` / `194, 96, 21` | Orange brand accents, headings, borders, and CTAs. |
| `--bs-secondary` / `--bs-secondary-rgb` | `#5bda4f` / `91, 218, 79` | Secondary accent. |
| `--main-bg-color` / `--main-bg-color-rgb` | `#171717` / `23, 23, 23` | Main page background. |

Bootstrap's `.bg-dark` remains a separate card/footer colour. Updating root colour variables alone does **not** update every Bootstrap component: `.btn-primary` still has Bootstrap's explicit blue button variables. Check normal, hover, focus, active, and disabled states when styling buttons. Override component variables in first-party CSS when needed.

The home header is fixed over the full-height hero; interior headers are sticky. `adjustNavOpacity()` changes the navbar background over the first 100 pixels of scrolling. Mobile collapse temporarily adds `bg-main`. Preserve both behaviours when changing navigation, and keep the `headerNavbar` and `navbarSupportedContent` hooks aligned with the scripts.

Preserve readable text over photography, comfortable tap targets, keyboard access, meaningful labels, and modal focus/close behaviour. Existing styling removes the custom toggler's default focus shadow; do not copy that as a general accessibility pattern. Check phone and tablet layouts as well as desktop, especially overlapping merchandise photos, menu card prices, and the three delivery options.

## Menu data contract

`data/menu.yml` has a top-level `menu_data` list. `layouts/menu.html` iterates it in order. Edit this file directly; the CMS has been removed.

- Each category has `category` and `items`; optional category fields are `summary`, `price_display`, `sit_in_price`, `to_go_price`, `served`, `options_label`, and `extras`.
- Each item has `name`; optional fields are `price`, `sit_in_price`, `to_go_price`, `ingredients`, and `options`.
- `ingredients`, `options`, and `extras` are lists of strings. Keep the list structure and the established category/item order unless the requested change involves ordering.
- `price_display` is currently a numeric string for a category-wide price and may be empty. Item `price` is numeric or `null`/absent. Keep currency symbols out of the data; the template adds `£` and formats two decimal places.
- A missing item price is intentional for items priced at category level. Avoid filling these with zero: the template uses truthiness to decide whether to display a price.
- Optional `sit_in_price` and `to_go_price` are numeric GBP amounts or null/absent (empty strings are also treated as unset). `partials/menu-prices.html` shows whichever service prices are supplied, labelled Sit in and To go, replacing the unlabelled `price_display` or `price` at that same level. When both are unset, the existing price remains the fallback. Category prices appear in the heading with Each; item prices appear beside the item name. Use category fields for a shared Signature Sandwiches price and item fields for individually priced Regular Sandwiches, Loom Melts and Breakfast Ciabattas; do not invent values for the initially empty fields.
- `summary` is in the data but is not currently rendered by the public menu. Adding or changing it alone will not change the page.
- Change the YAML and template together when changing the data structure. Preserve optional/empty values.

Home front matter uses `heroSlides` (`image`, `title`, `description`), `topPicks` (`image`, `alt`), and `showcaseImages` (`image`, `alt`). Verify where a field is consumed before promising an edit will appear. Images in front matter use `images/...` asset resource keys and live in `assets/images`. Content is maintained directly in the repository.

## Integrations and feature contracts

### Food delivery

`order-button.html` opens `#orderModal`; `order-modal.html` offers Deliveroo, Uber Eats, and Just Eat. Reuse the shared order button rather than duplicating the modal. Preserve valid Bootstrap targets and the provider destinations.

Delivery links navigate directly to their providers; no first-party click tracking is attached.

### Merchandise shop

The active implementation is entirely in `layouts/shop.html`. It loads Shopify's Buy Button SDK, fetches up to 250 collections, mounts collection UI components, and provides desktop filter buttons and a mobile select below 600px. Shopify manages product modals, variants, quantities, cart, and checkout; this site does not have a local product catalogue or payment backend.

- The active template currently hard-codes its store domain and Storefront access token. `hugo.toml` no longer defines Shopify parameters; adding `[params.shopify]` does **not** update that implementation.
- `layouts/partials/shopify-client.html` is unused and expects Shopify parameters, including `domain`, that are not currently configured. Do not wire it in as a second Shopify initialization without resolving the existing implementation.
- Preserve `dynamic-shop-collections`, `desktop-filters-wrapper`, `mobile-filters-dropdown`, the loader, and the synchronized filter behaviour, or update all dependent code together.
- Hidden collection wrappers stay mounted using CSS; replacing that with destruction/recreation or `display: none` can change SDK rendering. Verify filtering and product UI after such a change.
- Shopify components have their own style configuration, often rendered in SDK-managed iframes. Changing `main.css` may not change product, cart, or modal styling.
- Keep GBP formatting and the loading/error states. Network failure and an empty collection response deserve explicit checks when changing loading logic.
- Browser-facing Storefront tokens are distinct from private Shopify Admin credentials. Never put an Admin token in a template or Hugo public configuration.

### Contact and catering enquiries

`layouts/contact.html` serializes `#contactForm` as `FormData` and posts to `/api/send`. The field names are `name`, `email`, `phone`, `interest`, and `message`; `phone` is optional in the form. The `interest` values are `general`, `catering`, `feedback`, and `other`.

The contact page preselects an `interest` query value only if it matches an existing select option, preserving links such as `/contact/?interest=catering#contactForm`.

The catering page has its own `#cateringForm`, rendered by `partials/catering-form.html` and submitted by the page-only, fingerprinted `assets/js/catering.js`. It uses the Contact page's panel/input/button styling and posts `FormData` to the same `/api/send` endpoint with `form_type=catering`. Its fields are `email`, optional `phone`, `postcode`, `event_date` (ISO date), `sandwich_amount`, `sweet_treat_amount`, and `message`. Both quantities are whole numbers of zero or more, with at least one item requested. Date validation uses Europe/London; the postcode check validates UK format, not address existence. The hidden `website` field is a basic spam honeypot.

`functions/api/send.js` exports `onRequestPost(context)` and reads `context.request` and `context.env`. It sends through Resend using the existing server-side **`RESEND_API_KEY`** binding, sender `enquiries@webdee.co.uk`, business inbox `feedthecrew@loomdeli.com`, and visitor email as `reply_to`. Catering and legacy contact submissions have separate validation and email content; `interest=catering` on the legacy contact form does not require the new fields. Emails include escaped HTML and a plain-text alternative. Success returns JSON `{ "success": true }`; errors return JSON `{ "error": "…" }` with appropriate 4xx/5xx status codes and no provider diagnostics. Catering shows `#cateringSuccessModal` and resets only on success; failures preserve inputs, show an inline alert, and re-enable submission. The existing contact page retains its success modal/error handling.

Keep frontend/backend field names and length limits aligned. Check both forms after changing the shared endpoint. Never expose the Resend key in browser code or log enquiry content. Update the privacy notice’s data inventory when adding collected fields. The honeypot is basic filtering, not a rate limiter or CAPTCHA.

Verify with mocked outbound `fetch`/Resend responses for success, provider failure, invalid input, and exceptions. Use Node's web APIs or a suitable Pages runtime; do not send real enquiries merely to test a change.

### Analytics and CMS removal

There is no first-party Google Analytics or Counterscale loader, configuration or click tracking. Cookie consent controls and their storage code have been removed. The privacy notice no longer describes Google Analytics. The Sveltia CMS entry point, configuration and vendored script under `static/admin/` have been deleted. Existing browser storage from older versions is not read. Third-party shop, map and delivery services retain their own behaviour.

### Reviews and external assets

Home reviews are fetched from Google Places with `resources.GetRemote` **during the Hugo build**, then rendered as static cards. They are not fetched afresh by each visitor. Fetch errors are caught and logged as warnings, leaving reviews empty; a successful Hugo build therefore does not prove reviews loaded. Sanitize diagnostics because the request URL contains a key.

Other browser dependencies include Splide 4.1.4, bs5-lightbox 1.8.5, Google Maps embeds and Shopify's remotely loaded SDK. Bootstrap is vendored locally. Check CDN loading and console errors when diagnosing browser-only failures; a static build does not exercise those services.

## Display-menu work in progress

`/display-menu/1/`, `/display-menu/2/`, and `/display-menu/3/` currently all select the same standalone `display-menu.html`. That template is a complete document and bypasses `baseof.html`: it has no shared navigation, footer, order modal or shared JavaScript bundle.

It uses a full-height two-panel grid, Google-hosted Bree Serif, repeated hard-coded sandwich placeholders, separate melt prices, and a font-fitting script using `document.fonts.ready`, `ResizeObserver`, and resize events. It does **not** read `data/menu.yml` or choose different content per board. Treat it as unfinished work, not an authoritative menu or established responsive public-page pattern. Preserve it during unrelated changes. For work on the boards, test the intended display resolution and text fitting after fonts load, with realistic item counts and long descriptions.

## Credentials and existing issues

Never copy credential values into documentation, examples, tests, logs, screenshots, or responses. Refer to their location or environment variable name. Do not assume ignored/generated files or upstream access controls make a credential safe.

- **Former CMS credential:** The removed CMS entry point contained a browser-embedded GitHub PAT. Removal from the working tree does not revoke that token or remove it from Git history; the owner should revoke it through GitHub. Do not restore or duplicate the old authentication approach.
- **Google Places key:** `layouts/index.html` embeds the reviews API key. A credentials cleanup should externalize the build-time value and verify suitable provider restrictions. Avoid printing the full fetch URL when diagnosing failures.
- The active Shopify template and unused client partial still use separate configuration paths. Use the active shop template as the starting point until consolidation is explicitly implemented and verified.
- The home metadata says Sunday opens at 9am, while the rendered opening-hours section says 10am. Confirm the intended time before changing business information.
- The privacy policy currently lacks `metaDescription`, and the home page has no `h1`. These are existing content/SEO gaps, not proof that a new change caused them.

The initial Hugo v0.160.1 review build exited successfully with these warnings:

- Missing HTML layouts for taxonomy and section pages. The section warning occurs with the in-progress `display-menu` section; do not assume every generated section has a usable landing page.
- `.Site.Data` is deprecated in favour of `hugo.Data` on that Hugo version.
- The Google reviews fetch failed because the review environment could not resolve the Google API host. Check the actual error before attributing empty reviews to template changes.

`--printUnusedTemplates` also identified `shopify-client.html` and `_default/single.html` as unused. Recheck the baseline before removing them or promoting warnings to failures. Do not use `--panicOnWarning` as an assumed passing baseline.

## Verification and completion

Use checks appropriate to the change. There is no `npm test`, configured linter, or checked-in browser-test harness; do not invent results or introduce a test framework for a small content/style edit.

1. Run `hugo --minify` after template, content, data, or asset changes. Check the exit code, warnings, expected output, and missing-resource errors. Syntax-check changed JavaScript; inline template scripts also need browser verification when their behaviour changes.
2. For UI changes, inspect affected routes at phone (~375px), tablet (~768px), and desktop (~1440px) widths. Check overflow, readable prices, images, focus visibility, and console/network errors. Include the home page and an interior page after shared-layout changes.
3. Exercise the affected journeys below. A build pass alone does not verify JavaScript, external services, email delivery, checkout, or deployment.
4. Finish with `git diff --check`, review the diff and `git status --short`, and confirm that generated output, credentials, and unrelated user work have not been added. When removing static features, use a clean build destination (or `--cleanDestinationDir`) so stale generated files are not published. `.DS_Store` and `.hugo_build.lock` are already tracked; avoid incidental changes or repository cleanup unless it is part of the task.
5. Report what changed, the checks actually run, and any limits or pre-existing warnings. If browser/runtime checks were unavailable, say so. A local build is not a production deployment.

| Changed area | Minimum behaviour to inspect |
| --- | --- |
| Shared layout/navigation | Home overlay and scroll opacity, mobile expand/collapse, desktop links, logo, footer, order modal open/close. |
| Home | Hero navigation, top-picks autoplay/progress, reviews with available/unavailable data, merchandise link, social links, map. |
| Menu | Category and item order, category/item price formatting, absent optional fields, matching YAML structure and asset paths. |
| Delivery | All three providers' image/text links. Verify destinations without placing orders. |
| Shop | Loader/error state, desktop/mobile filters, product details/variants, quantity and cart controls. Stop before a real purchase. |
| Contact/catering forms | Run `node --test tests/send.test.mjs`; check required fields, UK postcode/date/quantity validation, mocked success/failure, pending button, success modal/reset, optional phone, preserved values on errors and the legacy Contact page; no live test email. |
| Display boards | Target screen dimensions, font loading, resize/refit, long content, overflow, and all three routes. |

## Webdee home project carousel

The home services section in `layouts/index.html` follows the hero and reads the ordered `services` list in `content/_index.md`. Each card requires `title`; `description`, `features` (a list of strings), `image` and `alt` are optional. Images use asset-relative paths (for example `icons/services/website.svg`) resolved through `resources.Get`, with `.RelPermalink` output. Missing, empty or non-image resources omit the image. Images fit inside the existing icon area without cropping; empty alt text treats them as decorative. The original icons live in `assets/icons/services/`. Add, remove or reorder list entries to manage cards; an empty or absent list omits the section. The section heading and introduction remain in the template. Scoped `.services-section`, `.service-card`, `.service-icon` and `.service-features` rules live in `assets/css/main.css`. Cards stack below 992px and form three equal columns above it, wrapping additional cards onto new rows. The section reuses `get-started.html` for its shared CTA.

The hero carousel at the former infinite-carousel comment in `layouts/index.html` reads `projects_carousel` from `content/_index.md`. Each entry has `title` and optional `image` (an asset-relative key such as `images/projects/example.webp`). Each card accepts an optional `background_color`, a quoted three- or six-digit hex colour such as `"#ffffff"`; empty, missing or invalid colours fall back to grey (`#555555`). Cards remain 16:9. Images render as small, centred square logos using `object-fit: contain`, preserving the complete logo. Empty, omitted or missing images show only the background and bottom-left title. Titles have a translucent dark backing for contrast on light colours. Available raster images are converted to WebP without upscaling; SVGs are used directly. Keep placeholder paths until project images are supplied.

The carousel uses the existing Splide 4.1.4 plus its page-only Auto Scroll 0.5.3 extension from jsDelivr. It loops continuously with free dragging, no arrows, dots or progress bars, and pauses on hover/focus. Reduced motion disables automatic scrolling; a single card stays static and an empty list omits the carousel. The hero uses a minimum viewport height so added cards and text can grow on phones. The obsolete initializer for the removed `#top-picks` element has been replaced by this carousel initializer.

The shared CSS is evaluated with `resources.ExecuteAsTemplate` before concatenation so the custom cursor URL resolves and publishes `assets/images/cursor.svg`. Both the public base layout and display-board layout use this step. The cursor hotspot is at `(12, 12)`, matching the centre of the 24px circular cursor; CSS applies it throughout the document with an `auto` fallback.

## Home services morph animation

The services illustration at the MorphSVG comment in `layouts/index.html` reads the ordered `morph_icons` list in the page front matter (`content/_index.md`). Each entry has `image` (an asset-relative SVG path resolved with `resources.Get`, for example `icons/custom/flubber-1.svg`) and optional `label` (plain text displayed beneath the icon). Legacy string entries still work without labels. Labels fade out as a morph starts, change while hidden, then fade in as it finishes. Adjust `labelFade` in the animation script for fade timing. The first label renders without JavaScript and is restored at full opacity for reduced motion. Add, remove or reorder entries to manage any number of icons. Missing, empty and non-SVG resources are skipped. An empty or absent list omits the illustration; one valid icon stays static. These trusted SVGs share a 32×32 viewBox and a single colour per icon. The first icon renders without JavaScript; inert templates provide all configured shapes. `assets/js/services-morph.js` combines each icon's paths into a compound path and uses a repeating GSAP MorphSVG timeline to morph shapes and colours in order. Adjust `hold`, `duration` (seconds), `ease` and the `morphSVG` options there. It pauses off-screen and in hidden tabs; reduced motion shows the first icon. The base JavaScript slice loads Bootstrap, locally vendored GSAP 3.15.1, its matching MorphSVGPlugin, `main.js`, then `services-morph.js`. The original licence headers and standard-licence URLs are retained in both vendor files. Keep viewBoxes and single-colour path structure compatible when replacing assets.
