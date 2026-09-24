---
title: my-cinematek
created: 2026-09-24
updated: 2026-09-24
---

# PRD: my-cinematek
*Working title — confirm.*

## 0. Document Purpose
This PRD defines the initial product direction for a personal movie review website: a modern, low-friction space where the owner can post thoughtful reviews of films watched in theaters, on the sofa, or anywhere else. It is intended for the product owner and any future implementation work. This document centers on a simple personal publishing workflow, not a community platform or a movie catalog product.

## 1. Vision
my-cinematek is a personal website for writing movie reviews in a format that feels like a modernized MySpace blog: clean, expressive, archive-driven, and easy to maintain. The product exists to document what the owner watched, what they thought, and the vibe or context around each viewing — whether it was a packed cinema night or a quiet couch watch.

The core value is not discovery or social engagement; it is the ability to publish personal film writing quickly and keep an archive that feels like a living movie diary. The user wants a place to capture reactions, thoughts, recommendations, and opinions without needing accounts, comments, or complicated content tooling.

This is a simple publishing product: one person, one site, one archive. It should feel personal, nostalgic, and clean — not like a CMS dashboard or a social network.

## 2. Target User

### 2.1 Jobs To Be Done
- Publish a movie review quickly after seeing a film.
- Keep a running archive of films watched in different contexts.
- Write notes that are personal, opinionated, and easy to revisit later.
- Browse older posts in a way that feels like a journal or blog.
- Maintain a simple site without accounts, comments, or moderation work.

### 2.2 Non-Users (v1)
- People who want a social movie community or discussion forum.
- People who need a multi-user editorial CMS.
- People who want user accounts, authentication, or admin workflows.
- People who need a public movie database with external ratings and metadata.

### 2.3 Key User Journeys

- **UJ-1. Martin writes a fresh review after watching a movie.**
  - **Persona + context:** Martin wants to post a short review while the film is still fresh in his head.
  - **Entry state:** he is on his site and wants to add a new post.
  - **Path:** he opens the new post screen, adds the movie title, date watched, rating, short review text, and any tags or notes, then publishes.
  - **Climax:** the review appears on the homepage or archive immediately.
  - **Resolution:** the post becomes part of the archive for future reading.

- **UJ-2. Martin browses his past reviews.**
  - **Persona + context:** he wants to look back through his movie writing and find older posts.
  - **Entry state:** he has an archive of previous reviews and wants to browse them by date or category.
  - **Path:** he opens the archive, filters by tags or date, and clicks a review to read it.
  - **Climax:** he sees the full review and can revisit the opinion in context.
  - **Resolution:** the archive feels like a personal film journal rather than a database.

- **UJ-3. Martin edits or revises an old review.**
  - **Persona + context:** he wants to update a review after thinking more about it or correcting a note.
  - **Entry state:** he has an existing post and wants to revise it.
  - **Path:** he opens the post, edits the text or rating, and saves the update.
  - **Climax:** the revised review replaces the old version in the archive.
  - **Resolution:** the site stays current without extra administrative complexity.

## 3. Glossary
- **Post** — A review entry written by the owner about a specific movie.
- **Archive** — The chronological collection of all posts on the site.
- **Rating** — A simple personal score or verdict attached to a movie review.
- **Tag** — A keyword used to group reviews by mood, genre, format, or context.
- **Review** — The main content of the site: a written opinion, reaction, and context for a movie.
- **Homepage** — The first page the reader sees, showing recent posts or a selection of featured reviews.
- **Context** — The details around a viewing, such as theater, sofa watch, date, or special circumstance.

## 4. Features

### 4.1 Post Creation and Editing
**Description:** The system lets the owner write, save, and publish movie reviews easily. This is the core of the product and should feel immediate and not require any account management or complicated publishing workflow. This feature realizes UJ-1 and UJ-3.

**Functional Requirements:**

#### FR-1: Create a new review post
The owner can write a new review entry with a title, review body, date watched, and optional rating or tags. Realizes UJ-1.

**Consequences (testable):**
- A new review can be published from a simple editor with minimal friction.
- The review appears in the archive and homepage as expected.

#### FR-2: Edit an existing review
The owner can open a published review and update the content or metadata. Realizes UJ-3.

**Consequences (testable):**
- Updated text and metadata are saved and shown in the public version.
- The owner can revise a post without creating a duplicate.

