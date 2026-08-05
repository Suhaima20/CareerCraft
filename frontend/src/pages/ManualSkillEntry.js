import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function ManualSkillEntry() {

    const navigate = useNavigate();

    const [skills, setSkills] = useState("");
    const [message, setMessage] = useState("");

    const [recommendedCareer, setRecommendedCareer] = useState(null);
    const [careerRanking, setCareerRanking] = useState([]);
    const [loading, setLoading] = useState(false);

    const saveSkills = async () => {

        const skillArray = skills
            .split(",")
            .map(skill => skill.trim())
            .filter(skill => skill.length > 0);

        if (skillArray.length === 0) {
            setMessage("Please enter at least one skill.");
            return;
        }

        try {

            setLoading(true);

            // Save Skills
            const saveResponse = await axios.post(
                "http://127.0.0.1:5000/user/skills",
                {
                    skills: skillArray
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    }
                }
            );

            setMessage(saveResponse.data.message);

            // Get Career Recommendation
            const recommendResponse = await axios.post(
                "http://127.0.0.1:5000/career/recommend",
                {
                    skills: skillArray
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    }
                }
            );

            setRecommendedCareer(
                recommendResponse.data.recommended_career
            );

            setCareerRanking(
                recommendResponse.data.career_ranking || []
            );

        } catch (error) {

            console.log(error);

            setMessage(
                error.response?.data?.message ||
                "Something went wrong."
            );

        } finally {

            setLoading(false);

        }

    };

    return (

        <div
            style={{
                width: "700px",
                margin: "40px auto"
            }}
        >

            <h2>Manual Skill Entry</h2>

            <p>
                Enter your skills separated by commas.
            </p>

            <input
                type="text"
                placeholder="Python, SQL, Excel, Machine Learning"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                style={{
                    width: "100%",
                    padding: "10px"
                }}
            />

            <br /><br />

            <button
                onClick={saveSkills}
                disabled={loading}
            >
                {loading ? "Processing..." : "Save Skills"}
            </button>

            <br /><br />

            {message && (
                <h3>{message}</h3>
            )}

            {recommendedCareer && (

                <div style={{ marginTop: "30px" }}>

                    <h2>Recommended Career</h2>

                    <p>
                        <strong>Career :</strong>{" "}
                        {recommendedCareer.career}
                    </p>

                    <p>
                        <strong>Match Score :</strong>{" "}
                        {recommendedCareer.match_score}%
                    </p>

                </div>

            )}

            {careerRanking.length > 0 && (

                <div style={{ marginTop: "30px" }}>

                    <h2>Top Career Matches</h2>

                    <ol>

                        {careerRanking.slice(0,5).map((career,index)=>(
                            <li key={index}>
                                {career.career} - {career.match_score}%
                            </li>
                        ))}

                    </ol>

                </div>

            )}

            {(recommendedCareer) && (

                <button
                    style={{
                        marginTop:"30px",
                        padding:"10px 20px"
                    }}
                    onClick={()=>navigate("/dashboard")}
                >
                    Continue to Dashboard
                </button>

            )}

        </div>

    );

}

export default ManualSkillEntry;