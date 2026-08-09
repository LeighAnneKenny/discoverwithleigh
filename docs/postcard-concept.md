# Postcard concept — preserved design (PRD item 25, option C)

Workshopped 2026-08-09 and held for later use by Caveshen. Not built. The
Visitors section shipped as option B (Instax mini-strip); this postcard is
the blessed "we could use it later" direction.

**The idea:** a paper postcard, light in both themes (paper stays paper, as
film stays dark). Photo on one panel. On the other: a dashed divider, a
handwritten-voice message signed by Leigh-Anne, ruled address lines
("To: *you, on holiday*"), and the signature detail — **the brand aperture
mark as a postage stamp**, cancelled by a circular CAPE TOWN postmark with
wavy ink lines (inline SVG, `textPath` for the curved text).

Copy below still carries em-dashes and delivery promises; both must be
re-reviewed before any real use.

## Markup (Astro; `Aperture` is the existing brand-mark component)

```astro
<div class="postcard">
  <figure class="postcard-photo">
    <img src={pic.url} width={pic.w} height={pic.h} alt="Vacation photograph" loading="lazy" decoding="async" />
  </figure>
  <div class="postcard-back">
    <div class="postcard-head">
      <p class="postcard-title">Greetings from <strong>Cape Town</strong></p>
      <div class="stamp-corner">
        <span class="stamp"><Aperture class="stamp-mark" /><span class="stamp-label">South Africa</span></span>
        <svg class="postmark" viewBox="0 0 120 90" aria-hidden="true">
          <circle cx="45" cy="45" r="32" fill="none" stroke="currentColor" stroke-width="1.5" />
          <circle cx="45" cy="45" r="24" fill="none" stroke="currentColor" stroke-width="0.75" />
          <path id="pm-arc" d="M 45 14 A 31 31 0 1 1 44.9 14" fill="none" />
          <text font-size="8.5" letter-spacing="2.5"><textPath href="#pm-arc" startOffset="2">CAPE TOWN · SOUTH AFRICA</textPath></text>
          <text x="45" y="48" text-anchor="middle" font-size="8">09 AUG 2026</text>
          <path d="M 78 32 q 10 -4 20 0 t 20 0" fill="none" stroke="currentColor" stroke-width="1.5" />
          <path d="M 78 42 q 10 -4 20 0 t 20 0" fill="none" stroke="currentColor" stroke-width="1.5" />
          <path d="M 78 52 q 10 -4 20 0 t 20 0" fill="none" stroke="currentColor" stroke-width="1.5" />
        </svg>
      </div>
    </div>
    <div class="postcard-body">
      <div class="postcard-message">
        <p>Couples, families, proposals, special occasions — photographed at your accommodation or out on location, anywhere in Cape Town.</p>
        <p>Tell me your dates. I’ll build the shoot around your stay — and your photos land within days, often before you fly home.</p>
        <p class="postcard-sig">— Leigh-Anne</p>
      </div>
      <div class="postcard-address" aria-hidden="true">
        <span class="addr-line">To: <em>you, on holiday</em></span>
        <span class="addr-line"></span>
        <span class="addr-line"></span>
      </div>
    </div>
  </div>
</div>
```

## Styles (site tokens: `--font-display`, `--font-label`, `--measure`)

```css
.postcard {
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  width: min(100%, 54rem);
  min-height: 21rem;
  background: #f4f2ec;
  color: #1c211f;
  rotate: -1.2deg;
  box-shadow: 0 1.2rem 2.4rem rgb(7 9 8 / 0.35);
  border-radius: 3px;
}
.postcard-photo { margin: 0; padding: 0.6rem; }
.postcard-photo img { display: block; width: 100%; height: 100%; object-fit: cover; }
.postcard-back {
  display: flex;
  flex-direction: column;
  padding: 1.1rem 1.2rem 1.2rem;
  border-left: 1px dashed #b9b4a6;
}
.postcard-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; }
.postcard-title {
  font-family: var(--font-display);
  font-size: 1.05rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  max-width: 9rem;
}
.postcard-title strong { display: block; font-size: 1.5rem; color: #00877e; }
.stamp-corner { position: relative; flex: none; }
.stamp {
  display: grid;
  justify-items: center;
  gap: 0.25rem;
  width: 4.2rem;
  padding: 0.45rem 0.3rem 0.35rem;
  background: #fff;
  border: 1px solid #d8d4c8;
  outline: 3px solid #fff;
  outline-offset: -6px;
}
.stamp-mark { width: 2.1rem; height: 2.1rem; color: #00877e; }
.stamp-label {
  font-family: var(--font-label);
  font-size: 0.4rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #55605c;
}
.postmark {
  position: absolute;
  top: -0.9rem;
  right: 1.9rem;
  width: 7.5rem;
  color: #3a423f;
  opacity: 0.55;
  rotate: -8deg;
  font-family: var(--font-label);
  font-weight: 600;
  pointer-events: none;
}
.postmark text { fill: currentColor; }
.postcard-body { display: grid; grid-template-columns: 1.2fr 1fr; gap: 1.2rem; flex: 1; margin-top: 1rem; }
.postcard-message {
  font-style: italic;
  font-size: 0.92rem;
  line-height: 1.55;
  color: #2c332f;
  display: grid;
  gap: 0.6rem;
  align-content: center;
}
.postcard-sig { font-family: var(--font-display); font-style: normal; letter-spacing: 0.05em; }
.postcard-address {
  display: grid;
  align-content: end;
  gap: 1.4rem;
  padding-bottom: 0.5rem;
  border-left: 1px solid #d8d4c8;
  padding-left: 1.2rem;
}
.addr-line {
  border-bottom: 1px solid #b9b4a6;
  font-style: italic;
  font-size: 0.85rem;
  color: #55605c;
  padding-bottom: 0.15rem;
  min-height: 1.3rem;
}
@media (max-width: 900px) {
  .postcard { grid-template-columns: 1fr; }
  .postcard-photo { aspect-ratio: 3 / 2; overflow: hidden; }
  .postcard-body { grid-template-columns: 1fr; }
  .postcard-address { border-left: 0; padding-left: 0; }
}
```