#### FR-3: Delete or archive a review
The owner can remove an old review or mark it as no longer published when needed. Realizes UJ-3.

**Consequences (testable):**
- Deleted reviews are removed from public views.
- The owner keeps control over the site content without requiring a complex admin layer.

### 4.2 Blog-style Presentation
**Description:** The site presents posts in a familiar blog format: recent entries, readable typography, and a straightforward archive. The design should feel personal and modern, like a 2007 blog aesthetic refined for today. This feature supports UJ-2.

**Functional Requirements:**

#### FR-4: Show recent posts on the homepage
The homepage displays the most recent reviews, with a clear reading order and simple visual hierarchy. Realizes UJ-2.

**Consequences (testable):**
- New posts appear at the top of the homepage in chronological order.
- The homepage remains readable and focused without extra clutter.

#### FR-5: Show single-post view
Each review can be opened as its own page with a title, rating, metadata, and the full written review. Realizes UJ-2.

**Consequences (testable):**
- A user can read the full review without navigating through a complex app shell.
- The page style remains consistent across posts.

#### FR-6: Show an archive of previous posts
The site includes an archive that allows the owner to browse older posts by date or category. Realizes UJ-2.

**Consequences (testable):**
- Older posts remain accessible and easy to find.
- The archive is easy to navigate without user accounts or search complexity.

### 4.3 Review Metadata
**Description:** Each post can carry lightweight metadata so the review feels complete and the writing has context. This supports the personal archive and gives each review a clear identity.

**Functional Requirements:**

#### FR-7: Add movie title and watch context
A review can include the movie title and a small field for context such as theater, couch watch, date seen, or special viewing situation. Realizes UJ-1.

**Consequences (testable):**
- The metadata is displayed on the post and supports context-rich writing.
- It remains easy to add without external integrations.

#### FR-8: Add a rating or verdict
The owner can add a personal score or quick verdict to each review. Realizes UJ-1.

**Consequences (testable):**
- Ratings are visible alongside the review and match the tone of the site.
- The rating is optional and simple.

#### FR-9: Add tags or labels
The owner can add tags such as genre, mood, or watch format. Realizes UJ-1 and UJ-2.

**Consequences (testable):**
- Tags help organize the archive without turning the site into a database.
- Tag filtering remains lightweight and easy to maintain.

## 5. Non-Goals (Explicit)
- No comments or discussion threads.
- No user accounts or authentication.
- No admin dashboard requiring multiple roles.
- No social feed, followers, or recommendation network.
- No public movie database or metadata importer.
- No paid memberships or subscriptions.
- No moderation system.

## 6. MVP Scope

### 6.1 In Scope
- Simple personal movie review site.
- Create, edit, and publish posts.
- Homepage with recent reviews.
- Single-post pages.
- Archive view by date/tag.
- Rating, date, and context metadata.
- No accounts or comments.

### 6.2 Out of Scope for MVP
- Reader comments.
- User accounts.
- Search across a large library of reviews beyond basic archive browsing.
- Social sharing features.
- External metadata fetching.
- Rich media galleries or complex editorial tooling.

## 7. Success Metrics

**Primary**
- **SM-1**: Publishing speed — the owner can write and publish a review in under five minutes. Validates FR-1 and FR-7.
- **SM-2**: Archive usability — the owner can find older posts without friction. Validates FR-4 and FR-6.

**Secondary**
- **SM-3**: Review consistency — the site presents reviews in a cohesive, readable format across all posts. Validates FR-4 and FR-5.

**Counter-metrics**
- **SM-C1**: Complexity budget — the site should not require admin or account workflows to operate. Counterbalances the temptation to add CMS complexity.

## 8. Open Questions
1. Should the site be static content generated from local files, or should it be backed by a simple database or CMS?
2. Does the owner want a minimal personal aesthetic that resembles a blog, or a more polished portfolio-style design?
3. Should the review form support only text, or also images and embedded media?
4. Is the first version a single-page site with a post archive, or a multi-page blog structure?
5. Does the owner want to host the site in a simple static deployment or a lightweight app runtime?

## 9. Assumptions Index
- Assumption from §1: the site is a personal writing space rather than a public review community.
- Assumption from §2: the primary user is a single writer who is not managing multiple people or roles.
- Assumption from §4: the product should prioritize fast publishing and readability over complexity.
- Assumption from §6: the MVP is intentionally simple and should avoid accounts, comments, and social features.
