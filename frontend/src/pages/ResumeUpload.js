import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function ResumeUpload() {

    const navigate = useNavigate();

    const [file, setFile] = useState(null);
    const [message, setMessage] = useState("");
    const [skills, setSkills] = useState([]);
    const [skillGap, setSkillGap] = useState(null);
    const [recommendedCareer, setRecommendedCareer] = useState(null);
    const [careerRanking, setCareerRanking] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleUpload = async () => {

        if (!file) {
            alert("Please select a PDF file.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {

            setLoading(true);

            const response = await axios.post(
                "http://127.0.0.1:5000/resume/upload",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    }
                }
            );

            setMessage(response.data.message);
            setSkills(response.data.skills || []);
            setSkillGap(response.data.skill_gap || null);
            setRecommendedCareer(response.data.recommended_career || null);
            setCareerRanking(response.data.career_ranking || []);

        } catch (error) {

            console.log(error);

            if (error.response) {
                alert(error.response.data.error);
            } else {
                alert("Upload failed.");
            }

        } finally {

            setLoading(false);

        }

    };

    return (

        <div
            style={{
                width: "800px",
                margin: "40px auto",
                padding: "30px"
            }}
        >

            <h2>Resume Upload</h2>

            <input
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files[0])}
            />

            <br /><br />

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between"
                }}
            >

                <button
                    onClick={() => navigate(-1)}
                >
                    ← Back
                </button>

                <button
                    onClick={handleUpload}
                    disabled={loading}
                >
                    {loading ? "Uploading..." : "Upload Resume"}
                </button>

            </div>

            <br />

            {message && (
                <h3>{message}</h3>
            )}

            {skills.length > 0 && (
                <>
                    <h3>Extracted Skills</h3>

                    <ul>
                        {skills.map((skill, index) => (
                            <li key={index}>{skill}</li>
                        ))}
                    </ul>
                </>
            )}

            {recommendedCareer && (
                <div style={{ marginTop: "20px" }}>

                    <h2>🏆 Recommended Career</h2>

                    <p>
                        <strong>Career:</strong>{" "}
                        {recommendedCareer.career}
                    </p>

                    <p>
                        <strong>Match Score:</strong>{" "}
                        {recommendedCareer.match_score}%
                    </p>

                </div>
            )}

            {careerRanking.length > 0 && (
                <div style={{ marginTop: "20px" }}>

                    <h2>📊 Top Career Matches</h2>

                    <ol>
                        {careerRanking.slice(0, 5).map((career, index) => (
                            <li key={index}>
                                <strong>{career.career}</strong> - {career.match_score}%
                            </li>
                        ))}
                    </ol>

                </div>
            )}

            {skillGap && (
                <div style={{ marginTop: "20px" }}>

                    <h2>Skill Gap Analysis</h2>

                    <p>
                        <strong>Match Score:</strong> {skillGap.match_score}%
                    </p>

                    <h4>✅ Matched Skills</h4>

                    <ul>
                        {skillGap.matched_skills.map((skill, index) => (
                            <li key={index}>{skill}</li>
                        ))}
                    </ul>

                    <h4>❌ Missing Skills</h4>

                    <ul>
                        {skillGap.missing_skills.map((skill, index) => (
                            <li key={index}>{skill}</li>
                        ))}
                    </ul>

                </div>
            )}

            {recommendedCareer && (

                <div
                    style={{
                        marginTop: "30px",
                        textAlign: "center"
                    }}
                >

                    <button
                        onClick={() => navigate("/dashboard")}
                        style={{
                            padding: "12px 30px",
                            fontSize: "16px",
                            cursor: "pointer"
                        }}
                    >
                        Continue to Dashboard →
                    </button>

                </div>

            )}

        </div>

    );

}

export default ResumeUpload;