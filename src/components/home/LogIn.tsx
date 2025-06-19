import { useState, ChangeEvent, FormEvent } from 'react';
import './LogIn.css';
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase-config';
import bcrypt from 'bcryptjs'; // Importa bcryptjs

interface RegistrationFormProps {
    nome: string;
    cognome: string;
    password: string;
    usernameOrMail: string;
    mail: string;
    codiceFiscale: string;
    numeroTelefono: string;
    città: string;
    dataDiNascita: string;
    tipoUtente: string;
}

function LogIn() {
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(false);
    
    const [formData, setFormData] = useState<RegistrationFormProps>({
        nome: '',
        cognome: '',
        password: '',
        usernameOrMail: '',
        mail: '',
        codiceFiscale: '',
        numeroTelefono: '',
        città: '',
        dataDiNascita: '',
        tipoUtente: '',
    });

    const [loginError, setLoginError] = useState<string | null>(null); // Stato per gestire gli errori di login
    const [regError, setRegError] = useState<string | null>(null); // Stato per gestire gli errori di login
    const [userError, setUserError] = useState<string | null>(null); // Stato per gestire gli errori di login


    // ------------- PARTE CONTROLLO CAMPI REGISTRAZIONE -------------
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };


    const handleChangeAsciiNoBlankSpace = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if(!value.localeCompare("")) {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
        else{
            const last = value.slice(-1);
            if(isLetter(last)){
                setFormData(prev => ({ ...prev, [name]: value }));
            }
        }
    };

    
    const handleChangeAscii = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if(!value.localeCompare("")) {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
        else{
            const last = value.slice(-1);
            if(isValidName(last)){
                setFormData(prev => ({ ...prev, [name]: value }));
            }
        }
    };

    const handleChangeTel = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const maxNumberChar : number = 10;
        if(value.length <= maxNumberChar){
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleChangeCod = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if(!value.localeCompare("")) {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
        else{
            const last = value.slice(-1);
            if((isLetter(last) || isNumber(last)) && value.length <= 16){
                setFormData(prev => ({ ...prev, [name]: value }));
            }
        }
    };

    // Funzioni per controllare se il cognome è fomrato da più parole
    function isValidName(last: string) {
        return /^[a-zA-Z\s]+$/.test(last) && last.length === 1; // Controlla se è una lettera o uno spazio
    }
    
    function isLetter(char: string) {
        // Controlla se il carattere è una lettera usando una RegExp
        return /^[a-zA-Z]$/.test(char);
    }

    function isNumber(char: string) {
        // Controlla se il carattere è una lettera usando una RegExp
        return /^[0-9]$/.test(char);
    }
    // ------------- FINE PARTE CONTROLLO CAMPI REGISTRAZIONE -------------

    const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        try {
            const userDocRef = doc(db, 'Utenti', formData.usernameOrMail); // Ottieni riferimento al documento utente
            const docSnap = await getDoc(userDocRef); // Recupera il documento

            if (docSnap.exists()) {
                const userData = docSnap.data();
                // Confronta la password inserita con l'hash memorizzato usando bcrypt
                const passwordMatch = await bcrypt.compare(formData.password, userData.password);

                if (passwordMatch) {
                    // Autenticazione riuscita!
                    localStorage.setItem('isLoggedIn', 'true'); 

                    if(userData.tipo_utente == 'Admin'){
                        navigate(`./AdminPage?username=${formData.usernameOrMail}&tipoUtente=${userData.tipo_utente}`);
                    }
                    else {
                        navigate(`./CalendarPage?username=${formData.usernameOrMail}&tipoUtente=${userData.tipo_utente}`);
                    }

                    setLoginError(null); // Resetta l'errore di login se presente
                }else {
                    // Password non corrispondente
                    console.log("Password non corretta");
                    setLoginError("Username o password non corretti"); // Imposta il messaggio di errore
                }
            } else {
                // Utente non trovato
                console.log("Utente non trovato");
                setLoginError("Username o password non corretti"); // Imposta il messaggio di errore
            }
        } catch (error) {
            console.error("Errore durante l'autenticazione:", error);
            setLoginError("Errore durante l'autenticazione"); // Imposta il messaggio di errore
        }
    };

    function checkPassword(password:string) {

        const minNumChar : number = 8 ;
        const haSimboli = /[!@#$%^&*(),.?":{}|<>_-]/.test(password); // Controlla se ci sono simboli
        const haNumeri = /[0-9]/.test(password); // Controlla se ci sono numeri
        const haMaiuscole = /[A-Z]/.test(password); // Controlla se ci sono lettere maiuscole
        const haMinuscole = /[a-z]/.test(password); // Controlla se ci sono lettere minuscole

        if(password.length >= minNumChar ) return haNumeri && haMaiuscole && haMinuscole && haSimboli; ;
        
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        // controllo se l'username è già stato utilizzato da un'altro paziente , l'ID deve essere unico 
        const checkUserDocRef = doc(db, 'Utenti', formData.usernameOrMail);
        const docSnap = await getDoc(checkUserDocRef);

        if(docSnap.exists()){
            console.log("Questo Id è già in uso .")
            alert('Id utente già in uso ! Si prega di cambiare Username .');
            setUserError("Username già in uso, si prega di cambairlo .");
        }
        else{ // caso in cui non esiste un utente con questo ID
            if(checkPassword(formData.password)){
                try {
                    // Hash della password prima di salvarla nel database
                    const hashedPassword = await bcrypt.hash(formData.password, 10); // 10 è il salt rounds (costo computazionale)

                    const userDocRef = doc(db, 'Utenti', formData.usernameOrMail);
                    await setDoc(userDocRef, {
                        nome: formData.nome,
                        cognome: formData.cognome,
                        mail: formData.mail,
                        codice_fiscale: formData.codiceFiscale,
                        numero_di_telefono: formData.numeroTelefono,
                        città: formData.città,
                        data_di_nascita: formData.dataDiNascita,
                        tipo_utente: formData.tipoUtente,
                        password: hashedPassword, // Salva l'hash della password, NON la password in chiaro!
                        usernameOrMail: formData.usernameOrMail,
                    });

                    console.log('Utente registrato con successo!');
                    setIsVisible(false);
                    setFormData({
                        nome: '',
                        cognome: '',
                        password: '',
                        usernameOrMail: '',
                        mail: '',
                        codiceFiscale: '',
                        numeroTelefono: '',
                        città: '',
                        dataDiNascita: '',
                        tipoUtente: '',
                    });
                } catch (error) {
                    console.error('Errore durante la registrazione dell\'utente: ', error);
                }
            }
            else setRegError("Password non valida . Inserire almeno 8 caratteri con : maiuscole, numeri e simboli !"); // Imposta il messaggio di errore
        };
        
    };

    const handleShowRegistration = () => {
        // Reset dei campi
        setFormData(prev => ({
            ...prev,
            usernameOrMail: '',
            password: ''
        }));
        // Mostra la parte di registrazione
        setIsVisible(true);
    };

    return (
        <div className='conteiner' style={{
            width: isVisible ? '50%' : '25%',
            marginLeft: isVisible ? '25%' : '35%'
          }}>
            <div className='conteiner2'>
                {isVisible ? (
                    <div >
                        <h3>Pagina di Registrazione</h3>
                        <br />
                        <form onSubmit={handleSubmit} >
                            <div className='container_2'>
                                <div className="box">
                                    <label className="LogInLabel">Username</label>
                                    <br />
                                    <input type="text" name='usernameOrMail' placeholder='username' required value={formData.usernameOrMail} onChange={handleChangeAsciiNoBlankSpace} />
                                    {userError && <div className="error-message">{userError}</div>} {/* Mostra il messaggio di errore */}
                                    <br />
                                    <br />
                                    <label htmlFor="Password" className='LogInLabel'>Password</label>
                                    <br />
                                    <input type="password" name='password' placeholder='password' required value={formData.password} onChange={handleChange} />
                                    <br />
                                    <br />
                                    <label htmlFor="Nome" className='LogInLabel'>Nome</label>
                                    <br />
                                    <input type="text" name='nome' placeholder='Nome' required value={formData.nome} onChange={handleChangeAscii} />
                                    <br />
                                    <br />
                                    <label htmlFor="Cognome" className='LogInLabel'>Cognome</label>
                                    <br />
                                    <input type="text" name='cognome' placeholder='Cognome' required value={formData.cognome} onChange={handleChangeAscii} />
                                    <br />
                                    <br />
                                    <label htmlFor="mail" className='LogInLabel'>mail</label>
                                    <br />
                                    <input type="email" name='mail' placeholder='mail' required value={formData.mail} onChange={handleChange} />
                                </div>

                                <div className="box">
                                    <label htmlFor="CodiceFiscale" className='LogInLabel'>Codice Fiscale</label>
                                    <br />
                                    <input type="text" name='codiceFiscale' placeholder='Codice Fiscale' required value={formData.codiceFiscale} onChange={handleChangeCod} />
                                    <br />
                                    <br />
                                    <label htmlFor="NumeroTelefono" className='LogInLabel'>Numero di Telefono</label>
                                    <br />
                                    <input type="number" name='numeroTelefono' placeholder='Numero di Telefono' required value={formData.numeroTelefono} onChange={handleChangeTel} />
                                    <br />
                                    <br />
                                    <label htmlFor="città" className='LogInLabel'>Città di nascita</label>
                                    <br />
                                    <input type="text" name='città' placeholder='città' required value={formData.città} onChange={handleChangeAscii} />
                                    <br />
                                    <br />
                                    <label htmlFor="dataDiNascita" className='LogInLabel'>Data di nascita</label>
                                    <br />
                                    <input type="date" name='dataDiNascita' placeholder='Data di nascita' required value={formData.dataDiNascita} onChange={handleChange} />
                                    <br />
                                    <br />
                                    <label htmlFor="tipoUtente" className='LogInLabel'>Tipo utente</label>
                                    <br />
                                    <label>
                                        <input type="radio" name="tipoUtente" className='tipoUtente' value="medico" checked={formData.tipoUtente === "medico"} onChange={handleChange} />
                                        <span>Medico</span>
                                    </label>
                                    <br />
                                    <label>
                                        <input type="radio" name="tipoUtente" className='tipoUtente' value="paziente" checked={formData.tipoUtente === "paziente"} onChange={handleChange} />
                                        <span>Paziente</span>
                                    </label>
                                    <br />
                                </div>
                            </div>
                            {regError && <div className="error-message">{regError}</div>} {/* Mostra il messaggio di errore */}
                            <input type="submit" value="Registrati" />
                        </form>
                    </div>
                ) : (
                    <div className='loginContainer' >
                        <h3>Pagina di LogIn</h3>
                        <br />
                        <form onSubmit={onSubmit} className='form'>
                            <label className="LogInLabel">Username or mail</label>
                            <br />
                            <input type="text" name='usernameOrMail' placeholder='username' required onChange={handleChangeAsciiNoBlankSpace} />
                            <br />
                            <br />
                            <label htmlFor="Password" className='LogInLabel'>Password</label>
                            <br />
                            <input type="password" name='password' placeholder='password' required onChange={handleChange} />
                            <br />
                            <br />
                            {loginError && <div className="error-message">{loginError}</div>} {/* Mostra il messaggio di errore */}
                            <br />
                            <input type="submit" name='button' value="LogIn" /> 
                            <br />
                            
                        </form>
                    </div>
                )}
                <br />
                <button type="button" onClick={() => setIsVisible(!isVisible)}>
                    {isVisible ? 'Torna al LogIn' : <button onClick={handleShowRegistration}>Crea un nuovo account</button>}
                </button>
            </div>
        </div>
    );
}

export default LogIn;

/*
container {
    container2{
        box{
        }
        box{
        }
        loginContainer{
        }
    }
}

*/