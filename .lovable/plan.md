
## Plan: Replace Homepage with Dexerto-Style Design

### Overview
This plan replaces the entire homepage with a Dexerto-inspired design featuring a mega menu navigation with image-rich dropdowns, a new SVG logo, and updated layout - all using CSS animations instead of framer-motion.

---

### Architecture Changes

```text
Current Structure:
+------------------+
|     Header       | (simple nav with categories)
+------------------+
|   TrendingBar    | (horizontal scrolling links)
+------------------+
|    PostGrid      | (WordPress posts)
+------------------+
|     Footer       |
+------------------+

New Structure:
+------------------+
| DexertoNavigation| (mega menu with dropdowns)
+------------------+
|   Hero Section   | (featured content - optional)
+------------------+
|   Content Grid   | (static mock data initially)
+------------------+
|     Footer       |
+------------------+
```

---

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/DexertoNavigation.tsx` | New mega menu navigation component with CSS animations |
| `src/components/DexertoLogo.tsx` | SVG logo component |
| `src/data/nav-items.ts` | Navigation data (Gaming, TV & Movies, Entertainment, etc.) |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Replace with new Dexerto-style homepage layout |
| `src/components/Layout.tsx` | Use DexertoNavigation instead of Header |
| `src/index.css` | Add mega menu animations and styles |

---

### Implementation Details

#### 1. Navigation Data (`src/data/nav-items.ts`)

Static data structure for the mega menu:

```typescript
export const NAV_ITEMS = [
  {
    title: 'Gaming',
    href: '#',
    popular: [
      { name: 'Call of Duty', href: '#', image: '...' },
      { name: 'Pokemon', href: '#', image: '...' },
      // ... more items
    ],
    more: ['EA Sports FC', 'Valorant', 'Apex Legends', ...],
    viewAllLabel: 'View All Games'
  },
  // ... TV & Movies, Entertainment, Esports, etc.
];
```

#### 2. DexertoLogo Component (`src/components/DexertoLogo.tsx`)

SVG logo component with customizable className:

```typescript
export const DexertoLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 166 45" className={className} fill="currentColor">
    {/* SVG path data */}
  </svg>
);
```

#### 3. DexertoNavigation Component (`src/components/DexertoNavigation.tsx`)

Key features:
- Sticky header with logo
- Desktop mega menu dropdowns (hover-activated)
- Mobile slide-in sidebar menu
- Search button, Settings, Login/Signup actions
- CSS-only animations for dropdowns

```typescript
export const DexertoNavigation = () => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-background border-b">
        {/* Logo */}
        {/* Desktop Nav with hover dropdowns */}
        {/* Action buttons (search, settings, auth) */}
        {/* Mobile menu toggle */}
      </header>

      {/* Mobile Sidebar Overlay */}
      {/* Mobile Sidebar Panel */}
    </>
  );
};
```

**Mega Menu Dropdown Structure:**
```text
+------------------------------------------+
| Popular (with images)    | More Section  |
| +---------+ +---------+  | - Link 1      |
| | Image 1 | | Image 2 |  | - Link 2      |
| | Title   | | Title   |  | - Link 3      |
| +---------+ +---------+  | - Link 4      |
| +---------+ +---------+  |               |
| | Image 3 | | Image 4 |  | View All ->   |
| +---------+ +---------+  |               |
+------------------------------------------+
```

#### 4. CSS Animations (`src/index.css`)

Add keyframes and utility classes for:

```css
/* Mega menu dropdown animation */
@keyframes dropdown-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-dropdown-in {
  animation: dropdown-in 0.2s ease-out;
}

/* Mobile sidebar slide animation */
@keyframes slide-in-right {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s ease-out;
}

/* Backdrop fade */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}
```

#### 5. Updated Index.tsx

Replace current homepage with new layout:

```typescript
const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <DexertoNavigation />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero/Featured Section */}
        {/* Content Grid */}
      </main>
      
      <Footer />
    </div>
  );
};
```

#### 6. Updated Layout.tsx

Option to use DexertoNavigation for homepage:

```typescript
export function Layout({ children, posts, useDexertoNav = false }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {useDexertoNav ? <DexertoNavigation /> : <Header />}
      {!useDexertoNav && <TrendingBar posts={posts} />}
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
```

---

### Technical Details

**Desktop Mega Menu Behavior:**
- Dropdown appears on hover (onMouseEnter/onMouseLeave)
- CSS animation for smooth fade-in + slide
- Dropdown positioned below nav item, full-width or constrained

**Mobile Menu Behavior:**
- Hamburger icon toggles sidebar
- Overlay backdrop with click-to-close
- Slide-in panel from right
- Accordion-style category expansion

**Responsive Breakpoints:**
- `lg:` (1024px+): Full desktop mega menu
- `<lg`: Mobile hamburger menu

---

### Visual Changes Summary

| Element | Before | After |
|---------|--------|-------|
| Logo | iGeeksBlog PNG | Dexerto SVG |
| Navigation | Simple horizontal links | Mega menu with image dropdowns |
| Theme Toggle | In header | Removed (or moved to settings) |
| Mobile Menu | Dropdown below header | Slide-in sidebar |
| Auth Buttons | None | Log in / Sign up |
| Search | Modal | Button in header |

---

### Considerations

1. **WordPress Integration**: The new design uses static mock data. To integrate with WordPress later, the navigation items can be mapped from WordPress categories.

2. **SEO**: The homepage keeps semantic HTML with proper headings and navigation landmarks.

3. **Performance**: CSS animations are GPU-accelerated and perform better than JavaScript animations.

4. **Dark Mode**: The existing theme system remains functional - the new components will use the same CSS variables.
