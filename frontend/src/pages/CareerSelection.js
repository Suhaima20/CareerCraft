import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    getCareers,
    selectCareer
} from "../services/careerService";

function CareerSelection() {

    const navigate = useNavigate();

    const [careers, setCareers] = useState([]);
    const [selectedCareer, setSelectedCareer] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCareers();
    }, []);

    const loadCareers = async () => {
        try {
            const response = await getCareers();
            setCareers(response.careers);
        } catch (error) {
            alert("Failed to load careers.");
        } finally {
            setLoading(false);
        }
    };

    const handleContinue = async () => {

        if (!selectedCareer) {
            alert("Please select a career.");
            return;
        }

        try {

            await selectCareer(selectedCareer);

            alert("Career selected successfully.");

            navigate("/profile-method");

        } catch (error) {

            alert(
                error.response?.data?.message ||
                "Unable to save career."
            );

        }

    };

    if (loading) {
        return (
            <div style={{ textAlign: "center", marginTop: "80px" }}>
                <h2>Loading careers...</h2>
            </div>
        );
    }

    return (

        <div
            style={{
                width: "500px",
                margin: "50px auto",
                textAlign: "center"
            }}
        >

            <h2>Select Your Career</h2>

            <p>
                Choose the career you want CareerCraft to prepare you for.
            </p>

            <select
                value={selectedCareer}
                onChange={(e) => setSelectedCareer(e.target.value)}
                style={{
                    width: "100%",
                    padding: "10px"
                }}
            >
                <option value="">
                    -- Select Career --
                </option>

                {careers.map((career, index) => (
                    <option
                        key={index}
                        value={career}
                    >
                        {career}
                    </option>
                ))}
            </select>

            <br /><br />

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between"
                }}
            >
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        padding: "10px 20px"
                    }}
                >
                    ← Back
                </button>

                <button
                    onClick={handleContinue}
                    disabled={!selectedCareer}
                    style={{
                        padding: "10px 20px"
                    }}
                >
                    Continue →
                </button>
            </div>

        </div>

    );
}

export default CareerSelection;