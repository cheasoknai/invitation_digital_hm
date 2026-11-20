# Invitation Digital: Lay TongHour & Tha SivMinh (H&M)

[![React](https://img.shields.io/badge/React-19.3.1-61DAFB?style=flat&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3.6-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-14.14-FF0055?style=flat&logo=framer)](https://www.framer.com/motion/)
[![License](https://img.shields.io/badge/License-Private-631A26?style=flat)]()

A bespoke, high-performance digital wedding invitation website designed with a **Khmer Traditional Luxury** aesthetic. Built for the wedding celebration of **Lay TongHour & Tha SivMinh** on **December 18, 2026** in Poipet City, Cambodia.

---

## ✦ Design Direction & Philosophy

- **Theme**: Khmer Traditional Luxury (សិរីសួស្តី អាពាហ៍ពិពាហ៍បែបប្រពៃណីខ្មែរ)
- **Palette**:
  - **Royal Burgundy** (`#631A26` / `#4E141E`): Ceremonial headings, primary action buttons, wax seal.
  - **Imperial Gold** (`#B59B6D` / `#D6C29F`): Traditional motifs, ornate borders, highlights, line-art icons.
  - **Warm Champagne / Rice Paper** (`#E6E2D8` / `#FDFBF7`): Background texture with subtle geometric watermarks.
  - **Earthy Deep Charcoal** (`#2C1810` / `#6E5B3E`): High-legibility Khmer & English typography.
- **Typography Stack**:
  - Headings: `KST CKS Moul` (Local Font) & `Moul` (Google Fonts)
  - Khmer Content: `Battambang`
  - Luxury English Display: `Cormorant Garamond`
  - Clean English UI: `Montserrat`
- **Bilingual Experience**: Fully realized in both Khmer and English across all ceremony cards, schedule nodes, and captions.

---

## ✦ Key Features & Capabilities

### 1. 3D Realistic Envelope Experience

- Interactive 3D folding top flap with wax seal medallion (`H&M`).
- Realistic invitation letter card sliding animation on open.
- Sound auto-unlock complying with browser autoplay restrictions.
- Re-test button for quick demonstration and previewing.

### 2. Groom & Bride Introduction (`CoupleSection`)

- Side-by-side couple introduction cards with parental lineage honorifics.
- Optimized WebP portrait integration with fallback to original raw master JPEG.
- Central gold monogram connector with traditional ampersand seal.

### 3. Wedding Date, Live Countdown & Calendar Integration (`WeddingDetails`)

- Date showcase badge highlighting December 18, 2026.
- Real-time live countdown ticker (Days, Hours, Minutes, Seconds).
- **Add to Calendar**:
  - **Google Calendar**: One-tap pre-filled calendar entry with venue, time, and navigation link.
  - **Apple / Outlook (.ics)**: Client-side RFC 5545 iCalendar generator for Apple Calendar and mobile calendar apps.

### 4. Ceremonial Schedule Timeline

- 3-3-2 structured horizontal schedule block matching authentic Cambodian wedding traditions:
  1. ០៥:៤០ ព្រឹក - យកពេលាកូនប្រុស (Morning Auspicious Time)
  2. ០៦:៣០ ព្រឹក - ពិធីក្រុងពាលី (Bay Sei Altar Offering)
  3. ០៧:០០ ព្រឹក - ពិធីហែជំនូន (Groom Procession)
  4. ០៨:០០ ព្រឹក - ពិធីពិសាកាហ្វេ និងនំចំណី (Morning Refreshments)
  5. ០៨:៣០ ព្រឹក - ពិធីកាត់សក់បង្កក់សិរី (Hair Cutting Ceremony)
  6. ០៩:៣០ ព្រឹក - ពិធីសែនចងដៃ និងសំពះផ្ទឹម (Monetary Chong Dai & Matrimonial Knot)
  7. ០៥:០០ ល្ងាច - ពិធីពិសាភោជនាហារ (Evening Reception Banquet)
  8. ០៦:០០ ល្ងាច - ពិធីកាត់នំខេក និងរាំកម្សាន្ត (Cake Cutting & Dance Celebration)
- Custom bespoke SVG gold line-art icons for each ceremonial offering.

### 5. Venue & Google Maps Navigation (`VenueSection`)

- Pinned wedding venue in Poipet City, Banteay Meanchey Province.
- Responsive Google Maps embed with lazy loading.
- **One-Tap Driving Directions**: Opens the Google Maps Directions API targeting exact coordinates (`13.6614444, 102.56125`) with automatic current location detection.

### 6. Pre-Wedding Photo Gallery (`PhotoGallery`)

- 25 professionally curated pre-wedding photographs in traditional Khmer wedding attire.
- **Synchronized Row Scroll Reveal**: Both photos in side-by-side rows animate in unison without intra-row lag.
- **Ultra-Fast WebP Grid**: Lightweight 600px thumbnails (~30KB each) preventing browser tab memory crashes (OOM).
- **Interactive Lightbox**: Fullscreen zoom, swipe gestures on mobile, keyboard navigation (Arrow keys / Esc), and adjacent image preloading.

### 7. Chong Dai (Monetary Gift) KHQR Card (`GiftQRCode`)

- Displays official Bakong / KHQR image (`sivminh_khqr.jpg`) with gold corner accents.
- **"Save QR Code" (រក្សាទុក QR)**: Direct image download to device camera roll for easy scanning in ABA Mobile or Bakong.
- **"Copy Account Info" (ចម្លងព័ត៌មាន)**: One-tap copy with animated checkmark feedback.

### 8. Traditional Background Music Control (`MusicControl`)

- Floating vinyl disc player styled with gold rims and play/pause indicators.
- Plays _"Romdoul Kratie (Khmer Traditional Instrument)"_ on loop.
- Unlocked seamlessly on the first envelope opening interaction.

### 9. Social Sharing & OpenGraph Cards (`ShareInvitation`)

- High-resolution OpenGraph (`og:image`, `og:title`, `og:description`) and Twitter Card tags configured in `index.html`.
- **Web Share API**: Invokes native mobile sharing sheet on iOS and Android.
- **Clipboard Fallback**: Smooth floating toast notification for desktop browsers.
- Luxury custom SVG favicon with traditional gold monogram.

---

## ✦ Technical Highlights & Architecture

### 1. Forward-Only, Repeatable Scroll Animations

Built using a custom `useScrollAnimation` and `useRowScrollAnimation` hook:

- **Top $\rightarrow$ Down**: Elements smoothly animate into the viewport.
- **Down $\rightarrow$ Top**: Elements remain completely locked in their visible state (zero reverse animation, zero disappearing).
- **Off-Screen Reset**: Elements reset silently (in 0ms) only when they are entirely below the viewport bottom, ready to smoothly replay on subsequent downward scrolls.
- Respects `prefers-reduced-motion` accessibility guidelines.

### 2. Image Optimization & Memory Management

| Asset Category         | Original Format | Optimized Format | Original Size | Optimized Size | Bandwidth Saved |
| :--------------------- | :-------------- | :--------------- | :------------ | :------------- | :-------------- |
| **Gallery Original**   | 25x DSLR JPEGs  | Touchless Backup | ~339.8 MB     | —              | Untouched       |
| **Gallery Optimized**  | WebP (1920px)   | Modal on-demand  | —             | ~6.61 MB       | 98.1%           |
| **Gallery Thumbnails** | WebP (600px)    | Grid layout      | —             | ~0.76 MB       | 99.8%           |
| **Couple Portraits**   | 24MP JPEGs      | WebP (1200x1800) | ~26.43 MB     | ~0.57 MB       | 97.8%           |

---

## ✦ Project Structure

```text
invitation_digital_hm/
├── public/
│   ├── assets/
│   │   ├── audio/
│   │   │   └── wedding_music.mp3       # Background wedding music
│   │   ├── fonts/
│   │   │   └── KST CKS Moul.ttf        # Local traditional Khmer Moul font
│   │   └── images/
│   │       ├── couple/
│   │       │   ├── tonghour.webp       # Optimized Groom portrait (1200x1800)
│   │       │   ├── sivminh.webp        # Optimized Bride portrait (1200x1800)
│   │       │   ├── tonghour.jpg        # Master high-res backup
│   │       │   └── sivminh.jpg         # Master high-res backup
│   │       ├── gallery/
│   │       │   ├── optimized/          # WebP full-size gallery photos (photo-01..25)
│   │       │   ├── thumbnails/         # WebP 600px grid thumbnails (photo-01..25)
│   │       │   └── original/           # Master original DSLR photos (photo-01..25)
│   │       └── qr/
│   │           └── sivminh_khqr.jpg    # Chong Dai KHQR image
│   └── favicon.svg                     # Luxury gold monogram SVG favicon
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   └── ScrollReveal.jsx        # Forward-only viewport animation wrapper
│   │   ├── AddToCalendar.jsx           # Google Calendar & Apple/Outlook (.ics)
│   │   ├── ClosingSection.jsx          # Final blessings, family signatures
│   │   ├── Countdown.jsx               # Live countdown clock ticker
│   │   ├── CoupleSection.jsx           # Groom & Bride introductions
│   │   ├── FloatingPetals.jsx          # Ambient floating gold petals
│   │   ├── GiftQRCode.jsx              # Chong Dai QR display, download & copy
│   │   ├── InvitationMessage.jsx       # Official hosts' formal greeting
│   │   ├── MusicControl.jsx            # Floating music disc toggle
│   │   ├── MyCredit.jsx                # Creator attribution and contact links
│   │   ├── Navigation.jsx              # Floating bottom navigation dock
│   │   ├── OpeningScreen.jsx           # 3D folding envelope cover
│   │   ├── PhotoGallery.jsx            # Multi-tier masonry gallery & Lightbox
│   │   ├── ShareInvitation.jsx         # Web Share API & link copy
│   │   └── VenueSection.jsx            # Google Maps embed & driving directions
│   ├── data/
│   │   └── invitation.js               # Single source of truth configuration
│   ├── hooks/
│   │   └── useScrollAnimation.js       # Forward-only scroll animation hook
│   ├── styles/
│   │   ├── variables.css               # Design tokens, colors, typography
│   │   └── global.css                  # Comprehensive luxury responsive styling
│   ├── App.jsx                         # Root application orchestration
│   └── main.jsx                        # React 19 entry point
├── index.html                          # SEO, OpenGraph, non-blocking fonts
├── package.json                        # Dependencies & build scripts
├── vite.config.js                      # Vite bundler configuration
└── README.md                           # Documentation
```

---

## ✦ Central Configuration Guide

All editable wedding details are managed in [`src/data/invitation.js`](src/data/invitation.js):

- **Couple Details**: Names in Khmer & English, parental lineage, photo paths.
- **Wedding Date**: ISO target date for countdown, formatted display strings in Khmer & English.
- **Schedule**: Event times, titles, descriptions, and icon types (Row 1 morning, Row 2 afternoon, Row 3 evening).
- **Venue & Map**: Venue names, addresses, Google Maps embed URL, destination GPS coordinates (`13.6614444, 102.56125`).
- **Gift QR Code**: Account name (`SIVMINH THA`), bank name, QR image path.
- **Audio Media**: Music source path and song title.
- **Social Sharing**: Metadata preview title and description.

---

## ✦ Getting Started

### Prerequisites

- **Node.js**: v18+ (tested on Node v26)
- **npm**: v9+

### Installation

```bash
git clone <repository-url>
cd invitation_digital_hm
npm install
```

### Local Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Quality Assurance & Linting

```bash
npm run lint
```

### Production Build

```bash
npm run build
```

The optimized production bundle will be output to the `dist/` folder.

Preview the production build locally:

```bash
npm run preview
```

---

## ✦ Deployment

### Deploying to Vercel

1. Install the Vercel CLI (`npm i -g vercel`) or link the GitHub repository in the Vercel Dashboard.
2. Build Settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Deploy:

```bash
vercel --prod
```

### Deploying to Netlify

1. Connect repository in Netlify Dashboard.
2. Build command: `npm run build`
3. Publish directory: `dist`

---

## ✦ Credits & Acknowledgements

- **Website Development & Creative Design**: **Chea Soknai**
- **Instagram**: [@nnnai_420](https://www.instagram.com/nnnai_420/)
- **Telegram**: [@CSoknai](https://t.me/CSoknai)
- **Facebook**: [Chea Soknai](https://www.facebook.com/cheasoknai180506/)
- **Tagline**: _"Make Invitation Comes Alive"_

---

_Designed and engineered with care for Lay TongHour & Tha SivMinh._
