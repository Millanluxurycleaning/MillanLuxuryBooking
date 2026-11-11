# Millan Luxury Cleaning - Design Guidelines

## Design Approach
**Reference-Based:** Inspired by luxury hospitality brands (Airbnb's trust-building + high-end spa/hotel aesthetics). Focus on tranquility, elegance, and visual storytelling through before/after transformations.

## Typography System
- **Primary Font:** Playfair Display (serif) for headings - conveys luxury and elegance
- **Secondary Font:** Inter (sans-serif) for body text - ensures readability
- **Hierarchy:**
  - H1: 3xl to 5xl - Playfair Display, font-weight 600
  - H2: 2xl to 4xl - Playfair Display, font-weight 600
  - H3: xl to 2xl - Playfair Display, font-weight 500
  - Body: base to lg - Inter, font-weight 400
  - Accent text: sm to base - Inter, font-weight 500

## Layout System
**Spacing Primitives:** Use Tailwind units of 4, 6, 8, 12, 16, 20, 24 for consistent rhythm
- Section padding: py-16 to py-24 (desktop), py-12 (mobile)
- Container: max-w-7xl with px-6 to px-8
- Grid gaps: gap-6 to gap-8
- Card padding: p-6 to p-8

## Component Library

### Navigation
- Fixed transparent header that becomes solid on scroll
- Logo (gold crown icon) aligned left
- Navigation links centered: About, Services, Gallery, Contact
- Primary CTA button (Book Now) aligned right with gold accent
- Mobile: Hamburger menu with slide-in drawer

### Hero Section
- Full-viewport height (90vh to 100vh)
- Background: Lush tropical leaf imagery (botanical, Feng Shui aesthetic) with subtle parallax effect
- Overlay: Soft gradient (dark at bottom for text legibility)
- Content centered:
  - Gold crown icon/logo (large, prominent)
  - Main headline: "Crowning Every Space in Sparkle" - Playfair Display
  - Subheading: "An immaculate home should feel like a retreat—restful, rejuvenating, and refined"
  - Primary CTA: "Book Here" button with blurred background, gold border
  - Secondary text: "Serving Phoenix, AZ"

### Interactive Before/After Gallery
**Critical Feature - Must be visually impressive:**
- Masonry grid layout (3 columns desktop, 2 tablet, 1 mobile)
- Each image card:
  - Hover effect: Slight scale (1.05), shadow elevation
  - Click opens lightbox modal with full-size image
  - "Before" and "After" labels in corners (small, elegant typography)
- Lightbox modal:
  - Dark backdrop with blur
  - Navigation arrows (prev/next)
  - Close button (top-right)
  - Image captions with location/service type
- Filter options above gallery: All, Deep Cleaning, Move-In/Out (pill-style buttons)

### Services Showcase
- 2x2 grid (desktop), stacked (mobile)
- Each service card:
  - High-quality cleaning image as background
  - Gradient overlay for text legibility
  - Service icon (gold accent)
  - Service name (H3)
  - Brief description (2-3 lines)
  - "Book This Service" CTA button
- Services: Deep Cleaning, Basic Cleaning, Move-In/Move-Out, Laundry Services

### Testimonials Section
- Centered heading: "What Clients Say"
- 3-column grid (desktop), carousel (mobile)
- Each testimonial card:
  - 5-star rating (gold stars)
  - Quote text (larger font, italic)
  - Client name and initial
  - Subtle shadow, rounded corners
- "Read More on Yelp" link button

### FAQ Section
- Accordion-style layout
- Questions from Q&A:
  - What's included in deep cleaning?
  - Are services pet-friendly?
  - Cancellation policy?
  - How to book?
  - Service areas?
- Each item: Expandable with smooth transition, plus/minus icon

### Business Hours Display
- Elegant table format within a card
- Two columns: Day | Hours
- Mon-Fri: 7:00 AM - 6:00 PM
- Sat: 8:00 AM - 5:00 PM
- Sun: 9:00 AM - 3:00 PM
- Placed in Contact section

### Contact Section
- Split layout: Left (contact form), Right (info + map placeholder)
- Contact info:
  - Phone: (661) 941-8765
  - Email: millanluxurycleaning@gmail.com
  - Address: 811 N 3rd St, Phoenix AZ, 85004
  - Instagram: @millanluxurycleaning (icon link)
- Simple contact form: Name, Email, Service Type (dropdown), Message
- "Send Message" CTA button

### Footer
- Three columns: About snippet, Quick links, Social/Contact
- Newsletter signup (optional)
- Copyright notice
- Background: Subtle botanical pattern

## Images
**Required Images:**
1. **Hero Background:** Lush tropical green leaves (full-width, high-res) - conveys Feng Shui calm
2. **Gallery:** 12-16 before/after cleaning photos (kitchens, bathrooms, living spaces)
3. **Service Cards:** 4 high-quality cleaning images showing each service type
4. **About Section:** Professional photo of Ivan Millan (optional but builds trust)
5. **Botanical Accents:** Green leaf graphics scattered throughout as decorative elements

## Animations
**Minimal and purposeful:**
- Smooth scroll behavior
- Fade-in on scroll for sections
- Parallax effect on hero background (subtle)
- Gallery image hover scale
- Accordion expand/collapse
- Navigation scroll transition

## Accessibility
- Proper heading hierarchy (H1-H6)
- Alt text for all images
- ARIA labels for interactive elements
- Keyboard navigation for gallery
- Focus states for all interactive elements
- Sufficient contrast ratios throughout