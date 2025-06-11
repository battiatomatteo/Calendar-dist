import './DoctorMessageWindow.css';
import React, { useState} from 'react';
import { getFirestore, doc, setDoc, getDoc} from 'firebase/firestore';
import { useSearchParams } from 'react-router';
import AppointmentTable from '../utilities/AppointmentTable';
import PrescriptionWindow from '../utilities/PrescriptionWindow';

interface DoctorMessageWindowProps {
    giorno: string; // Riceve la data come stringa (es: "01/01/2024")
}

const DoctorMessageWindow: React.FC<DoctorMessageWindowProps> = ({ giorno }) => {

    const [text, setText] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    const [searchParams] = useSearchParams();
    const username = searchParams.get('username');
    const [hours, setHours] = useState('');
    const [minutes, setMinutes] = useState('');
    const [nomePaziente, setNomePaziente] = useState('');

    // ====== NUOVO STATO per il nome del paziente da cercare ======
    const [pazienteDaCercare, setPazienteDaCercare] = useState('');
    // Stato che conterrà il nome del paziente EFFETTIVAMENTE visualizzato nella PrescriptionWindow
    const [patientToDisplay, setPatientToDisplay] = useState('');

    const handleChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
        setText(event.target.value);
    };


    // ====== HANDLER per l'input del nome paziente da cercare ======

    const handlePazienteDaCercareChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPazienteDaCercare(e.target.value);
    };

    // ====== Controllo se il nome inserito è presente nella raccolta Pazienti ======
    const controlloNomePaziente = async (nomePaziente: string) => {
        try{
            const dbFirestore = getFirestore();

            console.log("Nome paziente da cercare : ",nomePaziente);

            const nomePazientDocRef = doc(
                dbFirestore,
                'Pazienti',
                nomePaziente
            );
            const docSnap = await getDoc(nomePazientDocRef);

            if (docSnap.exists()) {
                // --- Esegui questo BLOCCO solo SE il documento ESISTE ---
                console.log("Paziente trovato nel Database .");
                setIsVisible(true); // Rendi visibile la PrescriptionWindow
            } else {
                // --- Esegui questo BLOCCO solo SE il documento NON ESISTE ---
                console.log("Nessun paziente trovato nel Database con questo nome.");
                alert("Errore : Il paziente da lei cercato non ha una cartella , si prega di riprovare .");
                setIsVisible(false);
            }
        }catch(error){
            console.error("Si è verificato un errore tecnico durante la ricerca:", error);
            alert("Si è verificato un errore nel sistema. Si prega di riprovare più tardi.");
        }
    };

    // ====== Parte Salvataggio Appuntamenti ======
    const salva = async () => {  // funzione che salva il nuovo appuntamento 
        if (!hours || !minutes || !username || !nomePaziente || !giorno) {
            alert("Per favore, compila tutti i campi.");
            return;
        }
        
        try {
            const dbFirestore = getFirestore();

            // Dividi la stringa giorno in giorno, mese e anno
            let giornoDelMese = '', mese = '', anno = '';
            if (giorno.includes('/')) {
                [giornoDelMese, mese, anno] = giorno.split('/');
            } else if (giorno.includes('-')) {
                [giornoDelMese, mese, anno] = giorno.split('-');
            }
            const formattedDay = `${giornoDelMese}-${mese}-${anno}`;

            console.log("Salvo appuntamento in:", formattedDay, username, `${hours}:${minutes}`);

            // Crea un riferimento al documento username all'interno della collection ora:minuti all'interno del documento giorno
            const appuntamentoDocRef = doc(
                dbFirestore,
                'Appuntamenti',
                formattedDay, 
                username,
                `${hours}:${minutes}`
                
            );

            // Salva i dati nel documento
            await setDoc(appuntamentoDocRef, {
                descrizione: text,
                paziente: nomePaziente
            });

            alert("Appuntamento salvato con successo!");
            // Resetta i campi dopo il salvataggio
            setText('');
            setHours('');
            setMinutes('');
            setNomePaziente('');
        } catch (error) {
            console.error("Errore nel salvataggio dell'appuntamento: ", error);
            alert("Errore nel salvataggio dell'appuntamento.");
        }
    };

    const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (!/^\d*$/.test(value)) {
            return;
        }

        const numberValue = parseInt(value);

        if (numberValue >= 0 && numberValue <= 23) {
            setHours(value);
        }
        else if (value === '') {
            setHours(value)
        } else {
            return;
        }
    };

    const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (!/^\d*$/.test(value)) {
            return;
        }

        const numberValue = parseInt(value);

        if (numberValue >= 0 && numberValue <= 59) {
            setMinutes(value);
        } else if (value === '') {
            setMinutes(value)
        }
        else {
            return;
        }
    };

    const handleNomePazienteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNomePaziente(e.target.value);
    };

    // ====== click del bottone Cerca ======
    const handleCercaClick = () => {
        setIsVisible(false); // se dovessi chiudere la pagina per sbaglio resetto lo stato della finestra così che possa essere visibile senza ricaricare la pagina
        if (pazienteDaCercare.trim() !== '') { // Controlla che il campo non sia vuoto
            setPatientToDisplay(pazienteDaCercare.trim()); // Imposta il paziente da cercare (rimuovendo spazi bianchi extra)
            controlloNomePaziente(pazienteDaCercare);
            //setIsVisible(true); // Rendi visibile la PrescriptionWindow
        } else {
            alert("Per favore, inserisci il nome del paziente da cercare.");
            setIsVisible(false); // Nascondi la PrescriptionWindow se il campo è vuoto
            setPatientToDisplay(''); // Pulisci lo stato del paziente da visualizzare
        }
    };

    return (
        <div>
            <label htmlFor="">I tuoi appuntamenti del giorno :</label>
            <br />

            {/* <AppointmentTable />  */}
            <AppointmentTable giorno={giorno} />

            <b><h3 className='h3App'>Crea un nuovo appuntamento :</h3></b>
            
            <label htmlFor="">Paziente : </label>
            <input
                type="text"
                placeholder='nome paziente'
                value={nomePaziente}
                onChange={handleNomePazienteChange}
                className='inputApp'
            />
            <br />
            <br />

            <label htmlFor="textarea">Inserisci la descrizione dell'appuntamento:</label>
            <textarea
                id="textarea"
                value={text}
                onChange={handleChange}
                rows={5}
                cols={50}
                placeholder="Scrivi qui..."
                className='inputApp'
            />
            <br />
            <label htmlFor="">Inserire l'orario del nuovo appuntamento: </label>
            <br />

            <div>
                <label>
                    Ore (0-23):
                    <input
                        type="text"
                        value={hours}
                        onChange={handleHoursChange}
                        maxLength={2}
                        className='inputO'
                    />
                </label>
                <br />
                <label>
                    Minuti (0-59):
                    <input
                        type="text"
                        value={minutes}
                        onChange={handleMinutesChange}
                        maxLength={2}
                        className='inputO'
                    />
                </label>
            </div>
            <p>( la nota verrà salavata in questa data nell'orario da lei inserito )</p>
            <button
                type="submit"
                name='salva'
                className='buttonApp'
                onClick={salva}
            >
                salva
            </button>

            
            <b><h3 className='h3App'>Visiona il tuo paziente</h3></b>
            <label htmlFor="nome_utente">Inserire il nome del paziente che si desidera osservare: </label>
            {/* ====== Input per il nome paziente da cercare ====== */}
            <input
                type="text"
                id='nome_utente' // ID richiesto dall'utente
                placeholder="nome paziente" // Modificato placeholder per chiarezza
                className='inputApp'
                value={pazienteDaCercare} // Collega l'input allo stato
                onChange={handlePazienteDaCercareChange} // Collega l'input all'handler di cambio
                
            />
            <br />
            <br />

            {/* ====== Rendering condizionale della PrescriptionWindow ====== */}
            {/* Renderizza solo se isVisible è true E abbiamo un paziente da visualizzare */}
            {isVisible && patientToDisplay && (
                <div>
                   {/* ====== Passa il nome del paziente come prop ====== */}
                   <PrescriptionWindow patientName={patientToDisplay} giorno={giorno} />
                   {/* <PatientMessageWindow access={true} /> */}
                </div>
            )}


            <button
                className='buttonApp'
                type="submit"
                name="cerca"
                onClick={handleCercaClick} // Collega il click al nuovo handler
            >Cerca
            </button>
        </div>
    );
}

export default DoctorMessageWindow

/*
Appuntamenti (collection)
    └── giorno (document ID - es. "2024-07-27")
        └── ora:minuti (document ID)
                ├── descrizione: "testo dalla textarea"
                ├── paziente: "nome paziente dall'input"
*/