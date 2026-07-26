import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Register from "./pages/Register";
import Login from "./pages/Login";
import CareerSelection from "./pages/CareerSelection";
import ProfileMethod from "./pages/ProfileMethod";
import ResumeUpload from "./pages/ResumeUpload";
import ManualSkillEntry from "./pages/ManualSkillEntry";
import Dashboard from "./pages/Dashboard";

function App() {
    return (
        <BrowserRouter>
            <Routes>

                <Route path="/" element={<Login />} />

                <Route path="/register" element={<Register />} />

                <Route path="/career-selection" element={<CareerSelection />} />

                <Route path="/profile-method" element={<ProfileMethod />} />

                <Route path="/resume-upload" element={<ResumeUpload />} />

                <Route path="/manual-skills" element={<ManualSkillEntry />} />

                <Route path="/dashboard" element={<Dashboard />} />

            </Routes>
        </BrowserRouter>
    );
}

export default App;