import React, { useState, useCallback, useEffect } from "react";
import Calendar from "react-calendar";
import Modal from "react-modal";
import './CalendarPage.css';
import { useNavigate, useSearchParams } from "react-router-dom";
import "react-calendar/dist/Calendar.css";
import PatientMessageWindow from "./PatientMessageWindow";
import DoctorMessageWindow from './DoctorMessageWindow';
import { doc, getFirestore, setDoc } from "firebase/firestore";

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
        // console.log("Salvataggio ID OneSignal:", oneSignalId);
        
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

    useEffect(() => {

        if (!window.OneSignal) {
            console.error("OneSignal non è definito!");
            return;
        }

    
        /*window.OneSignalDeferred = window.OneSignalDeferred || [];   
        window.OneSignalDeferred.push(function (OneSignal: { Notifications: { requestPermission: () => Promise<any>; }; User: { getId: () => Promise<any>; }; getUserId: () => Promise<any>; }) {
            console.log("OneSignal caricato:", OneSignal);
            console.log(OneSignal.User);
            OneSignal.Notifications.requestPermission().then(() => {
                // Controllo versione v16+
                if (OneSignal.User && typeof OneSignal.User.getId === "function") {
                    OneSignal.User.getId().then((oneSignalId) => {
                        console.log("OneSignal ID (v16+):", oneSignalId);
                        if (oneSignalId && username) salvaIdOneSignal(oneSignalId, username);
                    });
                }
                // Fallback per versioni precedenti
                else if (typeof OneSignal.getUserId === "function") {
                    OneSignal.getUserId().then((oneSignalId) => {
                        console.log("OneSignal ID (legacy):", oneSignalId);
                        if (oneSignalId && username) salvaIdOneSignal(oneSignalId, username);
                    });
                } else {
                    console.error("Nessun metodo valido per ottenere l'ID OneSignal!");
                    const oneSignalId : string | null = OneSignal.User.getId();
                    if(username) salvaIdOneSignal(oneSignalId, username);
                }
            });
        });*/

        if (window.OneSignal) {
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            window.OneSignalDeferred.push(function(OneSignal: any) {
                OneSignal.Notifications.requestPermission().then(() => {
                    // Prova prima con la sintassi v16+
                    const nomeDispositivo = window.navigator.userAgent; // oppure un nome scelto dall'utente
                    OneSignal.User.setExternalId(nomeDispositivo);
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

    }, [username]);

    return (
        <div>
            <button className="LogOutButton" onClick={handleLogout}>Logout</button>
            <br />
            <h3>Benvenuto "{username}" nella pagina dedicata al calendario.</h3>
            <br />
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
