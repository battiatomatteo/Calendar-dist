

import { db } from '../components/firebase-config';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

/**
 * ========================================
 * CONFIGURAZIONE SERVIZIO NOTIFICHE
 * ========================================
 * 
 * Questo servizio si interfaccia con il mio server esterno:
 * https://github.com/battiatomatteo/notifiche-server
 * 
 * CONFIGURAZIONE RICHIESTA:
 * 1. Il server esterno deve essere avviato e accessibile
 * 2. Gli utenti devono avere 'oneSignalId' salvato in Firestore
 * 3. Il server gestisce automaticamente OneSignal REST API
 */

/**
 * Interfaccia per i dati di notifica
 */
export interface NotificationData {
  oneSignalId: string;        // ID OneSignal del destinatario
  subscriptionId?: string;    // ID della sottoscrizione (opzionale)
  title: string;             // Titolo della notifica
  message: string;           // Messaggio della notifica
  data?: any;                // Dati aggiuntivi (opzionale)
}

/**
 * ========================================
 * SERVIZIO NOTIFICHE OTTIMIZZATO
 * ========================================
 */
export class NotificationService {
  
  // URL del tuo server esterno
  private static readonly SERVER_URL = 'https://notifiche-server.onrender.com/notifica';

  /**
   * ========================================
   * INVIO NOTIFICA PRINCIPALE
   * ========================================
   * 
   * Invia una notifica tramite il server esterno
   * 
   * @param notificationData - Dati della notifica
   * @returns Promise<boolean> - true se successo
   */
  static async sendNotification(notificationData: NotificationData): Promise<boolean> {
    try {
      console.log('📤 Invio notifica:', notificationData);
      
      // Validazione essenziale
      if (!notificationData.oneSignalId || !notificationData.title || !notificationData.message) {
        console.error('❌ Dati notifica incompleti');
        return false;
      }

      // Payload per il server (formato che si aspetta il tuo server)
      const payload = {
        oneSignalId: notificationData.oneSignalId,
        subscriptionId: notificationData.subscriptionId,
        titolo: notificationData.title,
        messaggio: notificationData.message,
        data: notificationData.data || {}
      };

      // Chiamata al server esterno
      const response = await fetch(this.SERVER_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log('✅ Notifica inviata con successo');
        return true;
      } else {
        console.error('❌ Errore server:', response.status);
        return false;
      }

    } catch (error) {
      console.error('❌ Errore invio notifica:', error);
      return false;
    }
  }

  /**
   * ========================================
   * NOTIFICA BENVENUTO MEDICO - FIXATA
   * ========================================
   */
  static async sendWelcomeNotificationToDoctor(username: string): Promise<void> {
    try {
      const userData = await this.getUserData(username);
      if (!userData?.oneSignalId) {
        console.log('❌ OneSignal ID non trovato per il medico:', username);
        return;
      }

      const today = this.getTodayString();
      console.log('🔍 Controllo appuntamenti per:', username, 'data:', today);
      
      // FIX: Migliorata la logica di conteggio degli appuntamenti
      const appointmentsCount = await this.getAppointmentsCount(username, today);
      const missedMedsCount = await this.getMissedMedicationsCount(username);

      console.log('📊 Appuntamenti trovati:', appointmentsCount);
      console.log('📊 Medicine saltate:', missedMedsCount);

      let message = `Benvenuto Dr.`+ username +` ! `;   
      
      if (appointmentsCount > 0) {
        message += `Hai ${appointmentsCount} appuntamento/i oggi. `;
      }
      
      if (missedMedsCount > 0) {
        message += `${missedMedsCount} pazienti hanno saltato delle medicine.`;
      }
      
      // FIX: Logica corretta per il messaggio "tutto sotto controllo"
      if (appointmentsCount === 0 && missedMedsCount === 0) {
        message += "Tutto sotto controllo oggi!";
      }

      console.log('📤 Messaggio finale medico:', message);

      await this.sendNotification({
        oneSignalId: userData.oneSignalId,
        subscriptionId: userData.onesignalIdSubscription,
        title: 'Promemoria Giornaliero - Medico',
        message,
        data: { type: 'doctor_welcome', appointmentsCount, missedMedsCount }
      });

    } catch (error) {
      console.error('❌ Errore notifica medico:', error);
    }
  }

