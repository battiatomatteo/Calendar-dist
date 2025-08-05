
import { db } from '../components/firebase-config';
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

/**
 * Interfaccia per i dati di notifica che vengono inviati al server
 */
export interface NotificationData {
  oneSignalId: string;        // ID OneSignal del destinatario
  subscriptionId?: string;    // ID della sottoscrizione OneSignal (opzionale)
  title: string;             // Titolo della notifica
  message: string;           // Messaggio della notifica
  data?: any;                // Dati aggiuntivi (opzionale)
}

/**
 * Servizio per la gestione delle notifiche push tramite OneSignal
 * Gestisce l'invio di notifiche a medici e pazienti in vari scenari
 */
export class NotificationService {
  // URL del server backend per l'invio delle notifiche
  private static readonly SERVER_URL = 'https://notifiche-server.onrender.com/notifica';

  /**
   * Metodo principale per inviare una notifica push
   * @param notificationData - Dati della notifica da inviare
   * @returns Promise<boolean> - true se la notifica è stata inviata con successo
   */
  static async sendNotification(notificationData: NotificationData): Promise<boolean> {
    try {
      // Effettua la chiamata HTTP al server backend
      const response = await fetch(this.SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oneSignalId: notificationData.oneSignalId,
          subscriptionId: notificationData.subscriptionId,
          titolo: notificationData.title,
          messaggio: notificationData.message,
          data: notificationData.data
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Errore invio notifica:', error);
      return false;
    }
  }

  /**
   * Invia una notifica di benvenuto al medico all'accesso
   * Include informazioni su appuntamenti giornalieri e pazienti che hanno saltato medicine
   * @param username - Username del medico
   */
  static async sendWelcomeNotificationToDoctor(username: string): Promise<void> {
    try {
      // Recupera i dati del medico dal database
      const userRef = doc(db, 'Utenti', username);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) return;
      
      const userData = userSnap.data();
      const oneSignalId = userData.oneSignalId;
      const subscriptionId = userData.onesignalIdSubscription;
      
      // Se non ha OneSignal configurato, esce
      if (!oneSignalId) return;

      // Controlla gli appuntamenti di oggi
      const today = new Date();
      const todayString = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
      
      const appointmentsRef = collection(db, 'Appuntamenti');
      const appointmentsQuery = query(
        appointmentsRef,
        where('medico', '==', username),
        where('data', '==', todayString)
      );
      
      const appointmentsSnap = await getDocs(appointmentsQuery);
      const appointmentsCount = appointmentsSnap.size;

      // Controlla quanti pazienti hanno saltato le medicine
      const missedMedsCount = await this.checkMissedMedications(username);

      // Costruisce il messaggio personalizzato
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

      // Invia la notifica
      await this.sendNotification({
        oneSignalId,
        subscriptionId,
        title: 'Promemoria Giornaliero',
        message
      });

    } catch (error) {
      console.error('Errore notifica medico:', error);
    }
  }

