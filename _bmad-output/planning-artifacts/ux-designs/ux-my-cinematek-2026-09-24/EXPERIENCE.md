---
name: my-cinematek
status: draft
created: 2026-09-24
updated: 2026-09-24
---

# Foundation
This product is a single-author personal movie review website. It is best treated as a lightweight editorial blog, not a database or social product. The design system is intentionally simple and low-friction, and the experience should support a fast publishing flow without any need for accounts, comments, or admin processes.

The form factor is a responsive web blog with a strong reading experience across mobile and desktop. It should feel natural on a phone when reading reviews, and polished on desktop when reading a full archive or writing a new review.

The visual identity lives in [DESIGN.md](DESIGN.md), which defines the warm editorial aesthetic and token language. This document focuses on behavior, structure, and the rhythm of the experience.

# Information Architecture
## Site structure
- Home: recent reviews and featured writing
- Post page: single review, metadata, and full text
- Archive: list of older posts by date and tag
- About: short writer bio or site description
- New/Edit post: minimal writing surface for the owner

## Navigation model
The navigation should be minimal and quiet:
- Site name / home link
- Archive
- About
- Optional Tags or occasional highlights

These links should stay secondary to the writing. The user is not navigating a platform; they are reading a personal journal.

## Content model
Each review contains:
- title
- movie title
- date watched
- rating or verdict
- tags
- review body
- optional context notes

This is enough to provide a personal movie archive without turning the site into a catalog.

# Voice and Tone
The writing voice is personal, opinionated, and human. It should read like a thoughtful film diary, not a formal publication. The interface language is modest and clear, with microcopy that stays light and direct.

Examples:
- “Read review”
- “Archive”
- “Add a review”
- “Tagged as: horror, midnight screening”

The tone should feel intimate, not promotional or overly polished.

# Component Patterns
## Homepage
The homepage shows recent reviews in a clean vertical list. Each item includes:
- title
- movie name
- publication date
- one-line summary or excerpt
- optional tag list

The layout should prioritize reading flow over dashboard-like density.

## Post page
A post page has:
- title
- metadata line with movie title and date
- rating or short verdict
- optional tag list
- full review body

Spacing is generous and the reading experience is more like an essay than a feed.

## Archive
The archive groups past reviews chronologically and optionally by tag or year. It should feel like a personal memory lane, not a search-heavy database.

## Editor
The writing experience should be intentionally simple:
- movie title
- date watched
- rating
- tags
- review body
- save / publish

No comments, no moderation screens, and no account management.Underline can be used sparingly for emphasis only if the site wants a slightly more nostalgic feel.

# State Patterns
## Empty state
When there are no posts yet, the homepage says something like:
- “No reviews yet — the first post is waiting.”

This keeps the site warm and personal despite being empty.

## Draft state
Draft posts should be clearly labeled as unpublished while the owner is preparing them.

## Published state
Published posts appear in the homepage and archive immediately, with clean metadata and no comment or engagement modules.

# Interaction Primitives
- Read
- Browse archive
- Search by tag or filter chronologically
- Publish a review
- Edit an existing review
- Delete an old draft or post

These actions are all straightforward and should remain at the center of the product experience.

# Accessibility Floor
The site should meet a basic accessible baseline:
- strong contrast between body text and background
- semantic heading structure
- large tap targets for links and actions
- readable typography with comfortable line length
- keyboard navigation for archive and editor actions
- no content hidden behind purely visual affordances

The design remains calm and legible, which is particularly important for long-form review writing.

# Key Flows
## KF-1. Write a review after a movie
- The owner finishes watching a film and decides to write down their thoughts.
- They open the editor from the site navigation.
- They add the movie title, date, rating, and review text.
- They save or publish the post.
- The post appears in the homepage and archive automatically.
- Climax: the review is live and searchable in the archive.

## KF-2. Read a review from the archive
- The owner opens the archive or homepage.
- They select a review they wrote earlier.
- They view the full review and its metadata.
- The site feels like a personal library of opinions.
- Climax: the full post is read in a calm, editorial layout.

## KF-3. Revise an older review
- The owner reopens a published review.
- They update the text or rating after reflecting on it.
- They save the change.
- The updated review remains in its original place with the same archive identity.
- Climax: the site reflects the current opinion without introducing complexity.

# Responsive & Platform
The site should work well on phone, tablet, and desktop. On mobile, the content stacks vertically and the navigation compresses to a minimal menu. On desktop, the page can feel more like a long-form magazine layout with more breathing room.

The design should never feel crowded or app-like. It is primarily a reading and writing journal, not a software product interface.
