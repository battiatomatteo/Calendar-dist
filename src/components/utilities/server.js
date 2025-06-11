const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Configura il trasportatore Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "calendarioprogetto2025@gmail.com", // Il tuo account Gmail
    pass: "CalendarioProg2025$$" // Usa una password per le app se hai l'autenticazione a due fattori
  }
});

app.post("/send-email", async (req, res) => {
  const { name, email, message } = req.body;

  try {
    await transporter.sendMail({
      from: `"${name}" <${email}>`,
      to: "destinatario",
      subject: "Grazie per averci scelto .",
      text: message,
    });

    res.status(200).send({ success: true, message: "Email inviata con successo!" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: "Errore nell'invio dell'email" });
  }
});

app.listen(3001, () => console.log("Server avviato su porta 3001"));
