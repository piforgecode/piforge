# PiForge — GitHub Pages-versie

Deze map bevat de statische frontend van PiForge, opgebouwd met de laatst aangeleverde bestanden.

## Publiceren op GitHub Pages

1. Maak/open de repository `Raspbuilderswebshop/Webshop-new`.
2. Upload **de inhoud van deze ZIP** naar de hoofdmap van de repository (dus `index.html` moet direct in de root staan).
3. Commit de bestanden naar de branch `main`.
4. Ga naar **Settings → Pages**.
5. Kies **Deploy from a branch**, branch `main`, map `/(root)`, en klik **Save**.
6. Wacht tot GitHub Pages de site publiceert.

## Belangrijk: beperkingen van GitHub Pages

GitHub Pages host alleen statische bestanden en voert geen PHP uit. Daarom zijn deze onderdelen met alleen GitHub Pages niet actief:
- Mollie/iDEAL/Bancontact/kaartbetalingen via de PHP API;
- PayPal-orderbevestiging via de PHP API;
- orderstatus en opgeslagen bestellingen;
- het PHP-contactformulier.

Voor een werkende webshopcheckout is daarnaast PHP-hosting of een aparte backend nodig. Bewaar geheime Mollie-sleutels uitsluitend op die server; zet ze nooit in `assets/js/config.js`.

## Voor livegang controleren

- Vul in `assets/js/config.js` de echte bedrijfsgegevens in (`kvk`, `btw`, `address`).
- Koppel PayPal alleen met een publieke Client ID; gebruik nooit een geheime sleutel in de browser.
- Controleer productprijzen, voorraad, verzendkosten en alle juridische teksten.
- Test de site na publicatie op desktop en mobiel.

De PHP-bestanden zijn bewust niet opgenomen in deze GitHub Pages-zip, omdat GitHub Pages ze niet kan uitvoeren.
