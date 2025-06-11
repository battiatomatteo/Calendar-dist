import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route } from "react-router";
// import App from './App.tsx'
import LogIn from './components/home/LogIn.tsx'
import CalendarPage from './components/pages/CalendarPage.tsx';
import AdminPage from '../src/components/pages/AdminPage.tsx';
import DoctorMessageWindow from './components/pages/DoctorMessageWindow.tsx';
import PatientMessageWindow from './components/pages/PatientMessageWindow.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LogIn />} />
                <Route path="/calendarPage" element={<CalendarPage />} />
                <Route path="/AdminPage" element={<AdminPage />} />
                <Route
                    path="/calendarPage/DoctorMessageWindow"
                    element={
                        <DoctorMessageWindow giorno={''} />
                    }
                />
                <Route
                    path="/calendarPage/PatientMessageWindow"
                    element={
                        <PatientMessageWindow giorno={''} access={false} />
                    }
                />
            </Routes>
        </BrowserRouter>
    </StrictMode>
)
