# freshtouch-hx01
App FreshTouch HX01

## Contenido del repo

- `index.html`, `app.js`, `config.js`, `styles.css` — app de la cabina de autoservicio (pantalla táctil de la máquina HX01).
- `site/` — landing page pública de la marca FreshTouch by HYDROX (presentación, cómo funciona, planes/precios y contacto).

## Publicar la landing page con GitHub Pages

1. En GitHub, ve a **Settings → Pages** de este repositorio.
2. En **Source**, elige **GitHub Actions**.
3. Al hacer push a `main`, el workflow `.github/workflows/pages.yml` publica el repo completo:
   - App de la cabina: `https://<usuario>.github.io/freshtouch-hx01/`
   - Landing page: `https://<usuario>.github.io/freshtouch-hx01/site/`