  /**
   * ========================================
   * NOTIFICA BENVENUTO PAZIENTE - FIXATA
   * ========================================
   */
  static async sendWelcomeNotificationToPatient(username: string): Promise<void> {
    try {
      const userData = await this.getUserData(username);
      if (!userData?.oneSignalId) {
        console.log('❌ OneSignal ID non trovato per il paziente:', username);
        return;
      }

      const patientData = await this.getPatientData(username);
      if (!patientData) {
        console.log('❌ Dati paziente non trovati:', username);
        return;
      }

      const today = this.getTodayString();
      console.log('🔍 Controllo medicine per paziente:', username, 'data:', today);
      
      // FIX: Migliorata la logica di conteggio delle medicine
      const todayMedicines = await this.getTodayMedicinesCount(username, today);
      
      console.log('📊 Medicine oggi per', username, ':', todayMedicines);

      let message = `Benvenuto `+username+` ! `;
      
      if (todayMedicines > 0) {
        message += `Hai ${todayMedicines} medicina/e da prendere oggi.`;
      } else {
        message += "Nessuna medicina programmata per oggi.";
      }

      console.log('📤 Messaggio finale paziente:', message);

      await this.sendNotification({
        oneSignalId: userData.oneSignalId,
        subscriptionId: userData.onesignalIdSubscription,
        title: 'Promemoria Medicine',
        message,
        data: { type: 'patient_welcome', todayMedicines }
      });

    } catch (error) {
      console.error('❌ Errore notifica paziente:', error);
    }
  }

