# Frontend Design Overhaul Plan

## Cinematic Noir - Movie Recommendation App

---

## 1. Design System Specification

### 1.1 Aesthetic Direction: Cinematic Noir

A refined dark theme inspired by classic film noir and modern cinema, featuring:

- **Deep blacks** (#0a0a0a, #121212) as primary backgrounds
- **Rich dark grays** (#1a1a1a, #252525) for cards and surfaces
- **Warm amber/gold accents** (#d4a853, #f5c761) - like theater lighting
- **Subtle cream** (#f5f0e6) for text
- **Muted burgundy** (#8b2942) for premium/CTA elements

### 1.2 Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Display/Headings | **Cormorant Garamond** (Google Fonts) | 600-700 | 2.5rem - 4rem |
| Subheadings | **Cormorant Garamond** | 500 | 1.5rem - 2rem |
| Body Text | **DM Sans** (Google Fonts) | 400-500 | 0.875rem - 1rem |
| Captions/Labels | **DM Sans** | 500 | 0.75rem |
| Monospace (keys) | **JetBrains Mono** | 400 | 0.875rem |

### 1.3 Color Palette (CSS Variables)

```css
:root {
  /* Base */
  --color-bg-primary: #0a0a0a;
  --color-bg-secondary: #121212;
  --color-bg-card: #1a1a1a;
  --color-bg-elevated: #252525;
  --color-bg-hover: #2a2a2a;
  
  /* Accent - Warm Amber/Gold */
  --color-accent-primary: #d4a853;
  --color-accent-secondary: #f5c761;
  --color-accent-muted: #a68a4b;
  --color-accent-glow: rgba(212, 168, 83, 0.3);
  
  /* Premium/Burgundy */
  --color-premium: #8b2942;
  --color-premium-light: #a83254;
  
  /* Text */
  --color-text-primary: #f5f0e6;
  --color-text-secondary: #b8b0a4;
  --color-text-muted: #6b6560;
  
  /* States */
  --color-success: #4ade80;
  --color-warning: #fbbf24;
  --color-error: #f87171;
  --color-info: #60a5fa;
  
  /* Borders */
  --color-border: rgba(212, 168, 83, 0.15);
  --color-border-hover: rgba(212, 168, 83, 0.3);
  
  /* Effects */
  --shadow-card: 0 4px 24px rgba(0, 0, 0, 0.6);
  --shadow-elevated: 0 8px 40px rgba(0, 0, 0, 0.8);
  --shadow-glow: 0 0 30px var(--color-accent-glow);
}
```

### 1.4 Visual Effects

- **Film grain overlay**: Subtle noise texture (CSS)
- **Card shadows**: Dramatic depth with amber glow on hover
- **Gradients**: Subtle radial gradients from corners
- **Borders**: Thin gold borders with low opacity
- **Backdrop blur**: For modals and overlays
- **Transitions**: 300ms ease-out for all interactions

---

## 2. Implementation Phases

### Phase 1: Foundation (Core Design System)

**Files to modify:**

- `src/index.css` - Add CSS variables, fonts, base styles, film grain
- `tailwind.config.js` - Extend theme with custom colors, fonts
- `src/env.d.ts` - Add font type declarations

**Changes:**

1. Import Google Fonts (Cormorant Garamond, DM Sans, JetBrains Mono)
2. Define all CSS variables
3. Create base styles for headings, body, buttons
4. Add film grain texture overlay
5. Configure Tailwind with custom theme
6. Create utility classes for common patterns

**Deliverables:**

- Working design system with CSS variables
- Updated Tailwind configuration
- Film grain and ambient background effects

---

### Phase 2: Component Library

**New files to create:**

- `src/components/ui/Button.tsx` - Cinematic styled buttons
- `src/components/ui/Input.tsx` - Elegant form inputs
- `src/components/ui/Card.tsx` - Movie card component
- `src/components/ui/Modal.tsx` - Backdrop-blur modals
- `src/components/ui/Badge.tsx` - Status badges
- `src/components/ui/Toast.tsx` - Notification toasts
- `src/components/ui/Skeleton.tsx` - Loading skeletons

**Design patterns:**

- Buttons: Gold border, amber glow on hover, subtle scale animation
- Cards: Dark bg, gold border on hover, dramatic shadow
- Inputs: Bottom border style, amber focus glow
- Modals: Backdrop blur, slide-up animation

**Deliverables:**

- Reusable UI component library
- Consistent styling across all components

---

### Phase 3: Main App Layout

**Files to modify:**

- `src/App.tsx` - Refactor with new design system
- `src/AppRouter.tsx` - Update routing styles

**Layout changes:**

1. **Header/Navbar**
   - Transparent background with blur on scroll
   - Logo with elegant serif typography
   - Navigation with gold underline on active
   - User avatar with dropdown

2. **Search Section**
   - Large elegant search bar with amber glow
   - Voice search button with pulsing animation
   - Quick filters as pill buttons

3. **Recommendations Grid**
   - Masonry-style or elegant grid layout
   - Movie cards with poster, title, rating
   - Hover: Scale up, show details, gold border glow

4. **Sidebar/ Panels**
   - Settings panel with frosted glass effect
   - Conversation panel with chat bubbles

**Deliverables:**

- Complete app layout with Cinematic Noir theme
- All sections properly styled

---

### Phase 4: Authentication & Onboarding

**Files to modify:**

- `src/components/OnboardingFlow.tsx`
- `src/components/ApiKeyModal.tsx`
- `src/components/SubscriptionModal.tsx`
- `src/contexts/AuthContext.tsx`

**Design changes:**

1. **Onboarding Flow**
   - Multi-step wizard with progress indicator
   - Elegant form inputs with amber focus
   - Premium tier cards with burgundy accents
   - Smooth transitions between steps

2. **Login/Signup**
   - Centered modal with backdrop blur
   - OAuth buttons with custom styling
   - Email/password form with elegant inputs

3. **Subscription Modal**
   - Two-column pricing cards
   - Premium card with burgundy gradient
   - Feature comparison with checkmarks

**Deliverables:**

- Beautifully styled authentication flow
- Consistent onboarding experience

---

### Phase 5: Advanced Features

**Files to modify:**

- `src/components/AdminDashboard.tsx`
- `src/pages/AdminPage.tsx`
- Various utility modals in App.tsx

**Design changes:**

1. **Admin Dashboard**
   - Stats cards with elegant numbers
   - Charts with dark theme
   - Data tables with gold accents
   - Responsive grid layout

2. **Settings Panels**
   - Collapsible sections
   - Toggle switches with amber glow
   - Dropdown selects with custom styling

3. **Error/Success States**
   - Elegant error banners with amber border
   - Success toasts with subtle animations
   - Loading states with skeleton screens

**Deliverables:**

- All features consistently styled
- Polished user experience

---

### Phase 6: Animations & Polish

**Files to modify:**

- `src/index.css` - Add animation keyframes
- Various components - Add motion

**Animation effects:**

1. **Page Load**
   - Staggered fade-in for hero elements
   - Cards appear with slide-up effect

2. **Micro-interactions**
   - Button hover: subtle glow and scale
   - Card hover: lift effect with shadow
   - Input focus: amber glow pulse

3. **Transitions**
   - Page transitions: fade + slide
   - Modal: backdrop fade + content slide-up
   - Dropdown: slide + fade

4. **Ambient Effects**
   - Subtle floating particles (optional)
   - Gradient pulse on premium elements

**Deliverables:**

- Smooth, polished animations
- Delightful user experience

---

## 3. Technical Implementation

### 3.1 File Structure

```
src/
├── components/
│   ├── ui/                    # New UI component library
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   ├── Toast.tsx
│   │   └── Skeleton.tsx
│   ├── OnboardingFlow.tsx     # Refactor
│   ├── ApiKeyModal.tsx        # Refactor
│   ├── SubscriptionModal.tsx  # Refactor
│   └── AdminDashboard.tsx     # Refactor
├── contexts/
│   └── AuthContext.tsx        # Minor updates
├── pages/
│   └── AdminPage.tsx          # Minor updates
├── styles/
│   └── animations.css         # New - animation keyframes
├── index.css                  # Complete overhaul
├── tailwind.config.js         # Extend theme
└── App.tsx                    # Refactor with new components
```

### 3.2 Dependencies

No new dependencies required. Using:

- Existing Tailwind CSS
- CSS animations (no Motion library needed for simplicity)
- Lucide React icons (keep using, already installed)

### 3.3 Backward Compatibility

- All existing functionality preserved
- Same React components and state management
- Same API integrations
- Same routing structure

---

## 4. Acceptance Criteria

### Visual Checkpoints

- [ ] Dark theme with warm amber accents throughout
- [ ] Cormorant Garamond for headings, DM Sans for body
- [ ] Film grain texture visible on backgrounds
- [ ] Cards have dramatic shadows and gold glow on hover
- [ ] All buttons have elegant hover states
- [ ] Modals have backdrop blur effect
- [ ] Smooth animations on page load and interactions

### Functional Checkpoints

- [ ] Search functionality works
- [ ] Voice search works
- [ ] Onboarding flow completes
- [ ] Authentication works
- [ ] Subscription selection works
- [ ] Admin dashboard displays data
- [ ] All existing features work

### Performance

- [ ] No layout shifts
- [ ] Animations run at 60fps
- [ ] No console errors

---

## 5. Implementation Order

1. **Setup** - CSS variables, fonts, Tailwind config
2. **UI Library** - Create reusable components
3. **Main Layout** - Header, search, grid
4. **Auth/Onboarding** - Login, signup, onboarding
5. **Features** - Settings, admin, modals
6. **Polish** - Animations, micro-interactions

---

## 6. Estimated Timeline

| Phase | Complexity | Time |
|-------|------------|------|
| Phase 1: Foundation | Medium | 30 min |
| Phase 2: UI Library | High | 45 min |
| Phase 3: Main Layout | High | 60 min |
| Phase 4: Auth/Onboarding | Medium | 30 min |
| Phase 5: Features | Medium | 30 min |
| Phase 6: Polish | Low | 20 min |
| **Total** | - | **~3.5 hours** |

---

## 7. Next Steps

Once approved, I'll proceed with implementation starting from Phase 1 (Foundation). Each phase will be validated before moving to the next.

Shall I proceed with the implementation?
