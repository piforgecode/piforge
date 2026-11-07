/*
 * PiForge — winkelinstellingen
 * Pas deze waarden aan voordat je de site live zet.
 * Geheime sleutels (Mollie API-key) horen NIET hier, maar in api/config.php.
 */
window.PIFORGE_CONFIG = {
  brand: "PiForge",
  company: "RaspBuilders",
  email: "raspbuilders@astermail.org",
  city: "Arnhem",
  // Vul in na inschrijving bij de KvK:
  kvk: "[KvK-nummer]",
  btw: "[btw-id]",
  address: "[Straat en huisnummer], [postcode] Arnhem",

  // PayPal: maak een app aan op https://developer.paypal.com en plak hier de Client ID.
  // Leeg laten = PayPal-knop toont een uitleg in plaats van de betaalknop.
  paypalClientId: "",
  paypalCurrency: "EUR",

  // Pad naar de PHP-API (relatief aan index.html)
  apiBase: "api/"
};
