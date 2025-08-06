
import React from 'react';
import { db } from '../components/firebase-config';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

/**
 * ========================================
 * CONFIGURAZIONE RICHIESTA - LEGGERE ATTENTAMENTE
 * ========================================
 * 
 * Per far funzionare questo servizio di notifiche, devi configurare:
 * 
 * 1. URL DEL SERVER BACKEND (riga 45):
 *    - Sostituisci 'https://notifiche-server.onrender.com/notifica' con l'URL del tuo server
 *    - Il server deve accettare richieste POST con i dati della notifica
 *    - Il server deve essere configurato con OneSignal App ID e API Key
 * 
 * 2. ONESIGNAL CONFIGURAZIONE:
 *    - Assicurati che OneSignal sia inizializzato correttamente in CalendarPage.tsx
 *    - Gli utenti devono avere 'oneSignalId' e 'onesignalIdSubscription' salvati in Firestore
 * 
 * 3. STRUTTURA DATABASE FIRESTORE:
 *    - Collezione 'Utenti': deve contenere oneSignalId, nome, ecc.
 *    - Collezione 'Pazienti': deve contenere medicine[], medico, ecc.
 *    - Collezione 'Appuntamenti': deve contenere medico, data, ecc.
 * 
 * 4. BACKEND SERVER (da configurare separatamente):
 *    - Deve gestire le chiamate POST a /notifica
 *    - Deve integrare OneSignal REST API
 *    - Deve validare e inviare le notifiche
 */

/**
 * Interfaccia per i dati di notifica che vengono inviati al server backend
 */
export interface NotificationData {
  oneSignalId: string;        // ID OneSignal del destinatario (OBBLIGATORIO)
  subscriptionId?: string;    // ID della sottoscrizione OneSignal (opzionale ma consigliato)
  title: string;             // Titolo della notifica (max 50 caratteri)
  message: string;           // Messaggio della notifica (max 120 caratteri)
  data?: any;                // Dati aggiuntivi personalizzati (opzionale)
}

/**
 * Interfaccia per la risposta del server backend
 */
interface NotificationResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * ========================================
 * COMPONENTE REACT PER GESTIONE NOTIFICHE
 * ========================================
 * 
 * Questo componente fornisce metodi statici per gestire l'invio di notifiche push
 * tramite OneSignal. È progettato come classe di utilità ma in formato TSX.
 */
