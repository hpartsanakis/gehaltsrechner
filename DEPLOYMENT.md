# HTTPS-Veröffentlichung

Diese App ist eine statische iPhone-taugliche Web-App. Sie braucht fuer eine saubere Installation auf dem iPhone eine HTTPS-Adresse.

## Empfohlene Variante: GitHub Pages

1. Neuen GitHub-Repository erstellen.
2. Alle Dateien aus diesem Ordner hochladen.
3. In GitHub unter `Settings` -> `Pages` die Quelle `main` und `/root` auswaehlen.
4. Die angezeigte HTTPS-Adresse in Safari auf dem iPhone oeffnen.
5. Teilen-Symbol antippen und `Zum Home-Bildschirm` auswaehlen.

## Alternative: Netlify

1. Diesen Ordner bei Netlify als neue Site hochladen.
2. Netlify erzeugt automatisch eine HTTPS-Adresse.
3. Die `_headers` Datei sorgt fuer passende App-Header.

## Alternative: Vercel

1. Diesen Ordner als statische Site deployen.
2. Die `vercel.json` Datei setzt passende Header fuer Manifest und Service Worker.

## Nach dem Veröffentlichen testen

- Die URL muss mit `https://` beginnen.
- `manifest.webmanifest` muss im Browser aufrufbar sein.
- `sw.js` muss im Browser aufrufbar sein.
- Danach die Startseite auf dem iPhone in Safari oeffnen und zum Home-Bildschirm hinzufuegen.
