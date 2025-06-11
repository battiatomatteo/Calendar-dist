import { FC, useEffect, useState } from 'react';
import './AppointmentTable.css';
import { collection, getDocs } from 'firebase/firestore';
import { useSearchParams } from 'react-router';
import { db } from '../firebase-config';

// Definisci l'interfaccia per un singolo appuntamento
interface Appointment {
    id: string;
    paziente: string;
    descrizione: string;
    [key: string]: any; // Permetti altre proprietà sconosciute
}

interface AppointmentGiornoProps {
    giorno: string ;
}

const AppointmentTable: FC<AppointmentGiornoProps> = ({giorno}) => {

    // ======================= Parte Tabella Appuntamenti =======================
    // Usa l'interfaccia Appointment per definire il tipo di dato dello stato appointments
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [searchParams] = useSearchParams();
    const username = searchParams.get('username');
    

    useEffect(() => {
        const loadAppointments = async () => {

            try {
                // Dividi la stringa giorno in giorno, mese e anno
                //const [giornoDelMese, mese, anno] = giorno.split('/');
                //const formattedDay = `${giornoDelMese}-${mese}-${anno}`;
                // Controllo di sicurezza
                let giornoDelMese = '', mese = '', anno = '';
                if (giorno.includes('/')) {
                    [giornoDelMese, mese, anno] = giorno.split('/');
                } else if (giorno.includes('-')) {
                    [giornoDelMese, mese, anno] = giorno.split('-');
                }
                const formattedDay = `${giornoDelMese}-${mese}-${anno}`;
                console.log("Giorno Formattato: ", formattedDay);

                const appointmentsCollection = collection(
                    db,
                    'Appuntamenti/'+ 
                    formattedDay + '/' +
                    username
                );

                // Ottieni tutti i documenti nella collection
                const appointmentsSnapshot = await getDocs(appointmentsCollection);
                // Medico11!
                // Mappa i documenti in un array di appuntamenti
                const appointmentsList: Appointment[] = appointmentsSnapshot.docs.map(doc => {
                    return { id: doc.id, ...doc.data() } as Appointment;
                });

                // Aggiorna lo stato con la lista degli appuntamenti
                console.log("Appuntamenti caricati: ", appointmentsList);
                setAppointments(appointmentsList);
            } catch (error) {
                console.error("Errore nel caricamento degli appuntamenti: ", error);
            }
        };

        loadAppointments();
    }, [giorno]); // Esegui useEffect quando il giorno cambiano


    return (
        <div>
            {/* ======================= Tabella Appuntamenti ======================= */}
            {appointments.length == 0 ?   // mostro la tabella solo se esiste almeno un appuntamento 
                <p>Non sono presenti appuntamenti per oggi .</p>
                :
                <table className='TabellaAppuntamenti'>
                <thead>
                    <tr>
                        <th>Ora</th>
                        <th>Paziente</th>
                        <th>Descrizione</th>
                    </tr>
                </thead>
                <tbody>
                    {appointments.map(appointment => (
                        <tr key={appointment.id}>
                            <td className='tdtable'>{appointment.id}</td> 
                            <td className='tdtable'>{appointment.paziente}</td> 
                            <td className='tdtable'>{appointment.descrizione}</td> 
                        </tr>
                    ))}
                </tbody>
            </table>
            }
            
        </div>
    );
}

export default AppointmentTable


/*
Mappa attraverso gli appuntamenti e genera righe della tabella 
{appointments.map(appointment => (
    <tr key={appointment.id}>
        <td className='tdtable'>{appointment.id}</td> 
        <td className='tdtable'>{appointment.paziente}</td> 
        <td className='tdtable'>{appointment.descrizione}</td> 
    </tr>
))}
*/



 /*
try{

    const dbFirestore = getFirestore();
    // Dividi la stringa giorno in giorno, mese e anno
    const [giornoDelMese, mese, anno] = giorno.split('/');
    const formattedDay = `${giornoDelMese}-${mese}-${anno}`;

    if(!controllo se esiste una raccolta con ID == giorno) return "nessun appuntamento per oggi";
    else {
        if( !controllo se username esiste all'intenro della raccolta del giorno ) return "nessun appuntamento per oggi";
        else{
            prendo tutti i documenti all'interno della raccolta con ID == username 

            // Medico11!
            // Mappa i documenti in un array di appuntamenti
            const appointmentsList: Appointment[] = appointmentsSnapshot.docs.map(doc => {
            return { id: doc.id, ...doc.data() } as Appointment;
    });
        }
    }

    // Aggiorna lo stato con la lista degli appuntamenti
    setAppointments(appointmentsList);
} catch (error){
    console.error("Errore nel caricamento degli appuntamenti: ", error);
}
    

*/