const NotificationService: React.FC = () => {
  
  /**
   * ⚠️ CONFIGURAZIONE OBBLIGATORIA ⚠️
   * Cambia questo URL con quello del tuo server backend
   * Il server deve essere configurato per:
   * - Ricevere richieste POST
   * - Validare i dati
   * - Inviare notifiche tramite OneSignal REST API
   */
  private static readonly SERVER_URL = 'https://notifiche-server.onrender.com/notifica';

  /**
   * ========================================
   * METODO PRINCIPALE PER INVIO NOTIFICHE
   * ========================================
   * 
   * Invia una notifica push tramite il server backend
   * 
   * @param notificationData - Oggetto con i dati della notifica
   * @returns Promise<boolean> - true se inviata con successo, false altrimenti
   * 
   * COME USARLO:
   * const success = await NotificationService.sendNotification({
   *   oneSignalId: "user-onesignal-id",
   *   title: "Titolo notifica",
   *   message: "Messaggio della notifica"
   * });
   */
  static async sendNotification(notificationData: NotificationData): Promise<boolean> {
    try {
      console.log('📤 Invio notifica:', notificationData);
      
      // Validazione dati di input
      if (!notificationData.oneSignalId || !notificationData.title || !notificationData.message) {
        console.error('❌ Dati notifica incompleti:', notificationData);
        return false;
      }

      // Preparazione payload per il server backend
      const payload = {
        oneSignalId: notificationData.oneSignalId,
        subscriptionId: notificationData.subscriptionId,
        titolo: notificationData.title,
        messaggio: notificationData.message,
        data: notificationData.data || {}
      };

      // Chiamata HTTP al server backend
      const response = await fetch(this.SERVER_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // Gestione della risposta
      if (response.ok) {
        const result: NotificationResponse = await response.json();
        console.log('✅ Notifica inviata con successo:', result);
        return true;
      } else {
        console.error('❌ Errore server:', response.status, response.statusText);
        return false;
      }

    } catch (error) {
      console.error('❌ Errore durante invio notifica:', error);
      return false;
    }
  }

  /**
   * ========================================
   * NOTIFICA DI BENVENUTO PER MEDICI
   * ========================================
   * 
   * Inviata automaticamente quando il medico accede al sistema
   * Include informazioni su:
   * - Appuntamenti programmati per oggi
   * - Pazienti che hanno saltato le medicine
   * 
   * @param username - Username del medico (deve esistere in Firestore)
   * 
   * PREREQUISITI FIRESTORE:
   * - Collezione 'Utenti' con documento [username] contenente:
   *   - oneSignalId: string
   *   - onesignalIdSubscription: string
   *   - nome: string
   * - Collezione 'Appuntamenti' con documenti contenenti:
   *   - medico: string (username del medico)
   *   - data: string (formato "dd-mm-yyyy")
   */
  static async sendWelcomeNotificationToDoctor(username: string): Promise<void> {
    try {
      console.log('👨‍⚕️ Invio notifica benvenuto medico:', username);

      // Recupera i dati del medico dal database
      const userRef = doc(db, 'Utenti', username);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        console.error('❌ Medico non trovato in database:', username);
        return;
      }
      
      const userData = userSnap.data();
      const oneSignalId = userData.oneSignalId;
      const subscriptionId = userData.onesignalIdSubscription;
      
      // Verifica che OneSignal sia configurato
      if (!oneSignalId) {
        console.warn('⚠️ OneSignal ID non configurato per:', username);
        return;
      }

      // Preparazione data di oggi nel formato usato dal database
      const today = new Date();
      const todayString = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
      
      // Conta gli appuntamenti di oggi per questo medico
      const appointmentsRef = collection(db, 'Appuntamenti');
      const appointmentsQuery = query(
        appointmentsRef,
        where('medico', '==', username),
        where('data', '==', todayString)
      );
      
      const appointmentsSnap = await getDocs(appointmentsQuery);
      const appointmentsCount = appointmentsSnap.size;

      // Conta i pazienti che hanno saltato le medicine
      const missedMedsCount = await this.checkMissedMedications(username);

      // Costruzione messaggio personalizzato
      let message = `Benvenuto Dr. ${userData.nome}! `;
      
      if (appointmentsCount > 0) {
        message += `Hai ${appointmentsCount} appuntamento/i oggi. `;
      }
      
      if (missedMedsCount > 0) {
        message += `${missedMedsCount} pazienti hanno saltato delle medicine.`;
      }
      
      if (appointmentsCount === 0 && missedMedsCount === 0) {
        message += "Nessun appuntamento oggi e tutti i pazienti stanno seguendo le terapie.";
      }

      // Invio della notifica
      await this.sendNotification({
        oneSignalId,
        subscriptionId,
        title: 'Promemoria Giornaliero - Medico',
        message,
        data: { 
          type: 'doctor_welcome',
          appointmentsCount,
          missedMedsCount 
        }
      });

      console.log('✅ Notifica medico inviata');

    } catch (error) {
      console.error('❌ Errore notifica medico:', error);
    }
  }

  /**
   * ========================================
   * NOTIFICA DI BENVENUTO PER PAZIENTI
   * ========================================
   * 
   * Inviata quando il paziente accede al sistema
   * Include informazioni sulle medicine da prendere oggi
   * 
   * @param username - Username del paziente
   * 
   * PREREQUISITI FIRESTORE:
   * - Collezione 'Utenti' con documento [username]
   * - Collezione 'Pazienti' con documento [username] contenente:
   *   - medicine: array di oggetti medicina
   *   - medicine[].nome: string
   *   - medicine[].somministrazioni: array
   *   - medicine[].somministrazioni[].data: string ("dd-mm-yyyy")
   *   - medicine[].somministrazioni[].ora: string ("HH:MM")
   *   - medicine[].somministrazioni[].stato: string ("Presa" | "Non Presa")
   */
  static async sendWelcomeNotificationToPatient(username: string): Promise<void> {
    try {
      console.log('👤 Invio notifica benvenuto paziente:', username);

      // Recupera dati utente
      const userRef = doc(db, 'Utenti', username);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        console.error('❌ Paziente non trovato in Utenti:', username);
        return;
      }
      
      const userData = userSnap.data();
      const oneSignalId = userData.oneSignalId;
      const subscriptionId = userData.onesignalIdSubscription;
      
      if (!oneSignalId) {
        console.warn('⚠️ OneSignal ID non configurato per paziente:', username);
        return;
      }

      // Recupera dati specifici del paziente
      const patientRef = doc(db, 'Pazienti', username);
      const patientSnap = await getDoc(patientRef);
      
      if (!patientSnap.exists()) {
        console.error('❌ Paziente non trovato in Pazienti:', username);
        return;
      }
      
      const patientData = patientSnap.data();
      const medicines = patientData.medicine || [];
      
      // Preparazione data di oggi
      const today = new Date();
      const todayString = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
      
      let todayMedicines = 0;
      
      // Conta le medicine programmate per oggi
      medicines.forEach((medicine: any) => {
        if (medicine.somministrazioni) {
          medicine.somministrazioni.forEach((somm: any) => {
            if (somm.data === todayString) {
              todayMedicines++;
            }
          });
        }
      });

      // Costruzione messaggio personalizzato
      let message = `Benvenuto ${userData.nome}! `;
      
      if (todayMedicines > 0) {
        message += `Hai ${todayMedicines} medicina/e da prendere oggi. Controlla i tuoi orari!`;
      } else {
        message += "Nessuna medicina programmata per oggi.";
      }

      // Invio notifica
      await this.sendNotification({
        oneSignalId,
        subscriptionId,
        title: 'Promemoria Medicine',
        message,
        data: { 
          type: 'patient_welcome',
          todayMedicines 
        }
      });

      console.log('✅ Notifica paziente inviata');

    } catch (error) {
      console.error('❌ Errore notifica paziente:', error);
    }
  }

  /**
   * ========================================
   * PROGRAMMAZIONE PROMEMORIA MEDICINE
   * ========================================
   * 
   * Programma notifiche automatiche per ogni medicina non ancora presa
   * Utilizza setTimeout per inviare notifiche agli orari giusti
   * 
   * @param username - Username del paziente
   * 
   * IMPORTANTE: Questo metodo funziona solo se l'applicazione rimane aperta
   * Per un sistema di produzione, considera l'uso di:
   * - Cron jobs sul server
   * - Firebase Cloud Functions con scheduling
   * - Servizi di notifica programmata
   */
  static async scheduleMedicineReminders(username: string): Promise<void> {
    try {
      console.log('⏰ Programmazione promemoria medicine per:', username);

      // Recupera dati del paziente
      const patientRef = doc(db, 'Pazienti', username);
      const patientSnap = await getDoc(patientRef);
      
      if (!patientSnap.exists()) {
        console.error('❌ Paziente non trovato per promemoria:', username);
        return;
      }
      
      const patientData = patientSnap.data();
      const medicines = patientData.medicine || [];
      
      // Data di oggi
      const today = new Date();
      const todayString = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
      
      let scheduledCount = 0;

      // Per ogni medicina del paziente
      medicines.forEach((medicine: any) => {
        if (medicine.somministrazioni) {
          // Per ogni somministrazione programmata
          medicine.somministrazioni.forEach((somm: any) => {
            // Se è programmata per oggi e non è ancora stata presa
            if (somm.data === todayString && somm.stato !== 'Presa') {
              // Programma la notifica
              this.scheduleNotificationAt(username, medicine.nome, somm.ora);
              scheduledCount++;
            }
          });
        }
      });

      console.log(`✅ Programmati ${scheduledCount} promemoria per ${username}`);

    } catch (error) {
      console.error('❌ Errore programmazione promemoria:', error);
    }
  }

  /**
   * ========================================
   * PROGRAMMAZIONE NOTIFICA SPECIFICA
   * ========================================
   * 
   * Programma una singola notifica per un orario specifico
   * 
   * @param username - Username del paziente
   * @param medicineName - Nome della medicina
   * @param time - Orario nel formato "HH:MM"
   * 
   * LIMITAZIONI:
   * - Funziona solo se l'app rimane aperta
   * - Si resetta se l'utente ricarica la pagina
   * - Non persistente tra sessioni
   */
  private static async scheduleNotificationAt(
    username: string, 
    medicineName: string, 
    time: string
  ): Promise<void> {
    try {
      // Parsing dell'orario
      const [hours, minutes] = time.split(':').map(Number);
      
      if (isNaN(hours) || isNaN(minutes)) {
        console.error('❌ Formato orario non valido:', time);
        return;
      }

      const now = new Date();
      const notificationTime = new Date();
      notificationTime.setHours(hours, minutes, 0, 0);
      
      // Se l'orario è già passato oggi, programma per domani
      if (notificationTime <= now) {
        notificationTime.setDate(notificationTime.getDate() + 1);
      }
      
      // Calcola il delay in millisecondi
      const delay = notificationTime.getTime() - now.getTime();
      
      console.log(`⏱️ Programmata notifica per ${medicineName} alle ${time} (delay: ${Math.round(delay/1000/60)} minuti)`);
      
      // Programma la notifica usando setTimeout
      setTimeout(async () => {
        console.log(`🔔 Invio promemoria per ${medicineName}`);
        
        // Recupera dati aggiornati dell'utente
        const userRef = doc(db, 'Utenti', username);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const oneSignalId = userData.oneSignalId;
          const subscriptionId = userData.onesignalIdSubscription;
          
          if (oneSignalId) {
            // Invia la notifica
            await this.sendNotification({
              oneSignalId,
              subscriptionId,
              title: '💊 È ora di prendere la medicina!',
              message: `È ora di prendere ${medicineName} alle ${time}`,
              data: { 
                type: 'medicine_reminder',
                medicineName, 
                time,
                timestamp: new Date().toISOString()
              }
            });
          }
        }
      }, delay);
      
    } catch (error) {
      console.error('❌ Errore programmazione notifica:', error);
    }
  }

  /**
   * ========================================
   * CONTROLLO MEDICINE SALTATE
   * ========================================
   * 
   * Verifica quanti pazienti di un medico hanno saltato le medicine
   * Una medicina è considerata "saltata" se è passata più di 1 ora 
   * dall'orario previsto e non è stata ancora presa
   * 
   * @param doctorUsername - Username del medico
   * @returns Numero di medicine saltate da tutti i suoi pazienti
   */
  private static async checkMissedMedications(doctorUsername: string): Promise<number> {
    try {
      console.log('🔍 Controllo medicine saltate per medico:', doctorUsername);

      // Ottieni tutti i pazienti del medico
      const patientsRef = collection(db, 'Pazienti');
      const patientsQuery = query(patientsRef, where('medico', '==', doctorUsername));
      const patientsSnap = await getDocs(patientsQuery);
      
      let missedCount = 0;
      const today = new Date();
      const todayString = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
      const currentHour = today.getHours();
      const currentMinutes = today.getMinutes();
      
      // Per ogni paziente del medico
      patientsSnap.forEach((patientDoc) => {
        const patientData = patientDoc.data();
        const medicines = patientData.medicine || [];
        
        // Per ogni medicina del paziente
        medicines.forEach((medicine: any) => {
          if (medicine.somministrazioni) {
            // Per ogni somministrazione
            medicine.somministrazioni.forEach((somm: any) => {
              // Se è di oggi e non è stata presa
              if (somm.data === todayString && somm.stato === 'Non Presa') {
                const [schedHours, schedMinutes] = somm.ora.split(':').map(Number);
                
                // Calcola se è passata più di 1 ora dall'orario previsto
                const scheduledTime = schedHours * 60 + schedMinutes;
                const currentTime = currentHour * 60 + currentMinutes;
                const timeDifference = currentTime - scheduledTime;
                
                // Se sono passati più di 60 minuti, considera saltata
                if (timeDifference > 60) {
                  missedCount++;
                  console.log(`⚠️ Medicina saltata: ${medicine.nome} per paziente ${patientDoc.id}`);
                }
              }
            });
          }
        });
      });
      
      console.log(`📊 Totale medicine saltate: ${missedCount}`);
      return missedCount;
      
    } catch (error) {
      console.error('❌ Errore controllo medicine saltate:', error);
      return 0;
    }
  }

  /**
   * ========================================
   * RENDER DEL COMPONENTE (NON UTILIZZATO)
   * ========================================
   * 
   * Questo componente è utilizzato solo per i suoi metodi statici.
   * Il render non viene mai chiamato nella pratica.
   */
  return (
    <div style={{ display: 'none' }}>
      {/* Questo componente è utilizzato solo per i metodi statici */}
      <p>NotificationService - Servizio per gestione notifiche push</p>
    </div>
  );
};

