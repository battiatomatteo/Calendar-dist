
import { db } from '../components/firebase-config';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

/**
 * ========================================
 * CONFIGURAZIONE SERVIZIO NOTIFICHE
 * ========================================
 * 
 * Questo servizio si interfaccia con il tuo server esterno:
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
   * NOTIFICA BENVENUTO MEDICO
   * ========================================
   */
  static async sendWelcomeNotificationToDoctor(username: string): Promise<void> {
    try {
      const userData = await this.getUserData(username);
      if (!userData?.oneSignalId) return;

      const today = this.getTodayString();
      const appointmentsCount = await this.getAppointmentsCount(username, today);
      const missedMedsCount = await this.getMissedMedicationsCount(username);

      let message = `Benvenuto Dr. ${userData.nome}! `;
      
      if (appointmentsCount > 0) {
        message += `Hai ${appointmentsCount} appuntamento/i oggi. `;
      }
      
      if (missedMedsCount > 0) {
        message += `${missedMedsCount} pazienti hanno saltato delle medicine.`;
      }
      
      if (appointmentsCount === 0 && missedMedsCount === 0) {
        message += "Tutto sotto controllo oggi!";
      }

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
   * NOTIFICA BENVENUTO PAZIENTE
   * ========================================
   */
  static async sendWelcomeNotificationToPatient(username: string): Promise<void> {
    try {
      const userData = await this.getUserData(username);
      if (!userData?.oneSignalId) return;

      const patientData = await this.getPatientData(username);
      if (!patientData) return;

      const today = this.getTodayString();
      const todayMedicines = this.getTodayMedicinesCount(patientData.medicine || [], today);

      let message = `Benvenuto ${userData.nome}! `;
      
      if (todayMedicines > 0) {
        message += `Hai ${todayMedicines} medicina/e da prendere oggi.`;
      } else {
        message += "Nessuna medicina programmata per oggi.";
      }

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
   * METODI HELPER PRIVATI
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
    return `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
  }

  private static async getAppointmentsCount(username: string, date: string): Promise<number> {
    const appointmentsRef = collection(db, 'Appuntamenti');
    const appointmentsQuery = query(
      appointmentsRef,
      where('medico', '==', username),
      where('data', '==', date)
    );
    const appointmentsSnap = await getDocs(appointmentsQuery);
    return appointmentsSnap.size;
  }

  private static getTodayMedicinesCount(medicines: any[], today: string): number {
    let count = 0;
    medicines.forEach((medicine: any) => {
      if (medicine.somministrazioni) {
        medicine.somministrazioni.forEach((somm: any) => {
          if (somm.data === today) count++;
        });
      }
    });
    return count;
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
      
      patientsSnap.forEach((patientDoc) => {
        const patientData = patientDoc.data();
        const medicines = patientData.medicine || [];
        
        medicines.forEach((medicine: any) => {
          if (medicine.somministrazioni) {
            medicine.somministrazioni.forEach((somm: any) => {
              if (somm.data === todayString && somm.stato === 'Non Presa') {
                const [schedHours, schedMinutes] = somm.ora.split(':').map(Number);
                const scheduledTime = schedHours * 60 + schedMinutes;
                
                if (currentTime - scheduledTime > 60) {
                  missedCount++;
                }
              }
            });
          }
        });
      });
      
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
