---
name: SubEditor
description: macOS desktop subtitle translator — AI-powered Chinese-to-English SRT translation with precise proofreading
colors:
  bg-page: "#f5f5f5"
  bg-surface: "#ffffff"
  bg-surface-hover: "#f9fafb"
  bg-subtle: "#f3f4f6"
  ink-primary: "#1a1a1a"
  ink-secondary: "#374151"
  ink-muted: "#9ca3af"
  ink-placeholder: "#d1d5db"
  border-default: "#e5e7eb"
  border-subtle: "#f3f4f6"
  accent-primary: "#2563eb"
  accent-primary-hover: "#1d4ed8"
  accent-translate: "#16a34a"
  accent-translate-hover: "#15803d"
  accent-export: "#9333ea"
  accent-export-hover: "#7e22ce"
  accent-review: "#f97316"
  accent-destructive: "#ef4444"
  accent-destructive-hover: "#dc2626"
typography:
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  heading:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.4
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  mono:
    fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', 'Consolas', monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  button-primary:
    backgroundColor: "#2563eb"
    textColor: "#ffffff"
    rounded: "8px"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "#1d4ed8"
  button-secondary:
    backgroundColor: "#f3f4f6"
    textColor: "#374151"
    rounded: "8px"
    padding: "8px 16px"
  button-secondary-hover:
    backgroundColor: "#e5e7eb"
  input-default:
    backgroundColor: "#ffffff"
    textColor: "#1a1a1a"
    rounded: "4px"
    padding: "4px 8px"
  modal:
    backgroundColor: "#ffffff"
    rounded: "12px"
  modal-backdrop:
    backgroundColor: "rgba(0, 0, 0, 0.4)"
---

## Overview

SubEditor is a local macOS desktop app for professional subtitle translators. The interface follows a flat, restrained design language: minimal decoration, clear information hierarchy, and fast single-click workflows. Every visual element serves a purpose; nothing is ornamental.

## Colors

The palette is intentionally minimal, built on a neutral gray foundation with function-specific accent colors reserved for primary actions and status communication.

- **Neutrals**: White surfaces on a warm-gray page background (`#f5f5f5`). Text uses a tight gray ramp from near-black (`#1a1a1a`) for body copy to light gray (`#9ca3af`) for secondary information.
- **Blue** (`#2563eb`): Primary action color. Used for the main upload button and focus rings. Blue signals "you can act here."
- **Green** (`#16a34a`): Translate action. Reserved for the most important workflow trigger so it's always easy to find.
- **Purple** (`#9333ea`): SRT export. Distinct enough from blue and green to avoid confusion in the toolbar cluster.
- **Orange** (`#f97316`): Review queue. High visibility for attention-worthy state.
- **Red** (`#ef4444`): Destructive actions (delete). Hover-revealed to reduce visual noise until needed.
- **Indigo** (`#4f46e5`): TXT export. Secondary export, tonally separated from purple SRT export.

Each accent color uses exactly two stops: a base and a hover (darkened by ~10%). No gradients, no opacity tricks.

## Typography

The app uses the system font stack for native feel and zero-load-time performance. Chinese text renders in PingFang SC; Latin in the system sans-serif.

- **Body text**: 14px / 1.6 line-height — comfortable for extended reading of subtitle content
- **Headings**: 16px / 600 weight — subtle hierarchy, not shouting
- **Captions / metadata**: 12px — timecodes, character counts, status labels
- **Mono**: Used exclusively for timecodes (`00:00:03.375`) and API key input

Font weights are limited to 400 (body) and 600 (emphasis). No light weights, no bold-black — the system stack already has enough presence at regular weight.

## Elevation

The app uses a flat, single-surface model. There is no layered elevation system — the interface is essentially one plane with a page background behind it.

- **Page background**: `#f5f5f5` — visually separates the app window from the content area
- **Surfaces**: White (`#ffffff`), separated by 1px gray-100/200 borders. No box-shadow on panels or cards.
- **Modals**: The only element with elevation — `shadow-2xl` (24px spread) on a white rounded-xl container, over a `rgba(0,0,0,0.4)` backdrop. Modals are the sole interruption to the flat plane.

## Components

### Buttons

Three tiers, all using `rounded-lg` (8px) and the same vertical rhythm (py-2 / 8px vertical):

| Variant | Background | Text | Usage |
|---------|-----------|------|-------|
| Primary | blue-600 | white | Upload, Save |
| Functional | green/purple/indigo-600 | white | Translate, Export |
| Secondary | gray-100 | gray-700 | Settings, Cancel |

All buttons share: 14px font, medium weight, no border, hover darkens background by ~10%, `transition-colors`. Disabled state: `opacity-40` with `cursor-not-allowed`.

### Inputs

Single-line inputs (timecodes, text fields) and textareas share the same treatment:
- 1px `border-gray-200` border, `rounded` (4px), no inner shadow
- Focus: 1px `ring-blue-400` (lightweight, not the chunky 2px ring on thicker fields)
- Background: white default, `bg-gray-50` for timecode fields (to visually separate metadata from content)
- Textarea: `resize-none`, rows auto-calculated from content length

### Modals

Centered, fixed-position overlay. White container (`rounded-xl`, `shadow-2xl`), backdrop (`bg-black/40`). Header with title + close, body with form content, footer with action buttons right-aligned.

### Toolbar

White bar with `shadow-sm` (subtle 1-2px), 1px `border-gray-200` bottom. Left-aligned action buttons, right-aligned export buttons. A `flex-1` spacer separates the two groups.

## Do's and Don'ts

### Do
- Use the system font stack everywhere — no custom web fonts
- Flat backgrounds, 1px borders for separation, no shadows except modals
- Each functional action gets a distinct, consistent color (translate = always green, export = always purple)
- Hover-reveal secondary actions (delete ✕) to reduce visual noise
- Keep buttons at 14px font, medium weight — one size across the app

### Don't
- Don't add box-shadow to panels, cards, or toolbars (modal only exception)
- Don't use gradients, even on buttons
- Don't introduce new accent colors — the six-color system covers all needed states
- Don't nest rounded containers inside other rounded containers
- Don't use bold (700+) font weights — medium (600) is sufficient for all emphasis