export default NotificationService;

/**
 * ========================================
 * EXPORT DELLA CLASSE PER COMPATIBILITÀ
 * ========================================
 * 
 * Mantiene la compatibilità con il codice esistente che importa
 * la classe come: import { NotificationService } from './NotificationService'
 */
export { NotificationService };

/**
 * ========================================
 * GUIDA ALL'USO DEL SERVIZIO
 * ========================================
 * 
 * ESEMPI DI UTILIZZO:
 * 
 * 1. Invio notifica semplice:
 *    await NotificationService.sendNotification({
 *      oneSignalId: "user-id",
 *      title: "Test",
 *      message: "Questa è una notifica di test"
 *    });
 * 
 * 2. Notifica di benvenuto medico:
 *    await NotificationService.sendWelcomeNotificationToDoctor("medico_username");
 * 
 * 3. Notifica di benvenuto paziente:
 *    await NotificationService.sendWelcomeNotificationToPatient("paziente_username");
 * 
 * 4. Programmazione promemoria:
 *    await NotificationService.scheduleMedicineReminders("paziente_username");
 * 
 * CONFIGURAZIONI NECESSARIE:
 * 
 * 1. Server Backend:
 *    - Deve ricevere POST su /notifica
 *    - Deve avere OneSignal App ID e API Key
 *    - Deve validare e inviare le notifiche
 * 
 * 2. OneSignal:
 *    - Configurato in CalendarPage.tsx
 *    - Users devono avere oneSignalId salvato
 * 
 * 3. Firestore:
 *    - Struttura dati corretta
 *    - Permessi di lettura configurati
 */
