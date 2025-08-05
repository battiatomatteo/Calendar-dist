import React, { useState, useCallback, useEffect } from "react";
import Calendar from "react-calendar";
import Modal from "react-modal";
import './CalendarPage.css';
import { useNavigate, useSearchParams } from "react-router-dom";
import "react-calendar/dist/Calendar.css";
import PatientMessageWindow from "./PatientMessageWindow";
import DoctorMessageWindow from './DoctorMessageWindow';
import { doc, getFirestore, setDoc } from "firebase/firestore";
import { NotificationService } from "../../services/NotificationService";

declare global {
  interface Window {
    OneSignal: any;
    OneSignalDeferred: any;
  }
}

Modal.setAppElement("#root");

const CalendarWithModal: React.FC = () => {
    const [searchParams] = useSearchParams();
    // const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | any>();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const username = searchParams.get('username');
    const tipoUtente = searchParams.get('tipoUtente');
    const navigate = useNavigate();
    

    // useCallback per evitare ricreazioni inutili della funzione
    const handleDateClick = useCallback((date: Date) => {
        setSelectedDate(date);
        setIsModalOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setSelectedDate(null);
    }, []);

    // Funzione per formattare la data nel formato desiderato (es: "dd/MM/yyyy")
    const formatDate = (date: Date): string => {
        const day = String(date.getDate());
        const month = String(date.getMonth() + 1); // Mesi sono da 0-11
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    const handleLogout = () => {
        navigate('/');
    };

    const salvaIdOneSignal = async (oneSignalId : string | null , username: string, onesignalIdSubscription : string) => {
        console.log("Salvataggio ID OneSignal:", oneSignalId);
        
        try {
            if (!username) {
                console.error("Username non trovato");
                return;
            }

            const db = getFirestore();
            const userRef = doc(db, "Utenti", username);

            await setDoc(userRef,
                 { oneSignalId: oneSignalId,
                    onesignalIdSubscription: onesignalIdSubscription  // Aggiungi il campo per l'ID della sottoscrizione
                  }, { merge: true })
                .then(() => console.log("ID OneSignal salvato correttamente in Firestore:", oneSignalId))
                .catch(error => console.error("Errore durante il salvataggio in Firestore:", error));
        } catch (error) {
            console.error("Errore generale durante il salvataggio dell'ID OneSignal:", error);
        }
    };

    /*useEffect(() => {

        if (!window.OneSignal) {
            console.error("OneSignal non è definito!");
            return;
        }

        if (window.OneSignal) {
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            window.OneSignalDeferred.push(function(OneSignal: any) {
                OneSignal.Notifications.requestPermission().then(() => {
                    // Prova prima con la sintassi v16+
                    const nomeDispositivo = window.navigator.userAgent; // oppure un nome scelto dall'utente
                    OneSignal.User.setExternalId(nomeDispositivo);
                    console.log("Nome dispositivo impostato:", nomeDispositivo);
                    if (OneSignal.User && typeof OneSignal.User.getId === "function") {
                        OneSignal.User.getId().then((oneSignalId: string) => {
                            console.log("OneSignal ID (v16+):", oneSignalId);
                            if (oneSignalId && username) salvaIdOneSignal(oneSignalId, username,  OneSignal.User.PushSubscription.id);
                        });
                    }
                    // Fallback per versioni precedenti
                    else if (typeof OneSignal.getUserId === "function") {
                        OneSignal.getUserId().then((oneSignalId: string) => {
                            console.log("OneSignal ID (legacy):", oneSignalId);
                            if (oneSignalId && username) salvaIdOneSignal(oneSignalId, username,  OneSignal.User.PushSubscription.id);
                        });
                    } else {
                        console.error("Nessun metodo valido per ottenere l'ID OneSignal!");
                        // console.log("onesignal user : ",OneSignal.User.PushSubscription.id);
                        // console.log("onesignal subscription status:", OneSignal.User.isSubscribed);
                        // console.log("onesignal subscription : ", OneSignal.User.subscriptionId);
                        if(username) salvaIdOneSignal(OneSignal.User.onesignalId, username, OneSignal.User.PushSubscription.id);
                    }
                });
            });
        }

        window.OneSignal.push(function() {
            window.OneSignal.isPushNotificationsEnabled(function(isEnabled : any) {
                console.log("Subscription status:", isEnabled);
        });

        // Or listen for changes
        window.OneSignal.on('subscriptionChange', function(isSubscribed: any) {
                console.log("Subscription changed to:", isSubscribed);
            });
        });

    }, [username]);*/

    useEffect(() => {
        if (!window.OneSignal || !username) return;

        console.log("Inizializzazione OneSignal...");

        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(async function(OneSignal: any) {
            // Chiedi permesso solo se necessario
            await OneSignal.Notifications.requestPermission();

            // Recupera gli ID correnti
            let oneSignalId = null;
            let subscriptionId = null;

            if (OneSignal.User && typeof OneSignal.User.getId === "function") {
                oneSignalId = await OneSignal.User.getId();
            } else if (typeof OneSignal.getUserId === "function") {
                oneSignalId = await OneSignal.getUserId();
            } else {
                console.error("Nessun metodo valido per ottenere l'ID OneSignal!");
                oneSignalId = OneSignal.User.onesignalId;
            }

            if (OneSignal.User && typeof OneSignal.User.getSubscriptionId === "function") {
                subscriptionId = await OneSignal.User.getSubscriptionId();
            }
            else {
                subscriptionId = OneSignal.User.PushSubscription.id;
            }
            console.log(OneSignal.User.onesignalId, OneSignal.User.PushSubscription.id);
            // Salva sempre per il nuovo username
            if ( oneSignalId && subscriptionId) {
                if(username) {
                    salvaIdOneSignal(oneSignalId, username, subscriptionId);
                    
                    // Invia notifiche di benvenuto e programma promemoria
                    setTimeout(async () => {
                        if (tipoUtente === 'medico') {
                            await NotificationService.sendWelcomeNotificationToDoctor(username);
                        } else if (tipoUtente === 'paziente') {
                            await NotificationService.sendWelcomeNotificationToPatient(username);
                            await NotificationService.scheduleMedicineReminders(username);
                        }
                    }, 3000); // Aspetta 3 secondi per assicurarsi che OneSignal sia completamente inizializzato
                }
            }

            const nomeDispositivo = window.navigator.userAgent; // oppure un nome scelto dall'utente
            console.log("Nome dispositivo impostato:", nomeDispositivo);
            OneSignal.User.setExternalId(nomeDispositivo);

        });
    }, [username, tipoUtente]);

    return (
        <div className="calendar-container">
            <button className="LogOutButton" onClick={handleLogout}>Logout</button>
            <h3>Benvenuto "{username}" nella pagina dedicata al calendario.</h3>
            <Calendar onClickDay={handleDateClick} />

            <Modal isOpen={isModalOpen} onRequestClose={closeModal}>
                <h2>Programma Giornaliero</h2>
                {selectedDate && (
                    <p>{selectedDate.toLocaleDateString("it-IT")}</p>
                )}

                {tipoUtente === "medico" ? (
                    // Passa la data formattata al componente DoctorMessageWindow
                    <DoctorMessageWindow giorno={selectedDate ? formatDate(selectedDate) : ''} />
                ) : (
                    <PatientMessageWindow access={false} giorno={selectedDate ? formatDate(selectedDate) : ''} />
                )}

                <br />
                <br />
                <button onClick={closeModal} className='buttunCl'>Chiudi</button>
            </Modal>

            <br />
            <br />
            <br />
            
        </div>
    );
};

export default CalendarWithModal;
