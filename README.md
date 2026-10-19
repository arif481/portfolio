# Portfolio

My personal site: who I am, what I've built, and how to reach me.

**Live:** https://arif481.github.io/portfolio/

It is a single static page in plain HTML, CSS and JavaScript, with no framework or build step.

## Sections

1. Hero, with an animated intro line
2. About, with tabs for skills, experience and education
3. Services
4. Portfolio, with project cards and hover overlays
5. Contact: a form, social links and a CV download

## Details

- Dark theme with a pink accent (`#ff004f`), Poppins from Google Fonts and Font Awesome 6 icons.
- Responsive down to phone width, with a slide-out menu on small screens.
- Scroll animations use `IntersectionObserver`.
- The contact form posts to Formspree.
- Skip link, ARIA labels and semantic HTML for screen readers and keyboard users.
- Open Graph and Twitter Card tags, `robots.txt` and `sitemap.xml`.
- Deployed to GitHub Pages by a GitHub Actions workflow on every push to `main`.

## Files

```
index.html        page content
styles.css        all styles, including the responsive rules
logo.png, background.png, arif.jpeg   images
Resume.pdf        CV linked from the contact section
robots.txt, sitemap.xml
.github/workflows/deploy.yml
```

## Using it as a template

Fork it, swap the images and `Resume.pdf`, edit the content in `index.html`, change the accent colour in `styles.css`, and put your own Formspree form ID in the contact form. Then enable GitHub Pages with "GitHub Actions" as the source.

## Contact

- LinkedIn: [arif481](https://www.linkedin.com/in/arif481)
- Email: mdarifuzzaman481@gmail.com

## License

[MIT](LICENSE)
