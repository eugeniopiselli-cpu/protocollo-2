# Protocollo 2.0 - Workout App

App professionale per il tracciamento degli allenamenti basata sul Protocollo 2.0. Sviluppata con React, TypeScript, Tailwind CSS e Firebase.

## 🚀 Funzionalità
- **Tracciamento Real-time:** Registra serie, ripetizioni e carichi.
- **Progressi:** Visualizza grafici avanzati delle tue performance.
- **PWA Ready:** Installabile su iPhone e Android come una vera app.
- **Cloud Sync:** I tuoi dati sono sempre al sicuro con Firebase.
- **Dark Mode:** Design "Hardware" ispirato alle attrezzature da palestra professionali.

## 🛠️ Setup per lo Sviluppo

1. **Clona il repository:**
   ```bash
   git clone https://github.com/tuo-username/tuo-repo.git
   ```

2. **Installa le dipendenze:**
   ```bash
   npm install
   ```

3. **Configura le variabili d'ambiente:**
   Crea un file `.env` con le tue chiavi Firebase (puoi trovarle nel file `firebase-applet-config.json`).

4. **Avvia in locale:**
   ```bash
   npm run dev
   ```

## 📦 Deploy (Pubblicazione)

### Firebase Hosting (Consigliato)
1. Installa i tool di Firebase: `npm install -g firebase-tools`
2. Inizializza il progetto: `firebase init`
3. Seleziona **Hosting** e il tuo progetto esistente.
4. Esegui il build e pubblica:
   ```bash
   npm run build
   firebase deploy
   ```

## 📱 Installazione su Smartphone
1. Apri l'URL della tua app su Safari (iOS) o Chrome (Android).
2. Tocca **Condividi** (iOS) o i **tre puntini** (Android).
3. Seleziona **"Aggiungi alla schermata Home"**.

---
Sviluppato con ❤️ per il Protocollo 2.0.
