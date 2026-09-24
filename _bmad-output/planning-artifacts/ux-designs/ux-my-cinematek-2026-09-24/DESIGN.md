---
name: my-cinematek
description: A personal movie review blog with an editorial, nostalgic, low-noise aesthetic.
colors:
  paper: '#F7F1E8'
  paper-strong: '#EDE0CF'
  ink: '#1B1B1B'
  ink-soft: '#4C4B47'
  accent: '#C96B3F'
  accent-strong: '#A94E2D'
  card: '#FBF8F3'
  border: '#D9CCBA'
  muted: '#8B8075'
  tag: '#EFE4D7'
typography:
  title:
    fontFamily: 'Georgia, "Times New Roman", serif'
    fontSize: 'clamp(2.2rem, 5vw, 4.3rem)'
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: '-0.04em'
  h2:
    fontFamily: 'Georgia, "Times New Roman", serif'
    fontSize: 'clamp(1.4rem, 2vw, 2.2rem)'
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: '-0.02em'
  body:
    fontFamily: 'Segoe UI, Arial, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: '0'
  meta:
    fontFamily: 'Segoe UI, Arial, sans-serif'
    fontSize: '0.78rem'
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: '0.08em'
rounded:
  sm: '8px'
  md: '12px'
  lg: '18px'
  xl: '24px'
  full: '9999px'
spacing:
  1: '4px'
  2: '8px'
  3: '12px'
  4: '16px'
  5: '20px'
  6: '24px'
  8: '32px'
  10: '40px'
  12: '48px'
  16: '64px'
  page: 'clamp(1rem, 3vw, 2rem)'
  gutter: 'min(5vw, 64px)'
components:
  page-shell:
    background: '{colors.paper}'
    color: '{colors.ink}'
  header:
    background: '{colors.card}'
    borderColor: '{colors.border}'
    borderWidth: '1px'
  nav-link:
    color: '{colors.ink-soft}'
    hoverColor: '{colors.accent-strong}'
  card:
    background: '{colors.card}'
    borderColor: '{colors.border}'
    borderRadius: '{rounded.md}'
  tag:
    background: '{colors.tag}'
    color: '{colors.ink}'
    borderRadius: '{rounded.full}'
  button-primary:
    background: '{colors.accent}'
    color: '#FFFFFF'
    borderRadius: '{rounded.full}'
  post-title:
    color: '{colors.ink}'
    fontFamily: '{typography.h2.fontFamily}'
---

# Brand & Style
This is a personal movie journal with a warm editorial sensibility. It should feel like a modernized blog from the early 2000s: nostalgic, expressive, and personal, but refined enough to work well on a clean modern site. The mood is thoughtful, understated, and unhurried.

The tone is intimate rather than corporate. It should feel like a real voice, not a platform. The design should support a single author without visual noise or excessive chrome.

# Colors
The palette is paper-toned and warm, with a restrained accent that reads like a film grain or sunset. The space is intentionally quiet so the writing remains the focus.

- Paper: the main background, soft and warm.
- Ink: the main readable text tone.
- Accent: the signal color used for small interactive highlights and emphasis.
- Card: surfaces like post containers and metadata panels.
- Border: subtle separation lines that hold the layout together without looking rigid.

The color system avoids loud neon or overly tech-like UI. It should feel lived-in and literary, not startup-y.

# Typography
The site uses a serif for headlines and large editorial moments, paired with a clean sans-serif for body copy and metadata. This keeps the feel personal and journal-like without becoming hard to read.

- Titles use the serif to create a warm editorial identity.
- Body copy stays clean and highly legible for long-form reviews.
- Metadata uses a compact uppercase sans style to keep context lightweight and structured.

# Layout & Spacing
The layout is generous and readable. Posts should have breathing room, especially on desktop. The grid respects the page rhythm and avoids dense multi-column clutter unless absolutely necessary.

The content column is narrow enough to read comfortably, but wide enough to feel like a magazine or personal blog rather than a mobile feed. Vertical rhythm creates a strong editorial cadence across reviews.

# Elevation & Depth
Depth is subtle. The site should feel tactile but not overly layered. Cards and boxed elements have very light borders and low-contrast shadows at most.

The goal is to keep the layout calm and trustworthy, with text always dominating the visual hierarchy.

# Shapes
Rounded corners are soft but not playful. Cards and chips use subtle curvature; big backgrounds remain rectangular and stable. This avoids over-design while still giving the site some personality.

# Components
## Header
The header should be simple, strong, and quiet. It should hold the site name and a few minimal navigation links such as About, Archive, and Tags if needed. It should not compete with the posts themselves.

## Post card
A post card shows the title, a short excerpt, publication date, and maybe a small tag row. The card should feel like a gentle invitation to read more, not a marketing banner.

## Tag chips
Small, rounded label chips help group reviews by mood or format without making the page feel busy. They should be secondary to the title and metadata.

## Buttons / misc actions
Buttons are minimal and action-oriented. The primary call-to-action is the read-more style link or the publish flow, not a giant CTA block.

# Do's and Don'ts
Do:
- Keep the design editorial and warm.
- Let the writing carry the page.
- Use generous whitespace and calm contrast.
- Keep the interface minimal and personal.

Don't:
- Don't make it look like a generic SaaS dashboard.
- Don't overuse bright accent colors or heavy shadows.
- Don't add comments, multiple author roles, or social UI unless absolutely required.
- Don't clutter the homepage with too many widgets or categories.
