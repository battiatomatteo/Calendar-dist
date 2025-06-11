import { useSearchParams } from 'react-router';
import './PatientMessageWindow.css';
import React, { useEffect, useState } from 'react';
// Aggiungi 'setDoc' agli import da firebase/firestore
import { collection, doc, getDoc, getDocs, getFirestore, setDoc, updateDoc } from 'firebase/firestore';
// Importa initializeApp per l'inizializzazione di Firebase


interface Props {
  access: boolean;
  giorno : string;
  patientName?: string; // Aggiunto per chiarezza, se necessario
}

interface ListaSomministrazioniPaziente{
   id: string ;
   data_somminiztrazione : string;
   stato : boolean;
   ore: string; // Aggiunto, assumendo esista una proprietà 'ore' per le somministrazioni
   [key: string]: any;
}

interface Medicine_paziente {
    id: string ;
    dos: number; // Aggiunto per chiarezza dato l'utilizzo nel ciclo
    [key: string]: any; // Permetti altre proprietà sconosciute
}

interface listaSomministrazioniGiornaliere{
  // Usiamo un ID composto o l'ID della somministrazione, magari includendo l'ID della medicina
  // Ad esempio: `${medicinaId}-${somministrazioneId}`
  id: string;
  stato: boolean;
  data: string; // Data della somministrazione
  ore: string; // Ora della somministrazione
  nomeMedicina: string; // Potrebbe essere utile visualizzare il nome della medicina
  medicinaId: string; // Riferimento all'ID della medicina
 [key: string]: any; // Permetti altre proprietà sconosciute
}

