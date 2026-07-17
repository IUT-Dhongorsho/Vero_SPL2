# Vero by Figma - UI/UX & Style Summary

## UI/UX Design and Decisions

- **Vibe & Feel:** The frontend exudes a soft, modern aesthetic with a gentle purple/indigo tinted light mode background (`#F6F5FF`) contrasted against deep `oklch`-based pure blacks in dark mode for vivid clarity.
- **Color Scheme:** Primary accents use a distinct Indigo (`#5B5BD6`), scaling dynamically in dark mode. It avoids heavy glassmorphism, favoring solid colors with subtle, semi-transparent rings and borders for depth.
- **Component Ergonomics:** UI primitives leverage Radix UI for structural accessibility but rely directly on Tailwind classes rather than a formal component library, allowing for bespoke, soft-edged designs.
- **Framework & Build Tool:** React with Vite.
- **Styling:** Tailwind CSS is the primary styling engine. The project utilizes utilities like `tailwind-merge` and `clsx` to efficiently construct dynamic classes.
- **Component Architecture:** Heavily relies on Radix UI for building highly accessible, unstyled primitives (Dialogs, Popovers, Accordions, Select, Tooltips, etc.).
- **Animations:** Integrates `motion` (Framer Motion) and `tw-animate-css` for fluid, dynamic micro-interactions and transitions, ensuring the UI feels alive.
- **State Management:** Uses `zustand` for lightweight, scalable global state management across screens.
- **Icons:** Combines `lucide-react` and `@mui/icons-material` for a comprehensive iconography set.
- **Charts:** Implements `recharts` for data visualization on the dashboard and other hubs.

## UI Libraries

- `@mui/material` & `@mui/icons-material`
- `@radix-ui/react-*` (Accordion, Dialog, Popover, Select, Tooltip, etc.)
- `tailwindcss` (with `@tailwindcss/vite`)
- `lucide-react`
- `motion` (Framer Motion)
- `recharts`
- `zustand`

## Screens / Pages

Located in `src/pages/`:

- `Chat.tsx`
- `Dashboard.tsx`
- `Kanban.tsx`
- `Meet.tsx`
- `ModuleHub.tsx`
- `Notes.tsx`
- `ProjectHub.tsx`
- `SignIn.tsx`

## Components List

- **Layout Components** (`src/components/layout/`):
  - `Layout.tsx`
  - `LeftDock.tsx`
  - `TopBar.tsx`
- **UI Components** (`src/components/ui/`):
  - `FormField.tsx`
- **Shared Components** (`src/components/shared/`):
  - `Avatar.tsx`
