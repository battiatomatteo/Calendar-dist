import Modal from "react-modal";
import "./PrescriptionWindow.css";
import { useState, useCallback, useEffect, SetStateAction } from "react";
import PatientMessageWindow from "../pages/PatientMessageWindow";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from '../firebase-config';

interface PrescriptionWindowProps {
    patientName: string; // Ora si aspetta una prop chiamata 'patientName' che è una stringa
    giorno : string;
}

interface Medicine_paziente {
    id: string ;
    [key: string]: any; // Permetti altre proprietà sconosciute
}

interface Lista_Medicine{
    id: string ;
    [key: string]: any; // Permetti altre proprietà sconosciute
}

interface listaCampiMedicina{
    id: string ;
    dosaggio : string;
    durata : string;
    note : string;
    tipo_farmaco : string;
    [key: string]: any;
}

const generateOptions = (start: number, end: number) => {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

const PrescriptionWindow: React.FC<PrescriptionWindowProps> = ({ patientName, giorno }) => {

    const [prescriptions, setPrescriptions] = useState<Medicine_paziente[]>([]); // stato per le prescrizioni
    const [listOfMedicines, setLMedicnes] = useState<Lista_Medicine[]>([]); // stato per le medicine
    // const [listOfCampi, setListOfCampi] = useState<listaCampiMedicina[]>([]); // stato per le medicine
    const [isModalOpen, setIsModalOpen] = useState(true);
    // Inizializzazione degli stati per i campi di input
    const [selectedValue, setSelectedValue] = useState(""); // per il salvataggio del farmaco sceso nella select
    const [dos, setDos] = useState(''); // Stato per il dosaggio
    const [giornof, setGiornof] = useState(''); // Stato per il giorno di fine
    const [mesef, setMesef] = useState(''); // Stato per il mese di fine
    const [annof, setAnnof] = useState(''); // Stato per l'anno di fine

    const days = generateOptions(1, 31);
    const months = generateOptions(1, 12);
    const years = generateOptions(2005, 2100);


    const closeModal = useCallback(() => {
        setIsModalOpen(false);
    }, []);

    useEffect(() => {
        // Funzione asincrona per caricare le prescrizioni
        const fetchPrescriptions = async () => {

            try{
                const prescriptionsCollectionRef = collection(
                    db,
                    'Pazienti',
                    patientName,
                    'Medicine_paziente'
                );

                const prescriptionsSnapshot = await getDocs(prescriptionsCollectionRef);

                const fetchedPrescriptions: Medicine_paziente[] = prescriptionsSnapshot.docs.map(doc => {
                    return { id: doc.id, ...doc.data() } as Medicine_paziente;
                });

                setPrescriptions(fetchedPrescriptions); // Aggiorna lo stato con le prescrizioni trovate

            } catch (err: any) {
                console.error("Errore nel caricamento delle prescrizioni: ", err);
            }
        }
        // Funzione asincrona per caricare le medicine che prende il paziente
        const fetchedMedicnes = async () => {

            try{
                const medicinesCollectionRef = collection(
                    db,
                    'Farmaci'
                );

                const medicinesSnapshot = await getDocs(medicinesCollectionRef);

                const fetchedMedicnes: Lista_Medicine[] = medicinesSnapshot.docs.map(doc => {
                    return { id: doc.id, ...doc.data() } as Lista_Medicine;
                });

                setLMedicnes(fetchedMedicnes);

            } catch (err: any) {
                console.error("Errore nel caricamento delle prescrizioni: ", err);
            }
        }

        // Chiamiamo la funzione di fetch solo se patientName è definito (non vuoto, ecc.)
        if (patientName) {
            fetchPrescriptions();
            fetchedMedicnes();
        }  else {
            setPrescriptions([]); // Pulisci se il nome paziente è vuoto
       }

    }, [patientName]); // Questo effetto si riesegue ogni volta che 'patientName' cambia

    // ------------- SALVATAGGIO NUOVA MEDICINA -------------
    const handleChange = (event: { target: { value: SetStateAction<string>; }; }) => {
        setSelectedValue(event.target.value);
      };

    const handleSave = async () => {
        console.log("Valore salvato:", selectedValue); // Questo funziona

        // controllo che selectedValue non sia vuoto o non valido
        if (!selectedValue) {
            console.log("selectedValue è vuoto. Impossibile salvare il documento senza un ID valido.");
            alert("Seleziona o inserisci una medicina prima di salvare.");
            return; // Esci dalla funzione se selectedValue non è valido
        }

        // Controllo che tutti i campi obbligatori siano compilati
        if (!dos || !giornof || !mesef || !annof) {
             alert("Per favore, compila tutti i campi (dosaggio, data fine).");
             return; // Esci dalla funzione se manca qualche dato
         }

         // salvo la data come stinga e non come Timestamp
        const currentDateObject = new Date();

        // Estrai i componenti della data
        const giorno = currentDateObject.getDate();      // Giorno del mese (1-31)
        const mese = currentDateObject.getMonth() + 1;  // Mese (0-11, quindi aggiungi 1)
        const anno = currentDateObject.getFullYear();   // Anno (es. 2023)
        
        // (Opzionale ma consigliato) Formatta giorno e mese con uno zero iniziale se sono minori di 10
        const giornoFormattato = giorno < 10 ? '0' + giorno : giorno;
        const meseFormattato = mese < 10 ? '0' + mese : mese;

        try {
            const medicineDocRef = doc(db, 'Pazienti', patientName, 'Medicine_paziente', selectedValue);

            // Costruisci la stringa nel formato GG-MM-AAAA
            const newDate: string = `${giornoFormattato}-${meseFormattato}-${anno}`;

            console.log('data_fine :', `${giornof}-${mesef}-${annof}`)

            // Esegue il salvataggio del documento in Firestore
            await setDoc(medicineDocRef, {
                // Qui metto i dati che voglio salvare DENTRO il documento.
                dataAggiunta: newDate,
                countVolte : dos,
                data_fine : `${giornof}-${mesef}-${annof}`,
                numMedicinaInizio: dos,
            });

            console.log("Documento medicina salvato con ID:", selectedValue);
            alert("La medicina è stata salvata con successo nella cartella del paziente.");

            // ---------  resettare i campi ---------
            setSelectedValue(''); 
            setDos('');
            setGiornof('');
            setMesef('');
            setAnnof('');

        } catch (error) {
            console.error("Errore nel salvataggio della nuova medicina!", error); // Stampa l'errore completo!
            alert("Si è verificato un errore nel salvataggio della medicina.");
        }

        // -------------parte calcolo somministrazione medicina -------------

        try{
            const stato_somminstrazione : boolean = false ; // inizizializzo lo stato della somministrazione come falso ( non ho preso la medicna )
            let dataSomministrazione : string = `${giornoFormattato}-${meseFormattato}-${anno}`;
            let tempo_prescrizione : number = 0;
            let index : number = 0 ;

            // recupero il tempo tra ogni dosaggio            
            const tempoDosDecRef = collection(
                db, 
                'Farmaci'
            );
            const tempoDosSnapShot =  await getDocs(tempoDosDecRef);

            const fetcheTempoDos: listaCampiMedicina[] = tempoDosSnapShot.docs.map(doc => {
                return { id: doc.id, ...doc.data() } as listaCampiMedicina;
            });

            // setListOfCampi(fetcheTempoDos);

            // tempo_prescrizione = parseFloat(fetcheTempoDos[0].durata); // commento temporaneo 
            const dataSomministrazioneCorrente: Date = new Date(anno, mese, giorno ,0, 0, 0);

            console.log('Inizio ricerca farmaco con ID:', selectedValue); // Commento: Log iniziale per la ricerca
            let farmacoTrovato = false; // Commento: Flag per tenere traccia se troviamo il farmaco corrispondente

            // Scorro l'array di farmaci recuperati
            for (const farmaco of fetcheTempoDos) {
                console.log('Controllo ID:', farmaco.id, 'vs selectedValue:', selectedValue); // Commento: Log per ogni ID controllato

                // Commento: Se l'ID del farmaco corrente corrisponde a selectedValue
                if (farmaco.id === selectedValue) {
                    console.log('Trovato farmaco con ID corrispondente:', selectedValue); // Commento: Conferma che il farmaco è stato trovato
                    farmacoTrovato = true; // Commento: Imposto il flag a true

                    // Commento: Prendo il valore dal campo 'tempo_dosaggio' di QUESTO farmaco
                    const valoreDalCampo = farmaco.tempo_dosaggio;
                    console.log('Valore letto dal campo tempo_dosaggio (prima di parseFloat) per ID', selectedValue, ':', valoreDalCampo); // Commento: Log il valore esatto prima della conversione
                    console.log('Tipo di valore letto:', typeof valoreDalCampo); // Commento: Log il tipo del valore letto

                    // Commento: Controllo se il valore esiste (non è undefined o null)
                    if (typeof valoreDalCampo !== 'undefined' && valoreDalCampo !== null) {
                        // Commento: Converto il valore in un numero
                        const parsedTempoDosaggio = parseFloat(valoreDalCampo as any);

                        console.log('Risultato di parseFloat:', parsedTempoDosaggio); // Commento: Log il risultato di parseFloat

                        // Commento: Controllo se il risultato della conversione è un numero valido
                        if (!isNaN(parsedTempoDosaggio)) {
                            tempo_prescrizione = parsedTempoDosaggio; // Commento: Imposto tempo_prescrizione con il valore valido
                            console.log('Tempo prescrizione impostato correttamente:', tempo_prescrizione); // Commento: Conferma che tempo_prescrizione è valido
                            break; // Commento: Esco dal ciclo for perché ho trovato e processato il farmaco corretto
                        } else {
                            console.error(`Errore: il campo 'tempo_dosaggio' per il farmaco con ID "${selectedValue}" con valore "${valoreDalCampo}" non contiene un numero valido.`); // Commento: Errore se parseFloat dà NaN
                            return; // Commento: Esco dalla funzione perché i dati necessari sono invalidi
                        }
                    } else {
                        console.error(`Errore: il campo 'tempo_dosaggio' è mancante (undefined/null) per il farmaco con ID "${selectedValue}".`); // Commento: Errore se il campo non esiste
                        return; // Commento: Esco dalla funzione perché i dati necessari sono mancanti
                    }
                }
            }

            // Commento: Dopo aver finito di scorrere l'array, controllo se il farmaco con l'ID cercato è stato trovato.
            // Questo controllo è importante nel caso in cui selectedValue non corrisponda all'ID di NESSUN farmaco recuperato.
            if (!farmacoTrovato) {
                console.error(`Errore: Nessun farmaco trovato con l'ID "${selectedValue}" nell'elenco recuperato da Firestore.`); // Commento: Errore se l'ID non è stato trovato
                return; // Commento: Esco dalla funzione perché il farmaco cercato non esiste nei dati recuperati
            }


            console.log('tempo_prescrizione = ', fetcheTempoDos[0].tempo_dosaggio);
            console.log('dataSomministrazione = ', dataSomministrazione);
            console.log('dosaggio = ', parseFloat(dos) );
            console.log('index = ', index);
            // eseguo in base al numero del dosaggio 

            while(index != parseFloat(dos)){
                console.log('Sono nel while, somministrazione numero:', index + 1);

                const nuovaSomministrazioneDocRef = doc(
                    db,
                    'Pazienti',
                    patientName,
                    'Medicine_paziente',
                    selectedValue,
                    'somministrazioni',
                    `${index}` // id_sommministrazione
                );

                // Commento: Prima di calcolare e formattare la data per il salvataggio
                // Calcolo nuova dataSomministrazione (all'interno del ciclo)

                // Ottieni le ore correnti dalla data corrente
                const oreCorrenti: number = dataSomministrazioneCorrente.getHours();
                console.log('Ore correnti prima del calcolo:', oreCorrenti); // Commento: Log ore prima dell'aggiunta

                // Calcola il nuovo totale di ore aggiungendo il tempo di prescrizione
                // Commento: tempo_prescrizione ora è garantito essere un numero valido grazie ai controlli iniziali
                const nuovoTotaleOre: number = oreCorrenti + tempo_prescrizione;
                console.log('Nuovo totale ore calcolato:', nuovoTotaleOre); // Commento: Log nuovo totale ore

                // Imposta le nuove ore. L'oggetto Date gestirà l'aggiornamento dei giorni/mesi/anni automaticamente.
                dataSomministrazioneCorrente.setHours(nuovoTotaleOre);
                console.log('dataSomministrazioneCorrente dopo setHours:', dataSomministrazioneCorrente); // Commento: Log l'oggetto Date completo

                // Formatta la data aggiornata per il salvataggio
                dataSomministrazione = `${dataSomministrazioneCorrente.getDate()}-${dataSomministrazioneCorrente.getMonth()}-${dataSomministrazioneCorrente.getFullYear()}`;
                console.log('dataSomministrazione formattata per Firestore:', dataSomministrazione); // Commento: Log la stringa formattata

                await setDoc(nuovaSomministrazioneDocRef, {
                    // Qui metto i dati che voglio salvare DENTRO il documento.
                    stato: stato_somminstrazione,
                    data_somministrazione: dataSomministrazione, // Ora dovrebbe essere formattata correttamente
                    ore: nuovoTotaleOre, // l'ora della prescrizione 
                });

                index++;

                console.log('dosaggio limite = ', parseFloat(dos) );
                console.log('index corrente = ', index); // Commento: Log più chiaro
            }
            console.log("Ciclo di somministrazioni completato."); // Commento: Log alla fine del ciclo

        }catch (error) {
            console.error("Errore nel salvataggio delle prescrizioni !", error); // Stampa l'errore completo!
            alert("Si è verificato un errore nel salvataggio delle prescrizioni .");
        }
    };

    const handleAnnofChange = (event: { target: { value: SetStateAction<string>; }; }) => {
      setAnnof(event.target.value);
    };

    const handleDocChange = (event: { target: { value: SetStateAction<string>; }; }) => {
      setDos(event.target.value);
    };

    const handleGiornofChange = (event: { target: { value: SetStateAction<string>; }; }) => {
      setGiornof(event.target.value);
    };

    const handleMesefChange = (event: { target: { value: SetStateAction<string>; }; }) => {
      setMesef(event.target.value);
    };

    return(

        <div >
            <Modal isOpen={isModalOpen} onRequestClose={closeModal} className="ModalPrescriptionWindow">
                <div>

                </div>
                <b><h3 className='h3App'>Cartella medica di {patientName} :</h3></b>

                <p>Il paziente oggi ha preso le seguenti medicine :</p>

                <PatientMessageWindow access={true} giorno={giorno} patientName={patientName}/>

                <b><h3 className='h3App'>Aggiungi una medicina al paziente</h3></b>

                { prescriptions.length == 0 ?
                    <p>Il paziente non ha nessuna medicina da prendere .</p>
                    :
                    <div>
                        <p>Al momento il paziente sta prendendo le seguenti medicine :</p>
                        <ul className="elencoMedicine">
                            {prescriptions.map(prescription => (
                                <li key={prescription.id}> <b> Farmaco: </b>
                                    {prescription.id}
                                </li>
                            ))}
                        </ul>
                    </div>
                }

                <div>
                    <label htmlFor="">Cerca la medicina da prescrivere : </label>
                    {/* Collega il valore della select allo stato 'selectedValue' e gestisci il cambiamento */}
                    <select name="menuMedicine" id="" className='inputApp' value={selectedValue} onChange={handleChange} >
                        {/* Aggiungi un'opzione vuota per permettere il reset */}
                        <option value="">Seleziona un farmaco</option>
                        {listOfMedicines.map(medicines => (
                                <option key={medicines.id}>{medicines.id}</option>
                            ))
                        }
                    </select>
                    <br />
                    <br />
                    <label htmlFor="">Inserire il dosaggio totale : </label>
                     {/* Collega il valore dell'input allo stato 'dos' e gestisci il cambiamento */}
                    <input type="number" placeholder="dos." className="dataFine" value={dos} onChange={handleDocChange} />
                    <br />
                    <br />
                    <label htmlFor="">Inserire l'ultimo giorno in cui bisogna prendere la medicina : </label>
                    <br />
                     {/* Collega il valore della select giorno allo stato 'giornof' e gestisci il cambiamento */}
                    <select className="dataFine" value={giornof} onChange={handleGiornofChange}>
                        {/* Aggiungi un'opzione vuota per permettere il reset */}
                         <option value="">Giorno</option>
                        {days.map((day) => (
                            <option key={day} value={day}>
                            {day}
                            </option>
                        ))}
                    </select>
                     {/* Collega il valore della select mese allo stato 'mesef' e gestisci il cambiamento */}
                    <select className="dataFine" value={mesef} onChange={handleMesefChange}>
                        {/* Aggiungi un'opzione vuota per permettere il reset */}
                        <option value="">Mese</option>
                        {months.map((month) => (
                            <option key={month} value={month}>
                            {month}
                            </option>
                        ))}
                    </select>
                     {/* Collega il valore della select anno allo stato 'annof' e gestisci il cambiamento */}
                    <select className="dataFine" value={annof} onChange={handleAnnofChange}>
                        {/* Aggiungi un'opzione vuota per permettere il reset */}
                         <option value="">Anno</option>
                        {years.map((year) => (
                            <option key={year} value={year}>
                            {year}
                            </option>
                        ))}
                    </select>
                    <br />
                    <br />
                    <button className='buttonApp' onClick={handleSave}>Salva</button>
                    <br />
                </div>
                <br />
                <button onClick={closeModal} className='buttunCl'>Chiudi</button>
            </Modal>
        </div>
    )
}

export default PrescriptionWindow



/*

Pazienti (collection)
    └── ID Paziente (document ID)
        └── Medicine_paziente
            └── ID Medicina
                ├── countVolte: numero di volte da prendere ( es : 2 )
                ├── numMedicinaInizio: numero iniziale di dosi da prendere ( es : 2 )
                ├── data_fine: 05-05-2026 ( data dell'inizio assunzione della medicina )
                ├── dataAggiunta: 15-05-2026 ( data della fine assunzione della medicina )
                └── somministrazioni ( all'interno ho la raccolta di tutte le somministrazioni di questa medicina )
                    └── numSomministrazione ( numero della somminzistrazione, esempio: 1 )
                      ├── datasomminiztrazione: 15-05-2025 ( data della somministrazione )
                      ├── stato : true/false ( se l'ho presa o no )

*/