import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ProfilePage from "./pages/ProfilePage";
import CareerSelection from "./pages/CareerSelection";
import ProfileMethod from "./pages/ProfileMethod";
import ResumeUpload from "./pages/ResumeUpload";
import ManualSkillEntry from "./pages/ManualSkillEntry";
import Dashboard from "./pages/Dashboard";
import LearningRoadmap from "./pages/LearningRoadmap";

function App() {
    return (
        <BrowserRouter>

            <Routes>

                {/* Authentication */}
                <Route
                    path="/"
                    element={<Login />}
                />

                <Route
                    path="/register"
                    element={<Register />}
                />

                {/* Basic Profile */}
                <Route
                    path="/profile"
                    element={<ProfilePage />}
                />

                {/* Career Selection */}
                <Route
                    path="/career-selection"
                    element={<CareerSelection />}
                />

                {/* Profile Method */}
                <Route
                    path="/profile-method"
                    element={<ProfileMethod />}
                />

                {/* Resume Upload */}
                <Route
                    path="/resume-upload"
                    element={<ResumeUpload />}
                />

                {/* Manual Skills */}
                <Route
                    path="/manual-skills"
                    element={<ManualSkillEntry />}
                />

                {/* Dashboard */}
                <Route
                    path="/dashboard"
                    element={<Dashboard />}
                />

                {/* Learning Roadmap */}
                <Route
                    path="/roadmap"
                    element={<LearningRoadmap />}
                />

            </Routes>

        </BrowserRouter>
    );
}

export default App;