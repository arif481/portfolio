# Portfolio

My personal site: my research, what I've built, and how to reach me.

**Live:** https://arif481.github.io/portfolio/

It is a single static page in HTML, CSS and JavaScript with no build step. Animation uses [GSAP](https://gsap.com/) with ScrollTrigger and [Lenis](https://github.com/darkroomengineering/lenis) for smooth scrolling, all loaded from CDNs with Subresource Integrity hashes.

## Sections

1. Hero: an interactive network on a canvas (it reacts to the mouse, and a click sends a burst of signals), letter-by-letter name reveal and a scrambling role line
2. Highlights with count-up numbers, and a marquee that speeds up and leans with scroll velocity
3. About
4. Research: the code-generation paper, with an animated bar chart of its LiveCodeBench results
5. Selected work: a pinned section that scrolls sideways on desktop, with tilting cards and live animated previews
6. Experience: a timeline whose line draws as you scroll
7. Toolbox
8. Contact: copy-to-clipboard email and a Formspree form

## Details

- Dark and light themes, following the system setting until you pick one.
- Custom cursor and magnetic buttons on devices with a mouse; touch devices get the normal cursor.
- With "reduce motion" turned on in the OS, the preloader, smooth scroll, pinning and all animation are skipped and the page renders static. If the CDN scripts fail to load, the content still shows.
- Responsive down to phone width, where the project cards stack vertically.
- Skip link, ARIA labels and semantic HTML for screen readers and keyboard users.
- Open Graph and Twitter Card tags, `robots.txt` and `sitemap.xml`.
- Deployed to GitHub Pages by a GitHub Actions workflow on every push to `main`.

## Files

```
index.html        page content
styles.css        all styles, including responsive and reduced-motion rules
script.js         animation and interaction
assets/           project screenshots (WebP)
arif.jpeg, logo.png
Resume.pdf        resume linked from the nav and the hero
robots.txt, sitemap.xml
.github/workflows/deploy.yml
```

To preview locally, run `python3 -m http.server` in this folder and open http://localhost:8000.

## Contact

- LinkedIn: [arif481](https://www.linkedin.com/in/arif481)
- Email: mdarifuzzaman481@gmail.com

## License

[MIT](LICENSE)
