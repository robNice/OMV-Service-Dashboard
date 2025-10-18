Place your background images here.
 
Naming conventions used by /public/js/bg.js:
 
- Home (/) background:           `_home.jpg`
- Default fallback background:    `_default.jpg`
- Section pages (/section/:slug): first existing of
    1) `section-:slug.jpg`
    2) `:slug.jpg`
    3) `_default.jpg`
 
Tips:
- Use 1920×1080 or larger (16:9 or 21:9 also fine). The layer is blurred and scaled.
- Prefer JPG (progressive) to keep size small; aim for ~200–400 KB.
- The UI adds a subtle dark radial overlay for readability; compose your images accordingly.
