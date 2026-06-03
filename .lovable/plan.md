## Wat er nu gebeurt

De "Uitnodigen"-knop genereert `${window.location.origin}/join`. Omdat de app nog **niet gepubliceerd** is, is `window.location.origin` op dit moment de **preview-URL** (`id-preview--…lovable.app`). Die URL toont aan ontvangers eerst een Lovable preview-/login-scherm — vandaar dat het lijkt of ze een uitnodiging voor Lovable krijgen i.p.v. voor jouw ladder.

## Oplossing (twee stappen)

### 1. App publiceren
Je moet de app één keer publiceren. Daarna krijg je een stabiele publieke URL zoals `https://project--7de12d3f-1ae2-4d4d-ad43-22ec1c88e4d4.lovable.app` (of een custom domein als je dat instelt). Die URL is publiek toegankelijk zonder Lovable-account.

### 2. InviteButton aanpassen
- Detecteer of de huidige origin een Lovable **preview**-host is (`id-preview--*.lovable.app`). Zo ja, vervang door de **stabiele publieke host** (`project--<id>.lovable.app`) zodat uitnodigingen ook tijdens development direct naar de gepubliceerde versie wijzen.
- Zet een duidelijke Nederlandse share-tekst: titel "SmashRanking — doe mee met de ladder" en bericht "Doe mee met onze tennis ladder competitie: <link>".
- Toon een waarschuwingsregeltje in de dialog wanneer de app nog niet gepubliceerd is ("Publiceer eerst je app, anders krijgen ontvangers een Lovable-loginscherm te zien.") — gedetecteerd via de preview-host check.
- Stabiele URL bouwen via het project-id constant in de component (`7de12d3f-1ae2-4d4d-ad43-22ec1c88e4d4`).

### Bestanden
- `src/components/InviteButton.tsx` — origin-resolver + waarschuwing + NL share-tekst.

Geen backend-wijzigingen nodig. `/join` werkt al correct zodra ontvangers de publieke URL openen.
