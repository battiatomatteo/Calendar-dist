# 🗓️ Calendario Interattivo per Pazienti e Medici – Progetto React

## 📌 Descrizione generale

Web app sviluppata in **React**, con l’obiettivo di offrire un **calendario medico intelligente** con funzionalità personalizzate a seconda del tipo di utente (paziente o medico).

🔗 **Link all'applicazione online**: [calendar-z0je.onrender.com](https://calendar-z0je.onrender.com)

---

## 👥 Tipologie di utenza

### 🔹 Paziente
- **Calendario**: selezionando un giorno appare un **modal** con:
  - Elenco delle medicine del giorno
  - Orari di assunzione
- **Notifiche push** all’orario stabilito o all’apertura del modal
- **Benvenuto personalizzato** con nome utente
- **Logout** accessibile in alto a destra

### 🔹 Medico
- Modal giornaliero con:
  - **Tabella appuntamenti**
  - Sezione per **creare nuovi appuntamenti**
  - Campo per **ricercare la cartella clinica** di un paziente
    - Se esiste, si apre un secondo **modal** con:
      - Stato delle medicine del giorno
      - Lista completa dei farmaci
      - Possibilità di **assegnare nuove medicine** (nome, dosaggio, data fine)
- **Benvenuto personalizzato**
- **Logout** accessibile

---

## 🔐 Autenticazione & Navigazione

- **Login**:
  - Username + Password
  - Gestione credenziali con messaggio di errore
- **Registrazione**:
  - Accessibile da login
  - Permette di registrare nuovi utenti con ruolo associato (paziente o medico)

---

## ⚙️ Tecnologie utilizzate

### 🧩 React
- Libreria JavaScript per la costruzione dinamica dell’interfaccia utente.

### 🔥 Firebase
- Piattaforma di backend offerta da Google, utilizzata per:
  - **Autenticazione utenti**
  - **Database in tempo reale**
  - **Gestione dati e persistenza cloud**

### 📲 OneSignal
- Servizio per l’invio di **notifiche push** su web e dispositivi mobili.  
- In questo progetto viene utilizzato per inviare promemoria ai pazienti all'orario delle medicine.

### 🌐 Render
- Servizio di hosting cloud semplice da configurare.  
- Utilizzato per:
  - Ospitare il backend (`notifiche-server`)
  - Deploy del progetto React come **static site**
  - Collegamento delle due repository principali (frontend + server)

---

## 💡 Funzionalità principali

| Funzionalità | Paziente | Medico |
|--------------|----------|--------|
| Calendario interattivo | ✅ | ✅ |
| Visualizzazione medicine | ✅ | ✅ |
| Notifiche push | ✅ | ❌ |
| Appuntamenti giornalieri | ❌ | ✅ |
| Ricerca cartella clinica | ❌ | ✅ |
| Assegnazione medicine | ❌ | ✅ |
| Modal dinamici multipli | ✅ | ✅ |
| Autenticazione e Registro | ✅ | ✅ |

---

## 🚀 Estensioni future possibili

- Analisi dati per pazienti (aderenza alla terapia)
- Dashboard statistica per i medici
- Invio promemoria via SMS/email
- Sincronizzazione multi-dispositivo

---

## 👨‍⚕️👩‍⚕️ Conclusione

Applicazione versatile e moderna, pensata per supportare e semplificare l’interazione fra pazienti e medici nella gestione quotidiana di terapie e appuntamenti clinici.
