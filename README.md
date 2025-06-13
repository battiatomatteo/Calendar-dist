# 🗓️ Calendario Interattivo per Pazienti e Medici – Progetto React

## 📌 Descrizione generale

Web app sviluppata in **React**, con l’obiettivo di offrire un **calendario medico intelligente** con funzionalità personalizzate a seconda del tipo di utente: **Paziente**, **Medico** e **Admin**.

🔗 **Link all'app online**: [calendar-z0je.onrender.com](https://calendar-z0je.onrender.com)

---

## 👥 Tipologie di utenza

### 🔹 Paziente
- **Calendario interattivo** → cliccando su un giorno:
  - Modal con **medicine da assumere** e **orari**
- **Notifiche push** all’ora programmata
- **Messaggio di benvenuto** con nome
- **Logout** in alto a destra

---

### 🔹 Medico
- Modal con:
  - **Tabella appuntamenti** giornalieri
  - **Creazione nuovi appuntamenti**
  - **Ricerca paziente**
    - Se trovato, si apre un **secondo modal** con:
      - Medicine del giorno
      - Lista medicine attive
      - Campo per **assegnare nuove medicine** (nome, dosaggio, data fine)
- **Messaggio di benvenuto** e **logout**

---

### 🔹 Admin
L’Admin ha accesso a una dashboard di controllo composta da **3 tabelle a scomparsa**, con le seguenti funzionalità:

1. **Tabella 1 – Elenco pazienti**
   - Una riga per paziente, con tutti i dati anagrafici

2. **Tabella 2 – Dettagli medicine per paziente**
   - Campo per **ricerca paziente**
   - Se trovato:
     - Tabella con **tutte le medicine assunte**
     - Select con le medicine → selezionandone una:
       - Tabella delle **somministrazioni** con:
         - Numero somministrazione
         - Stato
         - Data

3. **Tabella 3 – Catalogo medicine**
   - Elenco completo delle medicine **prescrivibili dal medico**
   - **Form per crearne una nuova**, specificando:
     - Nome
     - Dosaggio
     - Altro (opzionale)

---

## 🔐 Autenticazione & Navigazione

- **Login** con username e password
  - Feedback per errori
- **Registrazione** accessibile
- Reindirizzamento automatico alla vista corretta in base al ruolo

---

## ⚙️ Tecnologie utilizzate

### 🧩 React
- Framework per costruire interfacce utente moderne e interattive

### 🔥 Firebase
- **Autenticazione**
- **Database in tempo reale**
- **Persistenza e gestione dati clinici**

### 📲 OneSignal
- Sistema di **notifiche push** per tenere informati i pazienti sugli orari dei farmaci

### 🌐 Render
- Hosting cloud dove vengono pubblicati:
  - **Progetto React** come _static site_
  - **Backend (`notifiche-server`)** collegato a Firebase  
- Rende il deploy continuo semplice ed efficace

---

## 💡 Funzionalità principali

| Funzione                              | Paziente | Medico | Admin |
|---------------------------------------|----------|--------|--------|
| Calendario interattivo                | ✅       | ✅     | ❌     |
| Visualizzazione medicine              | ✅       | ✅     | ✅     |
| Appuntamenti giornalieri              | ❌       | ✅     | ❌     |
| Assegnazione medicine                 | ❌       | ✅     | ❌     |
| Ricerca cartelle cliniche             | ❌       | ✅     | ✅     |
| Notifiche push                        | ✅       | ❌     | ❌     |
| Tabella pazienti                      | ❌       | ❌     | ✅     |
| Storico somministrazioni              | ❌       | ❌     | ✅     |
| Creazione nuova medicina              | ❌       | ❌     | ✅     |

---

## 🚀 Estensioni future

- Tracciamento storico somministrazioni per paziente
- Notifiche via SMS/email
- Analisi dati per il medico
- Gestione farmaci scaduti o sospesi
- Dashboard statistiche per l’Admin

---

## 👨‍⚕️👩‍⚕️🛠️ Conclusione

Un'applicazione completa e flessibile, progettata per supportare l’interazione e la gestione quotidiana della terapia tra pazienti, medici e amministratori di sistema.
