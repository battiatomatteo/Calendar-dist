import './AdminPage.css'
import { SetStateAction, useEffect, useState } from "react";
import { db } from '../firebase-config';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { useNavigate } from "react-router-dom";

interface SectionProps {
    title: string;
    children: React.ReactNode; // Accetta un componente React!
    isOpen: boolean;
    onToggle: () => void;
}

interface ListUtenti {
    id : string;
    nome: string;
    cognome: string;
    usernameOrMail: string;
    mail: string;
    codice_fiscale: string; 
    numero_di_telefono: string; 
    città: string;
    data_di_nascita: string;
    tipo_utente: string; 
    [key: string]: any;
}

interface ListMedicine {
    id : string;
    dosaggio : string;
    durata : string;
    note : string;
    tipo_farmaco : string;
    [key: string]: any;
}

interface listaPazienti {
    id : string;
    dataAggiunta: string;
    data_fine: string;
    countVolte: string;
    numMedicinaInizio :string;
    [key: string]: any;
}

interface ListaSomministrazioni{
  id:string;
  data_somministrazione: string;
  stato : string;
  ore: string;
  [key: string]: any;
}
  
const Section: React.FC<SectionProps> = ({ title, children, isOpen, onToggle }) => {
    return (
      <div className="section">
        <button className="section-title" onClick={onToggle}>
          {title}
        </button>
        {isOpen && <div className="section-content">{children}</div>}
      </div>
    );
};


