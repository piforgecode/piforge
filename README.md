# PiForge website

Statische website (HTML, CSS, JS). Geen build-stap nodig.

## Structuur
```
index.html       Oplossingen (home)
over-ons.html    Over ons, bedrijfsgegevens, betalen
contact.html     Klantenservice, formulier en FAQ
privacy.html     Privacyverklaring
404.html         Foutpagina
css/style.css    Styling
js/main.js       Menu, cookiebanner, formulier, instellingen
favicon.svg      Icoon
robots.txt
```

## Lokaal bekijken
```bash
cd piforge
python3 -m http.server 8000
```
Open daarna http://localhost:8000

## Online zetten op je eigen domein
1. **Gewone webhosting** (bijv. TransIP, Hostnet, Vimexx): upload alle bestanden naar de map `public_html` (of `www`) via FTP/SFTP.
2. **Eigen Raspberry Pi/server:** installeer nginx of Apache en zet de bestanden in `/var/www/html`. Voor HTTPS: `sudo certbot --nginx`.
3. **Gratis statische hosting:** Cloudflare Pages, Netlify of GitHub Pages. Koppel daarna je domein via een CNAME/A-record.

Zet bij nginx/Apache `404.html` als foutpagina (`error_page 404 /404.html;`).

## Nog in te vullen
- `over-ons.html`: KvK-nummer, BTW-nummer en vestigingsadres (gele markeringen `todo`). Voor een webshop is dit wettelijk verplicht.
- `js/main.js` bovenaan in `CONFIG`:
  - `formEndpoint`: een Formspree-URL (of eigen backend) zodat het formulier direct verzendt. Leeg = het e-mailprogramma van de bezoeker opent met een voorgevuld bericht naar piforgeklantenservice@protonmail.com.
  - `gaId`: je Google Analytics-ID. Leeg = geen tracking en geen cookiebanner. Analytics laadt pas na toestemming.
- Prijzen in `index.html` zijn indicatief; pas ze aan.
- Betaling: de site toont alleen de betaalmethoden. Betaalverzoeken stuur je zelf via Mollie, PayPal of je bank. Een echte webshop met afrekenen vraagt om een aparte integratie.
- Laat de privacyverklaring controleren zodra je je werkwijze (bewaartermijnen, verwerkers) definitief hebt.
