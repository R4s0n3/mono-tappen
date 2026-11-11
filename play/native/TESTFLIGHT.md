# Interner TestFlight-Build

Dieser Build ist für interne Tester. Du archivierst ihn auf dem Mac und lädst ihn mit Xcode hoch. Anmeldung gibt es nur mit Sign in with Apple. Unter Account kannst du dich anmelden, abmelden und das Konto löschen. Solo-Spiel, Discover und Räume funktionieren auch ohne Account.

Die App ist in v1 nur fürs iPhone, nur Hochformat. iPad ist absichtlich nicht dabei. Mindestversion ist iOS 15. Xcode 27 baut ein Target 14.0 nicht mehr. Apps, die mit dem iOS-27-SDK gebaut werden, brauchen den UIScene-Lifecycle, sonst stürzt der Start auf dem Gerät ab. Der ist in `Info.plist` und `SceneDelegate.swift`. Build 4 ist Sign in with Apple. Dafür muss die Capability in Apple Developer für `app.tappen.ios` an sein. Der Schlüssel (.p8) gehört auf den Server, nicht ins Repo.

## Eine Datei für Name und Bundle-ID

Alles, was sich ändern darf, steht in `app.identity.json`:

| Feld | Wert |
| --- | --- |
| Anzeigename | Tappen |
| Bundle-ID | `app.tappen.ios` |
| Version | 0.1.0 (`MARKETING_VERSION`) |
| Build | 4 (`CURRENT_PROJECT_VERSION`) |
| Geräte | `1` = nur iPhone |

Die Bundle-ID `app.tappen.ios` ist eine Entscheidung von dir. Wenn sie anders heißen soll, änderst du nur diese Datei und führst danach aus:

```bash
npm run identity:apply
```

Das schreibt Name, Bundle-ID, Version und Build-Nummer ins Xcode-Projekt und den Namen plus die Bundle-ID nach `capacitor.config.ts`. Nicht in `Info.plist`, `project.pbxproj` oder `capacitor.config.ts` von Hand ändern.

Vor jedem weiteren Upload muss die Build-Nummer steigen. App Store Connect lehnt eine Nummer ab, die schon hochgeladen wurde.

```bash
npm run version:bump
```

Die Versionsnummer 0.1.0 bleibt, bis du sie in `app.identity.json` änderst und `npm run identity:apply` ausführst. Die Build-Nummer ist das, was bei jedem Upload neu sein muss.

## Auf dem Mac

Xcode, ein aktiver Apple-Developer-Account und CocoaPods (`brew install cocoapods`). Im Repo:

```bash
cd play/native
npm install --legacy-peer-deps
npm run build
npx cap sync ios
npx cap open ios
```

`npm run cap:sync` macht Apply, Build und `cap sync` in einem Schritt. Danach trotzdem `npx cap open ios`.

`--legacy-peer-deps` braucht es, weil `react-tinder-card` noch React 18 als Peer angibt. Das Play-Projekt macht das genauso.

Nur dieses Verzeichnis installieren. Der Native-Build liest die Farben aus `play/tailwind.shared.ts` und braucht dafür kein `npm install` in `play/`.

`npm run build` spricht immer `https://play.tappen.app` und `wss://play.tappen.app/ws` an. Eine `.env` mit localhost ändert den Release-Build nicht. In `capacitor.config.ts` darf kein `server.url` stehen. Die App lädt das lokale Bundle, nicht eine Website.

## Signierung in Xcode

1. Links das Projekt **App**, Target **App**.
2. Tab **Signing & Capabilities**.
3. **Automatically manage signing** bleibt an.
4. Unter **Team** deinen Apple-Developer-Account wählen.
5. Bundle Identifier ist `app.tappen.ios`. Wenn Xcode die ID noch nicht kennt, legt automatisches Signing sie im Account an. Sonst in [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) eine App-ID mit dieser Bundle-ID anlegen.

Kein Team eintragen, das nicht deins ist. Die Team-ID bleibt auf dem Mac.

## App-Eintrag in App Store Connect

1. [App Store Connect](https://appstoreconnect.apple.com) → **Apps** → **+** → **New App**.
2. Plattform: iOS.
3. Name: **Tappen**.
4. Primäre Sprache: **English**.
5. Bundle ID: `app.tappen.ios` (dieselbe wie in `app.identity.json`).
6. SKU: zum Beispiel `tappen-ios`. Die SKU ist nur intern und lässt sich später nicht ändern.

## Archivieren und hochladen

1. Oben als Ziel **Any iOS Device (arm64)** wählen, nicht einen Simulator.
2. **Product → Archive**.
3. Im Organizer: **Distribute App → App Store Connect → Upload**.
4. Signierung automatisch lassen und hochladen.

Der Build taucht nach einigen Minuten unter **TestFlight** auf. Verarbeitung kann länger dauern.

## Export-Compliance und interne Tester

`Info.plist` setzt `ITSAppUsesNonExemptEncryption` auf false. Die App nutzt nur normales HTTPS und WSS, keine eigene Verschlüsselung.

Wenn Connect trotzdem nach Export Compliance fragt: **No**, die App verwendet keine nicht-ausgenommene Verschlüsselung.

Interne Tester: **TestFlight → Internal Testing**, eine Gruppe anlegen und Personen aus dem App Store Connect Team einladen. Interne Tester brauchen keine Beta-Review. Sie müssen eine Rolle in dem Team haben.

## Was Tester sehen

- Karte wischen: offizielles Deck, ohne Login.
- Nach dem Stapel **Discover**: nur Karten mit `nsfw: false`.
- **Host a night** und **Join with a code**: Räume ohne Account. Ohne Anmeldung bietet der Host nur das eingebaute Tappen-Deck an.
- Stern, Melden und „Nacht sichern“ sind weg. Am Ende einer Runde steht, dass das Speichern auf einem Account später kommt. Es gibt keinen Login-Button und keinen Sprung zu `/api/auth/signin`.

## Häufige Fehler

- **Signing requires a development team** oder fehlendes Zertifikat: unter Signing & Capabilities das Team setzen. Automatically manage signing anlassen. Der Mac muss mit der Apple-ID angemeldet sein, die im Developer-Program ist.
- **Bundle ID is not available** oder die ID ist schon vergeben: `app.tappen.ios` gehört einem anderen Team. Neue ID nur in `app.identity.json` eintragen, `npm run identity:apply`, `npx cap sync ios`, und in Connect dieselbe ID verwenden.
- **The bundle version must be higher than the previously uploaded version**: `npm run version:bump`, neu bauen, `npx cap sync ios`, neu archivieren. Dieselbe Build-Nummer geht kein zweites Mal durch.
- **Icon mit Alpha-Kanal** oder fehlendes 1024-Icon: das Icon liegt als undurchsichtiges PNG in `AppIcon.appiconset`. Nicht durch ein PNG mit Transparenz ersetzen.
- **Weißer Startblitz**: Launch-Screen und WebView sind navy (`#1d1f2f`). Kein `server.url` setzen, sonst lädt Xcode eine leere oder fremde Seite.
- **CocoaPods fehlt**: `brew install cocoapods`, danach noch einmal `npx cap sync ios`.