const AdminPage: React.FC = () => {
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(false);
    const [id_medicina, setId_medicina] = useState('');
    const [dosaggio_medicina, setDosaggio_medicina] = useState('');
    const [note_medicina, setNote_medicina] = useState('');
    const [tipo_medicina, setTipo_medicina] = useState('');
    const [tempo_ongi_dosaggio, setTempoOngiDosaggio] = useState('');
    const [nomePazienteControllo, setNomePazienteControllo] = useState('');
    const [openSection, setOpenSection] = useState<number | null>(null);
    const [utenti, setUtenti] = useState<ListUtenti[]>([]);
    const [medicine, setListMedicin] = useState<ListMedicine[]>([]);
    const [paziente, setListPaziente] = useState<listaPazienti[]>([]);
    const [selectedValue, setSelectedValue] = useState(""); 
    const [listaSomministrazioni, setLlistaSomministrazioni] = useState<ListaSomministrazioni[]>([]);

    // Funzione per cambiare la sezione aperta
    const toggleSection = (id: number) => {
      // Se la sezione cliccata è già aperta, la chiude (imposta a null).
      // Altrimenti, apre la sezione cliccata.
      setOpenSection(openSection === id ? null : id);
    };

    // Usa useEffect per reagire al cambio della sezione aperta
    useEffect(() => {
        // Controlla se la sezione attualmente aperta NON è la sezione "Dati Pazienti" (che ha ID 2)
        // o se nessuna sezione è aperta (openSection === null)
        if (openSection !== 2) {
            setNomePazienteControllo('');
            setListPaziente([]);
        }
        // Questo effetto si attiverà ogni volta che lo stato `openSection` cambia.
    }, [openSection]); // Dipendenza dall'hook: si riesegue quando openSection cambia

    useEffect(() => {
        const mostraListaUtenti = async () => { 
            try {
                
                const utentiCollection = collection(
                    db,
                    'Utenti'
                );

                // Ottieni tutti i documenti nella collection
                const utentiSnapshot = await getDocs(utentiCollection);
                // Medico11!
                // Mappa i documenti in un array 
                const appointmentsList: ListUtenti[] = utentiSnapshot.docs.map(doc => {
                    return { id: doc.id, ...doc.data() } as ListUtenti;
                });

                setUtenti(appointmentsList);
            } catch (error) {
                console.error("Errore nel caricamento degli utenti: ", error);
            }
        }

        const mostraListaMedicine = async () => { 
          try {
              
              const medicineCollection = collection(
                  db,
                  'Farmaci'
              );

              // Ottieni tutti i documenti nella collection
              const farmaciSnapshot = await getDocs(medicineCollection);
              // Medico11!
              // Mappa i documenti in un array 
              const medicineList: ListMedicine[] = farmaciSnapshot.docs.map(doc => {
                  return { id: doc.id, ...doc.data() } as ListMedicine;
              });

              setListMedicin(medicineList);
          } catch (error) {
              console.error("Errore nel caricamento delle medicine : ", error);
          }
        }

        

      mostraListaUtenti();
      mostraListaMedicine();
    },[]);

    const cercaSomministrazioni = async () => {
      try {
          const sommCollection = collection(
              db, 
              'Pazienti',
              nomePazienteControllo ,
              'Medicine_paziente',
              selectedValue, // guardo id medicina
              'somministrazioni',
          );

          // Ottieni tutti i documenti nella collection
          const sommSnapshot = await getDocs(sommCollection);
          // Medico11!
          // Mappa i documenti in un array 
          const sommmedicineList: ListaSomministrazioni[] = sommSnapshot.docs.map(doc => {
              return { id: doc.id, ...doc.data() } as ListaSomministrazioni;
          });

          setLlistaSomministrazioni(sommmedicineList);
      } catch (error) {
          console.error("Errore nel caricamento delle somministrazioni : ", error);
      }
    }

    // ====== Parte Salvataggio Medicina Nuova ======
    const salva = async () => {
        try {
            const nmedicinaDocRef = doc(
                db,
                'Farmaci',
                id_medicina
            );

            // Salva i dati nel documento
            await setDoc(nmedicinaDocRef, {
                //id: id_medicina,
                dosaggio: dosaggio_medicina,
                note: note_medicina,
                tipo_farmaco: tipo_medicina,
                tempo_dosaggio : tempo_ongi_dosaggio,
            });

            alert("Nuova medicina salvata con successo!");
            console.log("Nuova medicina salvata con successo!");
            // Resetta i campi dopo il salvataggio
            setDosaggio_medicina('');
            setId_medicina('');
            setNote_medicina('');
            setTipo_medicina('');
            setTempoOngiDosaggio('');
            setIsVisible(false);
        } catch (error) {
            console.error("Errore nel salvataggio della nuova medicina: ", error);
            alert("Errore nel salvataggio della nuova medicina.");
        }
    };

    // ====== Parte Ricerca Paziente ======
    const cerca = async () => {
      try{

        console.log('Paziente da cercare :', nomePazienteControllo);

        const mostraPazientiCollection = collection(
          db, 
          'Pazienti',
          nomePazienteControllo,
          'Medicine_paziente'
        );

        const pazienteSnapshot = await getDocs(mostraPazientiCollection);

        const pazienteList: listaPazienti[] = pazienteSnapshot.docs.map(doc => {
            return { id: doc.id, ...doc.data() } as listaPazienti;
        });

        console.log(pazienteList);
        setListPaziente(pazienteList);

      }catch(error){
        alert("Errore nel caricamento del paziente ")
        console.error("Errore nel caricamento del paziente : ", error);
      }
    };

    const handleChange = (event: { target: { value: SetStateAction<string>; }; }) => {
        setSelectedValue(event.target.value);
      };

    const handleNomeFarmacoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setId_medicina(e.target.value);
    };
    
    const handleNoteFarmacoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setNote_medicina(e.target.value);
    };

    const handleDosaggioFarmacoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setDosaggio_medicina(e.target.value);
    };

    const handleTipoFarmacoChange = (event: { target: { value: SetStateAction<string>; }; }) => {
      setTipo_medicina(event.target.value);
    };
    
    const handleTempoDosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setTempoOngiDosaggio(e.target.value);
    };

    const handleNomePazienteControlloChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setNomePazienteControllo(e.target.value);
    };

    const handleLogout = () => {
        navigate('/');
    };

    return (
      <div className="container">
        <button className="LogOutButton" onClick={handleLogout}>Logout</button>
        <Section title="Tabella Utenti" isOpen={openSection === 1} onToggle={() => toggleSection(1)}>
              <table className="table">
                  <thead>
                  <tr>
                      <th>ID</th>
                      <th>nome</th>
                      <th>cognome</th>
                      <th>usernameOrMail</th>
                      <th>codiceFiscale</th>
                      <th>mail</th>
                      <th>numeroTelefono</th>
                      <th>città</th>
                      <th>dataDiNascita</th>
                      <th>tipoUtente</th>
                  </tr>
                  </thead>
                  <tbody>
                  {utenti.map((row) => (
                      <tr key={row.id}>
                          <td>{row.id}</td>
                          <td>{row.nome}</td>
                          <td>{row.cognome}</td>
                          <td>{row.usernameOrMail}</td>
                          <td>{row.codice_fiscale}</td> 
                          <td>{row.mail}</td> 
                          <td>{row.numero_di_telefono}</td> 
                          <td>{row.città}</td>
                          <td>{row.data_di_nascita}</td> 
                          <td>{row.tipo_utente}</td> 
                      </tr>
                  ))}
                  </tbody>
              </table>
        </Section>

        <Section title="Dati Pazienti" isOpen={openSection === 2} onToggle={() => toggleSection(2)}>
          <div>
            <label htmlFor="">Inserire il nome del Paziente che si desidera osservare : </label>
            <input type="text" placeholder='Nome Paziente' className='inputTableMedicine' value={nomePazienteControllo} onChange={handleNomePazienteControlloChange}/>
            <br />
            <button type="submit" name='cerca' className='buttonApp' onClick={cerca}>Cerca</button>
            {/*da aggiungere sotto a <td>{row.id}</td> ---> <td>{row.dataAggiunta}</td>  --> da errore con quesgto parametro : da sistemare */}
            { paziente.length == 0 ?
              <p>Questo paziente al momento non prende medicine o non è registrato .</p>
              :
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome del farmaco</th>
                    <th>dataAggiunta</th>
                    <th>data_fine</th>
                    <th>countVolte</th>
                    <th>Numero Medicine Inzio</th>
                  </tr>
                </thead>
                <tbody>
                  {paziente.map((row) => ( 
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td>{row.dataAggiunta}</td>
                      <td>{row.data_fine}</td>
                      <td>{row.countVolte}</td>
                      <td>{row.numMedicinaInizio}</td>
                    </tr>
                    ))}
                </tbody>
              </table>
            }
            { paziente.length == 0 ? 
              null 
              :
              <div>
                <p><b> Tabella con tutte le medincine di questo paziente .</b> Se si desidera si possono osservare più nel dettaglio , seleziona quealla che si desidera controllare : </p>
                <select name="menuMedicine" id="" className='inputApp' value={selectedValue} onChange={handleChange} >
                    {/* Aggiungi un'opzione vuota per permettere il reset */}
                    <option value="">Seleziona un farmaco</option>
                    {paziente.map(medicines => (
                            <option key={medicines.id}>{medicines.id}</option>
                        ))
                    }
                </select>
                <br />
                <button type="submit" name='cerca' className='buttonApp' onClick={cercaSomministrazioni}>Cerca</button>
                {listaSomministrazioni.length == 0 ? null :
                  <div>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>ID_somministrazione</th>
                          <th>Data_sommministrazione</th>
                          <th>Ore</th>
                          <th>Stato</th>
                        </tr>
                      </thead>
                      <tbody>
                        {listaSomministrazioni.map((row) => ( 
                          <tr key={row.id}>
                            <td>{row.id}</td>
                            <td>{row.data_somministrazione}</td>
                            <td>{row.ore}</td>
                            <td>{row.stato ? 'true' : 'false'}</td> 
                          </tr>
                          ))}
                      </tbody>
                    </table>
                    
                  </div>
                }
              </div>
            }
          </div>
        </Section>
  
        <Section title="Tabella Medicine" isOpen={openSection === 3} onToggle={() => toggleSection(3)}>
        <table className="table">
              <thead>
                <tr>
                    <th>Nome del farmaco</th>
                    <th>Dosaggio</th>
                    <th>note</th>
                    <th>tipo_farmaco</th>
                    <th>Tempo tra ogni dosaggio</th>
                </tr>
                </thead>
                <tbody>
                {medicine.map((row) => (
                    <tr key={row.id}>
                        <td>{row.id}</td>
                        <td>{row.dosaggio}</td>
                        <td>{row.note}</td>
                        <td>{row.tipo_farmaco}</td>
                        <td>{row.tempo_dosaggio}</td>
                    </tr>
                ))}
                {isVisible ? 
                  <tr>
                    <td><input type="text" className='inputTableMedicine' placeholder='nome farmaco' value={id_medicina} onChange={handleNomeFarmacoChange}/></td>
                    <td><input type="number" className='inputTableMedicine' placeholder='dosaggio' value={dosaggio_medicina} onChange={handleDosaggioFarmacoChange} /></td>
                    <td><input type="text" className='inputTableMedicine' placeholder='note' value={note_medicina} onChange={handleNoteFarmacoChange}/></td>
                    
                    <td>
                      <select name="" id="" className='inputTableMedicine' value={tipo_medicina} onChange={handleTipoFarmacoChange}>
                        <option></option>
                        <option>Pastiglia</option>
                        <option>Spruzzo</option>
                        <option>Liquido</option>
                      </select>
                    </td>

                    <td><input type="text" className='inputTableMedicine' placeholder='tempo tra ongi dosaggio' value={tempo_ongi_dosaggio} onChange={handleTempoDosChange}/></td>
                  </tr>
                  : 
                  null
                }
              </tbody>
            </table>
            {isVisible ? 
              <button
                type="submit"
                name='salva'
                className='buttonApp'
                onClick={salva}>
                  Salva
              </button> :  <button onClick={() => setIsVisible(!isVisible)} >Aggiungi una nuova medicina</button>
            }
        </Section>
      </div>
    );
  };


export default AdminPage