const PatientMessageWindow: React.FC<Props> = ({ access, giorno , patientName}) => {

  const [searchParams] = useSearchParams();
  // Assicurati che usernamePatient non sia null prima di usarlo come ID
  // Se patientName è fornito, usalo, altrimenti prendi da searchParams
  const usernamePatient = patientName ?? searchParams.get('username');

  const [existsStatus, setExistsStatus] = useState<boolean | null>(null); // null: in attesa, true/false: risultato
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Manteniamo lo stato listaSomministrazioni per usarlo nel render se necessario
  // const [listaSomministrazioni,setListaSomministrazioni] = useState<ListaSomministrazioniPaziente[]>([]);
  // Manteniamo lo stato prescriptions per usarlo nel render se necessario
  // const [prescriptions, setPrescriptions] = useState<Medicine_paziente[]>([]);
  
  const [giornoListaSomministrazioni, setGiornoListaSomministrazioni] = useState<listaSomministrazioniGiornaliere[]>([]);


  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({
    // Queste opzioni sembrano generiche ('option1', 'option2').
    // Probabilmente vorrai popolare questo stato dinamicamente basandoti su 'giornoListaSomministrazioni'
    // Lasciamo per ora, ma considera di modificarlo.
    option1: false,
    option2: false,
    option3: false,
  });

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;

    setCheckedItems((prev) => {
      const updated = {
        ...prev,
        [name]: checked,
      };
      console.log("Stato checkbox aggiornato:", updated); // <-- Qui vedi lo stato di tutti i checkbox
      return updated;
    });
  };

  // Ho reso l'effetto asincrono in modo da poter usare await al suo interno
  useEffect(() => {
    const loadPatientData = async () => {
      setLoading(true);
      setError(null);
      setExistsStatus(null); // Resetta lo stato prima di iniziare

      // controllo per usernamePatient
      if (!usernamePatient) {
        setLoading(false);
        setError("Username paziente non trovato negli URL parameters.");
        setExistsStatus(false);
        console.error("Errore: usernamePatient è null o vuoto.");
        return; // Esci dalla funzione se non c'è username
      }

      try {
        const db = getFirestore();
        // --- 1. Controlla o crea il documento paziente ---
        const nomePazientDocRef = doc(
            db,
            'Pazienti',
            usernamePatient
        );
        const docSnap = await getDoc(nomePazientDocRef);

        if (docSnap.exists()) {
          console.log("Documento paziente trovato!");
          setExistsStatus(true);
        } else {
          console.log(`Il paziente ${usernamePatient} non ha una cartella. Creazione...`);

          try {
            await setDoc(nomePazientDocRef, {
              creatoIl: new Date(), // Aggiungi un timestamp di creazione
            }, { merge: true }); // Usa merge: true per evitare di sovrascrivere completamente se il doc esiste già ma è vuoto
            console.log(`Cartella paziente creata con successo per ${usernamePatient}!`);
            // Non settiamo existsStatus a false qui, perché ora il documento esiste
            setExistsStatus(true); // Il documento ora esiste
          } catch (createError) {
            console.error(`Errore durante la creazione della cartella paziente ${usernamePatient}:`, createError);
            setError(`Errore durante la creazione della cartella: ${createError}`);
            setExistsStatus(false); // Errore nella creazione
            setLoading(false); // Ferma il loading anche in caso di errore di creazione
            return; // Esci se la creazione fallisce
          }
        }

        // --- 2. Carica le prescrizioni ---
        // Modificato: Questa funzione ora ritorna le prescrizioni caricate
        const fetchPrescriptions = async (): Promise<Medicine_paziente[]> => {
            const prescriptionsCollectionRef = collection(
                db,
                'Pazienti',
                usernamePatient + '/Medicine_paziente'
            );

            const prescriptionsSnapshot = await getDocs(prescriptionsCollectionRef);

            const fetchedPrescriptions: Medicine_paziente[] = prescriptionsSnapshot.docs.map(doc => {
                return { id: doc.id, ...doc.data() } as Medicine_paziente;
            });

            // OPZIONALE: Puoi comunque aggiornare lo stato delle prescrizioni qui
            // se hai bisogno di accedervi altrove nel componente.
            // Questo stato si aggiornerà nella prossima re-render.
            //setPrescriptions(fetchedPrescriptions);

            // console.log("Prescrizioni caricate:", fetchedPrescriptions);
            return fetchedPrescriptions; // Ritorna i dati caricati
        };

        // --- 3. Carica e filtra le somministrazioni giornaliere ---
        // Modificato: Questa funzione ora accetta l'array delle prescrizioni come argomento
        const fetchDailySomministrazioni = async (prescriptionsData: Medicine_paziente[]) => {
          // === SPIEGAZIONE DEL PERCHÉ indiceMax NON SI AGGIORNAVA QUI ===
          // Prima, usavi 'prescriptions.length' qui. Quando questa funzione
          // veniva chiamata subito dopo 'fetchPrescriptions()', lo stato 'prescriptions'
          // non era ancora stato aggiornato da React (perché 'setPrescriptions' è asincrono
          // e pianifica una re-render). Quindi 'prescriptions.length' era 0 (il valore iniziale).
          // === FINE SPIEGAZIONE ===

          // Soluzione: Usiamo l'array 'prescriptionsData' che ci è stato passato.
          // Questo array contiene i dati freschi appena recuperati da Firestore.
          const indiceMax = prescriptionsData.length;
          // console.log('indice max (usando i dati passati): ', indiceMax);

          const dailySomministrazioni: listaSomministrazioniGiornaliere[] = [];
          const allSomministrazioni: ListaSomministrazioniPaziente[] = []; // Per salvare tutte le somministrazioni se necessario

          try{
            const db = getFirestore();
            for(let index = 0 ; index < indiceMax ; index++){ // scorri tutte le medicine dai dati passati
              const medicina = prescriptionsData[index];

              if (!medicina || !medicina.id) {
                console.warn(`Skipping invalid medicine entry at index ${index}`);
                continue; // Salta se la medicina non è valida
              }

              const listaSomministrazioniRef = collection(
                db,
                'Pazienti',
                usernamePatient +
                '/Medicine_paziente/'+
                medicina.id + // guarda id medicina dall'array passato
                '/somministrazioni' // nome corretto della subcollection
              );

              const somministrazioniDocSnap = await getDocs(listaSomministrazioniRef);

              const somministrazioniListForMedicina: ListaSomministrazioniPaziente[] = somministrazioniDocSnap.docs.map(doc => {
                return { id: doc.id, ...doc.data() } as ListaSomministrazioniPaziente;
              });

              // OPZIONALE: Aggiungi a un array di tutte le somministrazioni se vuoi
              allSomministrazioni.push(...somministrazioniListForMedicina);

              // Filtra le somministrazioni per il giorno corrente
              somministrazioniListForMedicina.forEach(somministrazione => {
                // Assicurati che 'datasomminiztrazione' sia una stringa confrontabile con 'giorno'
                // e che 'ore' esista
                // if (somministrazione.data_somminiztrazione === giorno && somministrazione.ore) {
                //console.log('sommministrazione :' , somministrazione);
                //console.log(` somministrazione.data_somministrazione  ${somministrazione.data_somministrazione}          giorno  ${giorno}`);
                if (somministrazione.data_somministrazione == giorno ) {
                  let oreconv : string = '' ;
                  if(somministrazione.ore == '24' ) { oreconv = '0';} else { oreconv = somministrazione.ore;}
                   dailySomministrazioni.push({
                      // Crea un ID univoco, ad esempio combinando ID medicina e ID somministrazione
                      id: `${medicina.id}-${somministrazione.id}`,
                      stato: somministrazione.stato,
                      data: somministrazione.data_somministrazione,
                      ore: oreconv ,
                      nomeMedicina: medicina.id, // Usa l'ID medicina come nome se non hai un campo 'nome'
                      medicinaId: medicina.id,
                      // Aggiungi altre proprietà se necessario
                   });
                }
              });

               //console.log(`Somministrazioni caricate per medicina ${medicina.id}:`, somministrazioniListForMedicina);
            }

            // OPZIONALE: Aggiorna lo stato globale di tutte le somministrazioni
            // setListaSomministrazioni(allSomministrazioni);

            // Aggiorna lo stato con le somministrazioni filtrate per il giorno corrente
            setGiornoListaSomministrazioni(dailySomministrazioni);
            //console.log("Somministrazioni filtrate per il giorno corrente:", dailySomministrazioni);

          }catch(error){
            console.error("Si è verificato un errore nel recuperare i dati delle somministrazioni giornaliere: ", error);
            setError('Si è verificato un errore nel recuperare i dati .');
          }
        }

        // === SEQUENZA DI CHIAMATE ASINCRONE CORRETTA NELL'EFFECT ===
        // 1. Controlla/crea paziente (già fatto sopra nel try/catch)
        // 2. Carica le prescrizioni e ottieni il risultato
        const prescriptionsData = await fetchPrescriptions();
        // 3. Passa i dati delle prescrizioni alla funzione che carica le somministrazioni
        await fetchDailySomministrazioni(prescriptionsData);

      } catch (err: any) {
        console.error("Errore generale nel caricamento dati:", err);
        setError(err.message || 'Errore sconosciuto durante il caricamento dati.');
        setExistsStatus(false); // Assumiamo errore significhi che non possiamo procedere come previsto
      } finally {
        setLoading(false); // Nascondi il loader una volta completate tutte le operazioni
      }
    };

    loadPatientData(); // Chiama la funzione asincrona definita sopra

  }, [giorno, usernamePatient]); // Aggiunto usernamePatient alle dipendenze dell'effect

  // OPZIONALE: useEffect per popolare i checkbox basandosi su 'giornoListaSomministrazioni'
  useEffect(() => {
      const initialCheckedState: { [key: string]: boolean } = {};
      giornoListaSomministrazioni.forEach(somministrazione => {
          // Usa l'ID univoco della somministrazione come chiave del checkbox
          initialCheckedState[somministrazione.id] = somministrazione.stato;
      });
      setCheckedItems(initialCheckedState);
  }, [giornoListaSomministrazioni]); // Questo effect si esegue quando le somministrazioni giornaliere vengono caricate/aggiornate


  


  const handleSave= async () =>  {
    // Controlla lo stato di tutte le checkbox e lo salvo in Firestore
    try{
        if (!usernamePatient) {
          alert("Username paziente non trovato!");
          return;
        }
        const db = getFirestore();
        for (const somministrazione of giornoListaSomministrazioni) {
          const checked = checkedItems[somministrazione.id] || false;
          const [medicinaId, somministrazioneId] = somministrazione.id.split("-");
          const ref = doc(
            db,
            "Pazienti",
            usernamePatient,
            "Medicine_paziente",
            medicinaId,
            "somministrazioni",
            somministrazioneId
          );
          await updateDoc(ref, { stato: checked });
    }
    alert("Stato delle somministrazioni salvato!");
    }catch(error){
      console.error("Errore durante il salvataggio delle somministrazioni:", error);
      setError('Si è verificato un errore durante il salvataggio delle somministrazioni.');
    }
  }
  useEffect(() => {
    // Solo se il paziente ha medicine oggi e non siamo in loading
    if (!loading && giornoListaSomministrazioni.length > 0 && usernamePatient) {
      // Qui puoi chiamare una funzione che invia la notifica
      inviaNotificaMedicineOggi(usernamePatient);
    }
  }, [loading, giornoListaSomministrazioni, usernamePatient]);

  if (loading) {
    return <div>Caricamento dati paziente...</div>;
  }

  if (error) {
    return <div>Errore: {error}</div>;
  }

  // Puoi aggiungere un messaggio se il paziente non esiste dopo il controllo iniziale e non è stato creato
  if (existsStatus === false && !loading && !error) {
       // Questo caso si verifica se usernamePatient è null O se la creazione fallisce
       // Se la creazione ha successo, existsStatus diventa true
       // Potresti voler distinguere meglio questi scenari
       return <div>Impossibile caricare i dati del paziente. Controllare l'username.</div>;
  }

  const inviaNotificaMedicineOggi = async (usernamePatient: string) => {
    try {
      // Recupera l'ID OneSignal dal documento utente su Firestore
      const db = getFirestore();
      const userRef = doc(db, "Utenti", usernamePatient);
      const userSnap = await getDoc(userRef);
      const oneSignalId = userSnap.data()?.oneSignalId;
      const subscriptionId = userSnap.data()?.onesignalIdSubscription; // Aggiungi l'ID della sottoscrizione se necessario

      if (!oneSignalId) {
        console.warn("OneSignal ID non trovato per il paziente:", usernamePatient);
        return;
      }
      console.log("Invio notifica a OneSignal ID:", oneSignalId);
      // Chiama la tua Cloud Function o endpoint backend
      await fetch("https://notifiche-server.onrender.com/notifica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oneSignalId,
          subscriptionId, // Aggiungi l'ID della sottoscrizione se necessario
          titolo: "Promemoria medicine",
          messaggio: "Hai delle medicine da prendere oggi!"
        })
      });
      // Puoi mostrare un messaggio di conferma se vuoi
      console.log("usernamePatient:", usernamePatient);
      console.log("OneSignal ID usato per la notifica:", oneSignalId);
      console.log("Notifica inviata!");
    } catch (error) {
      console.error("Errore durante l'invio della notifica:", error);
    }
  };
  
  return(
    <div>
      {!access &&
          <div>
            <p>Seleziona quali medicinali hai già preso per oggi: </p>
          </div>
      }

      {/* Mappa le somministrazioni giornaliere caricate dinamicamente */}
      {giornoListaSomministrazioni.length > 0 ? (
        giornoListaSomministrazioni.map((somministrazione) => (
          <div key={somministrazione.id}> {/* Usa l'ID univoco della somministrazione */}
            <label>
              <input
                type="checkbox"
                name={somministrazione.id} // Usa l'ID della somministrazione come 'name'
                checked={checkedItems[somministrazione.id] || false} // Controlla dallo stato 'checkedItems'
                onChange={handleCheckboxChange}
                disabled={access}
              />
              {/* Mostra i dettagli della somministrazione */}
              {`${somministrazione.nomeMedicina} - Ore: ${somministrazione.ore}`}
            </label>
          </div>
        ))
      ) : (
          // Messaggio se non ci sono somministrazioni per il giorno
          !loading && <p>Nessuna somministrazione programmata per oggi.</p>
      )}

      {(giornoListaSomministrazioni.length > 0) && (!access) ? 
        <div>
          <br />
          <button className='buttonApp' onClick={handleSave}>Salva</button>
        </div>
        : 
        null
      }

      {!access &&
            <p >Ricordati di contattare il tuo medico in caso di problemi.</p>
      }
  </div>
  );
}

export default PatientMessageWindow;



/*
STRUTTURA DATI FIREBASE:

Pazienti (collection)
    └── ID Paziente (document ID - ad esempio: usernamePatient)
        └── Medicine_paziente (subcollection)
            └──
*/