  /**
   * Invia una notifica di benvenuto al paziente all'accesso
   * Include informazioni sulle medicine da prendere oggi
   * @param username - Username del paziente
   */
  static async sendWelcomeNotificationToPatient(username: string): Promise<void> {
    try {
      // Recupera i dati dell'utente
      const userRef = doc(db, 'Utenti', username);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) return;
      
      const userData = userSnap.data();
      const oneSignalId = userData.oneSignalId;
      const subscriptionId = userData.onesignalIdSubscription;
      
      // Se non ha OneSignal configurato, esce
      if (!oneSignalId) return;

      // Recupera i dati specifici del paziente
      const patientRef = doc(db, 'Pazienti', username);
      const patientSnap = await getDoc(patientRef);
      
      if (!patientSnap.exists()) return;
      
      const patientData = patientSnap.data();
      const medicines = patientData.medicine || [];
      
      // Prepara la data di oggi
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

      // Costruisce il messaggio personalizzato
      let message = `Benvenuto ${userData.nome}! `;
      
      if (todayMedicines > 0) {
        message += `Hai ${todayMedicines} medicina/e da prendere oggi. Controlla i tuoi orari!`;
      } else {
        message += "Nessuna medicina programmata per oggi.";
      }

      // Invia la notifica
      await this.sendNotification({
        oneSignalId,
        subscriptionId,
        title: 'Promemoria Medicine',
        message
      });

    } catch (error) {
      console.error('Errore notifica paziente:', error);
    }
  }

  /**
   * Programma i promemoria per le medicine del paziente durante il giorno
   * Crea notifiche automatiche per ogni medicina non ancora presa
   * @param username - Username del paziente
   */
  static async scheduleMedicineReminders(username: string): Promise<void> {
    try {
      // Recupera i dati del paziente
      const patientRef = doc(db, 'Pazienti', username);
      const patientSnap = await getDoc(patientRef);
      
      if (!patientSnap.exists()) return;
      
      const patientData = patientSnap.data();
      const medicines = patientData.medicine || [];
      
      // Prepara la data di oggi
      const today = new Date();
      const todayString = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
      
      // Per ogni medicina del paziente
      medicines.forEach((medicine: any) => {
        if (medicine.somministrazioni) {
          // Per ogni somministrazione programmata
          medicine.somministrazioni.forEach((somm: any) => {
            // Se è programmata per oggi e non è ancora stata presa
            if (somm.data === todayString && somm.stato !== 'Presa') {
              // Programma una notifica per l'orario specificato
              this.scheduleNotificationAt(username, medicine.nome, somm.ora);
            }
          });
        }
      });

    } catch (error) {
      console.error('Errore programmazione promemoria:', error);
    }
  }

  /**
   * Programma una notifica per un orario specifico
   * Usa setTimeout per inviare la notifica al momento giusto
   * @param username - Username del paziente
   * @param medicineName - Nome della medicina
   * @param time - Orario nel formato HH:MM
   */
  private static async scheduleNotificationAt(username: string, medicineName: string, time: string): Promise<void> {
    try {
      // Parsifica l'orario
      const [hours, minutes] = time.split(':').map(Number);
      const now = new Date();
      const notificationTime = new Date();
      notificationTime.setHours(hours, minutes, 0, 0);
      
      // Se l'orario è già passato oggi, programma per domani
      if (notificationTime <= now) {
        notificationTime.setDate(notificationTime.getDate() + 1);
      }
      
      // Calcola il delay in millisecondi
      const delay = notificationTime.getTime() - now.getTime();
      
      // Programma la notifica
      setTimeout(async () => {
        // Recupera i dati aggiornati dell'utente al momento dell'invio
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
              title: 'Promemoria Medicina',
              message: `È ora di prendere ${medicineName}!`,
              data: { medicineName, time }
            });
          }
        }
      }, delay);
      
    } catch (error) {
      console.error('Errore programmazione notifica:', error);
    }
  }

  /**
   * Controlla quanti pazienti di un medico hanno saltato le medicine
   * Considera "saltata" una medicina se è passata più di 1 ora dall'orario previsto
   * @param doctorUsername - Username del medico
   * @returns Promise<number> - Numero di medicine saltate
   */
  private static async checkMissedMedications(doctorUsername: string): Promise<number> {
    try {
      // Ottieni tutti i pazienti del medico
      const patientsRef = collection(db, 'Pazienti');
      const patientsQuery = query(patientsRef, where('medico', '==', doctorUsername));
      const patientsSnap = await getDocs(patientsQuery);
      
      let missedCount = 0;
      const today = new Date();
      const todayString = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
      
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
                const [hours] = somm.ora.split(':').map(Number);
                const currentHour = today.getHours();
                
                // Se l'orario è passato di più di 1 ora, considera saltata
                if (currentHour > hours + 1) {
                  missedCount++;
                }
              }
            });
          }
        });
      });
      
      return missedCount;
    } catch (error) {
      console.error('Errore controllo medicine saltate:', error);
      return 0;
    }
  }
}
