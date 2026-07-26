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

            alert("Career selected successfully!");

            navigate("/profile-method");

        } catch (error) {
            alert("Unable to save career.");
        }
    };

    if (loading) {
        return <h2>Loading careers...</h2>;
    }

    return (
        <div style={{ padding: "30px" }}>

            <h1>Choose Your Dream Career</h1>

            <p>
                Select the career you want to pursue.
            </p>

            <select
                value={selectedCareer}
                onChange={(e) =>
                    setSelectedCareer(e.target.value)
                }
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

            <br />
            <br />

            <button onClick={handleContinue}>
                Continue
            </button>

        </div>
    );
}

export default CareerSelection;