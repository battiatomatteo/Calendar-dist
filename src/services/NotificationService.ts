
import { db } from '../components/firebase-config';
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

export interface NotificationData {
  oneSignalId: string;
  subscriptionId?: string;
  title: string;
  message: string;
  data?: any;
}

export class NotificationService {
  private static readonly SERVER_URL = 'https://notifiche-server.onrender.com/notifica';

  static async sendNotification(notificationData: NotificationData): Promise<boolean> {
    try {
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

  static async sendWelcomeNotificationToDoctor(username: string): Promise<void> {
    try {
      const userRef = doc(db, 'Utenti', username);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) return;
      
      const userData = userSnap.data();
      const oneSignalId = userData.oneSignalId;
      const subscriptionId = userData.onesignalIdSubscription;
      
      if (!oneSignalId) return;

      // Controlla appuntamenti di oggi
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

      // Controlla pazienti che hanno saltato medicine
      const missedMedsCount = await this.checkMissedMedications(username);

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

  static async sendWelcomeNotificationToPatient(username: string): Promise<void> {
    try {
      const userRef = doc(db, 'Utenti', username);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) return;
      
      const userData = userSnap.data();
      const oneSignalId = userData.oneSignalId;
      const subscriptionId = userData.onesignalIdSubscription;
      
      if (!oneSignalId) return;

      // Controlla medicine di oggi
      const patientRef = doc(db, 'Pazienti', username);
      const patientSnap = await getDoc(patientRef);
      
      if (!patientSnap.exists()) return;
      
      const patientData = patientSnap.data();
      const medicines = patientData.medicine || [];
      
      const today = new Date();
      const todayString = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
      
      let todayMedicines = 0;
      
      medicines.forEach((medicine: any) => {
        if (medicine.somministrazioni) {
          medicine.somministrazioni.forEach((somm: any) => {
            if (somm.data === todayString) {
              todayMedicines++;
            }
          });
        }
      });

      let message = `Benvenuto ${userData.nome}! `;
      
      if (todayMedicines > 0) {
        message += `Hai ${todayMedicines} medicina/e da prendere oggi. Controlla i tuoi orari!`;
      } else {
        message += "Nessuna medicina programmata per oggi.";
      }

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

  static async scheduleMedicineReminders(username: string): Promise<void> {
    try {
      const patientRef = doc(db, 'Pazienti', username);
      const patientSnap = await getDoc(patientRef);
      
      if (!patientSnap.exists()) return;
      
      const patientData = patientSnap.data();
      const medicines = patientData.medicine || [];
      
      const today = new Date();
      const todayString = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
      
      medicines.forEach((medicine: any) => {
        if (medicine.somministrazioni) {
          medicine.somministrazioni.forEach((somm: any) => {
            if (somm.data === todayString && somm.stato !== 'Presa') {
              this.scheduleNotificationAt(username, medicine.nome, somm.ora);
            }
          });
        }
      });

    } catch (error) {
      console.error('Errore programmazione promemoria:', error);
    }
  }

  private static async scheduleNotificationAt(username: string, medicineName: string, time: string): Promise<void> {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const now = new Date();
      const notificationTime = new Date();
      notificationTime.setHours(hours, minutes, 0, 0);
      
      // Se l'orario è già passato oggi, programma per domani
      if (notificationTime <= now) {
        notificationTime.setDate(notificationTime.getDate() + 1);
      }
      
      const delay = notificationTime.getTime() - now.getTime();
      
      setTimeout(async () => {
        const userRef = doc(db, 'Utenti', username);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const oneSignalId = userData.oneSignalId;
          const subscriptionId = userData.onesignalIdSubscription;
          
          if (oneSignalId) {
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

  private static async checkMissedMedications(doctorUsername: string): Promise<number> {
    try {
      // Ottieni tutti i pazienti del medico
      const patientsRef = collection(db, 'Pazienti');
      const patientsQuery = query(patientsRef, where('medico', '==', doctorUsername));
      const patientsSnap = await getDocs(patientsQuery);
      
      let missedCount = 0;
      const today = new Date();
      const todayString = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
      
      patientsSnap.forEach((patientDoc) => {
        const patientData = patientDoc.data();
        const medicines = patientData.medicine || [];
        
        medicines.forEach((medicine: any) => {
          if (medicine.somministrazioni) {
            medicine.somministrazioni.forEach((somm: any) => {
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
