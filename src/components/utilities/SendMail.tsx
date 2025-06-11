import { useState } from 'react';

function EmailSender() {
  const [recipientEmail, setRecipientEmail] = useState(''); // Stato per l'email del destinatario
  const [messageBody, setMessageBody] = useState(''); // Stato per il corpo del messaggio inserito dall'utente
  const [statusMessage, setStatusMessage] = useState(''); // Stato per mostrare messaggi all'utente (successo/errore)
  const [isLoading, setIsLoading] = useState(false); // Stato per indicare se l'invio è in corso

  const handleSendEmail = async () => {
    // Validazione basica: assicurati che ci siano l'email del destinatario e il messaggio
    if (!recipientEmail || !messageBody || isLoading) {
      setStatusMessage('Per favore, inserisci email del destinatario e messaggio.');
      return;
    }

    setIsLoading(true);
    setStatusMessage('Invio in corso...');

    // URL della tua Cloud Function.
    // QUESTO URL DEVE ESSERE QUELLO REALE DELLA TUA FUNCTION DOPO IL DEPLOY!
    // Esempio: 'https://<region>-<your-project-id>.cloudfunctions.net/sendEmailViaHttp'
    const cloudFunctionUrl = 'IL_TUO_URL_CLOUD_FUNCTION_QUI'; // !!! SOSTITUISCI QUESTO !!!

    try {
      const response = await fetch(cloudFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // --- QUI DEFINIAMO I DATI CHE INVIAMO ALLA CLOUD FUNCTION ---
        // Non inviamo direttamente l'email, ma i dati necessari alla Function
        // per costruire e inviare l'email per noi.
        body: JSON.stringify({
          recipientEmail: recipientEmail, // Inviamo l'email del destinatario
          messageBody: messageBody,       // Inviamo il testo del messaggio inserito dall'utente
          // NOTA BENE: Non specifichiamo qui il MITTENTE ('battiatomatteo29@gmail.com')
          // o altri dettagli come l'OGGETTO dell'email. Questi saranno definiti
          // nel codice della Cloud Function per motivi di sicurezza e configurazione centralizzata.
        }),
      });

      if (response.ok) {
        // La Cloud Function ha risposto con successo (status 200-299)
        const data = await response.json(); // Se la function ritorna un JSON con dettagli
        setStatusMessage('Email inviata con successo!' + (data.status ? ' Stato: ' + data.status : ''));
        setRecipientEmail(''); // Pulisci il campo email
        setMessageBody(''); // Pulisci il campo messaggio
      } else {
        // La Cloud Function ha risposto con un errore (status 400-599)
        const errorText = await response.text(); // O response.json() se ritorna JSON di errore
        setStatusMessage(`Errore nell'invio dell'email: ${response.status} ${response.statusText} - ${errorText}`);
        // Lascia i campi compilati in caso di errore per permettere all'utente di riprovare o correggere
      }
    } catch (error: any) {
      // Errore di rete o altro problema prima di ricevere una risposta dalla Function
      setStatusMessage(`Si è verificato un errore di rete: ${error.message}`);
      // Lascia i campi compilati
    } finally {
      setIsLoading(false); // Termina lo stato di caricamento
    }
  };

  return (
    <div>
      <h2>Invia Email Tramite Cloud Function</h2>
      <div>
        <label htmlFor="recipientEmail">Email Destinatario:</label>
        <input
          id="recipientEmail"
          type="email"
          placeholder="Inserisci l'email del destinatario"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          disabled={isLoading}
          style={{ margin: '10px 0', display: 'block', width: '300px' }}
        />
      </div>
      <div>
        <label htmlFor="messageBody">Il tuo Messaggio:</label>
        <textarea
          id="messageBody"
          placeholder="Scrivi qui il tuo messaggio..."
          value={messageBody}
          onChange={(e) => setMessageBody(e.target.value)}
          disabled={isLoading}
          rows={6}
          style={{ margin: '10px 0', display: 'block', width: '300px' }}
        />
      </div>

      <button onClick={handleSendEmail} disabled={isLoading}>
        {isLoading ? 'Invio...' : 'Invia Email'}
      </button>

      {/* Mostra messaggi di stato, errori o successi */}
      {statusMessage && <p style={{ marginTop: '15px' }}>{statusMessage}</p>}
    </div>
  );
}

export default EmailSender;