  /**
   * ========================================
   * PROGRAMMAZIONE PROMEMORIA (SEMPLIFICATA)
   * ========================================
   * 
   * Nota: Per un sistema di produzione, considera l'uso di cron jobs
   * sul server o Firebase Cloud Functions
   */
  static async scheduleMedicineReminders(username: string): Promise<void> {
    try {
      const patientData = await this.getPatientData(username);
      if (!patientData) return;

      const today = this.getTodayString();
      const medicines = patientData.medicine || [];
      
      let scheduledCount = 0;

      medicines.forEach((medicine: any) => {
        if (medicine.somministrazioni) {
          medicine.somministrazioni.forEach((somm: any) => {
            if (somm.data === today && somm.stato !== 'Presa') {
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
   * METODI HELPER PRIVATI - MIGLIORATI
   * ========================================
   */

  private static async getUserData(username: string) {
    const userRef = doc(db, 'Utenti', username);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() ? userSnap.data() : null;
  }

  private static async getPatientData(username: string) {
    const patientRef = doc(db, 'Pazienti', username);
    const patientSnap = await getDoc(patientRef);
    return patientSnap.exists() ? patientSnap.data() : null;
  }

  private static getTodayString(): string {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    
    // Formato: "15-1-2024" (senza zero iniziale, come nel tuo sistema)
    return `${day}-${month}-${year}`;
  }

  /**
   * FIX: Migliorata la funzione di conteggio appuntamenti
   */
  private static async getAppointmentsCount(username: string, date: string): Promise<number> {
    try {
      console.log('🔍 Cerco appuntamenti per medico:', username, 'data:', date);
      
      const appointmentsRef = collection(db, 'Appuntamenti', date, username);
      /*const appointmentsQuery = query(
        appointmentsRef,
        where('medico', '==', username),
        where('data', '==', date)
      );*/
      
      const appointmentsSnap = await getDocs(appointmentsRef);
      const count = appointmentsSnap.size;
      
      console.log('📊 Query risultati appuntamenti:', count);
      
      // Debug: mostra i documenti trovati
      appointmentsSnap.forEach((docSnap) => {
        console.log('📄 Appuntamento trovato:', docSnap.data());
      });
      
      return count;
    } catch (error) {
      console.error('❌ Errore conteggio appuntamenti:', error);
      return 0;
    }
  }

  /**
   * FIX: Completamente riscritta la funzione per contare le medicine del giorno
   */
  private static async getTodayMedicinesCount(username: string, today: string): Promise<number> {
    try {
      console.log('🔍 Cerco medicine per paziente:', username, 'data:', today);
      
      // Ottieni tutti i documenti delle medicine del paziente
      const medicineRef = collection(db, 'Pazienti', username, 'Medicine_paziente');
      const medicineSnap = await getDocs(medicineRef);
      
      let totalMedicinesCount = 0;
      
      // Per ogni medicina, controlla le somministrazioni
      for (const medicineDoc of medicineSnap.docs) {
        // const medicineData = medicineDoc.data();
        const medicineName = medicineDoc.id;
        
        console.log('💊 Controllo medicina:', medicineName);
        
        // Ottieni le somministrazioni di questa medicina
        const somministrazioniRef = collection(db, 'Pazienti', username, 'Medicine_paziente', medicineName, 'somministrazioni');
        const somministrazioniSnap = await getDocs(somministrazioniRef);
        
        // Conta le somministrazioni per oggi
        somministrazioniSnap.forEach((sommDoc) => {
          const sommData = sommDoc.data();
          console.log('📅 Somministrazione trovata:', sommData);

          console.log('📅 Data somministrazione:', sommData.data_somministrazione, 'Oggi:', today);  // Debug : controllo data

          console.log('🔑 Chiavi di sommData:', Object.keys(sommData));

          if ('data_somministrazione' in sommData) {
            console.log('✅ Campo presente:', sommData.data_somministrazione);
          } else {
            console.warn('❗ Campo "data_somministrazione" NON presente');
          }

          if (sommData.data_somministrazione === today) {
            totalMedicinesCount++;
            console.log('✅ Medicine per oggi +1, totale:', totalMedicinesCount);
          }
          
        });
      }
      
      console.log('📊 Totale medicine per oggi:', totalMedicinesCount);
      return totalMedicinesCount;
      
    } catch (error) {
      console.error('❌ Errore conteggio medicine oggi:', error);
      return 0;
    }
  }

  private static async getMissedMedicationsCount(doctorUsername: string): Promise<number> {
    try {
      const patientsRef = collection(db, 'Pazienti');
      const patientsQuery = query(patientsRef, where('medico', '==', doctorUsername));
      const patientsSnap = await getDocs(patientsQuery);
      
      let missedCount = 0;
      const today = new Date();
      const todayString = this.getTodayString();
      const currentTime = today.getHours() * 60 + today.getMinutes();
      
      for (const patientDoc of patientsSnap.docs) {
        const patientUsername = patientDoc.id;
        
        // Per ogni paziente, controlla le medicine
        const medicineRef = collection(db, 'Pazienti', patientUsername, 'Medicine_paziente');
        const medicineSnap = await getDocs(medicineRef);
        
        for (const medicineDoc of medicineSnap.docs) {
          const medicineName = medicineDoc.id;
          
          // Controlla le somministrazioni di questa medicina
          const somministrazioniRef = collection(db, 'Pazienti', patientUsername, 'Medicine_paziente', medicineName, 'somministrazioni');
          const somministrazioniSnap = await getDocs(somministrazioniRef);
          
          somministrazioniSnap.forEach((sommDoc) => {
            const sommData = sommDoc.data();
            
            if (sommData.datasomminiztrazione === todayString && sommData.stato === 'Non Presa') {
              const [schedHours, schedMinutes] = sommData.ora.split(':').map(Number);
              const scheduledTime = schedHours * 60 + schedMinutes;
              
              // Se sono passati più di 60 minuti dall'orario programmato
              if (currentTime - scheduledTime > 60) {
                missedCount++;
              }
            }
          });
        }
      }
      
      return missedCount;
    } catch (error) {
      console.error('❌ Errore controllo medicine saltate:', error);
      return 0;
    }
  }

  private static async scheduleNotificationAt(
    username: string, 
    medicineName: string, 
    time: string
  ): Promise<void> {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) return;

      const now = new Date();
      const notificationTime = new Date();
      notificationTime.setHours(hours, minutes, 0, 0);
      
      if (notificationTime <= now) {
        notificationTime.setDate(notificationTime.getDate() + 1);
      }
      
      const delay = notificationTime.getTime() - now.getTime();
      
      setTimeout(async () => {
        const userData = await this.getUserData(username);
        if (userData?.oneSignalId) {
          await this.sendNotification({
            oneSignalId: userData.oneSignalId,
            subscriptionId: userData.onesignalIdSubscription,
            title: '💊 È ora di prendere la medicina!',
            message: `È ora di prendere ${medicineName} alle ${time}`,
            data: { type: 'medicine_reminder', medicineName, time }
          });
        }
      }, delay);
      
    } catch (error) {
      console.error('❌ Errore programmazione notifica:', error);
    }
  }
}

export default NotificationService;

