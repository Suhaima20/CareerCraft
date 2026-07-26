import React from "react";
import { useNavigate } from "react-router-dom";

function ProfileMethod() {

    const navigate = useNavigate();

    const handleResumeUpload = () => {
        navigate("/resume-upload");
    };

    const handleManualEntry = () => {
        navigate("/manual-skills");
    };


    return (
        <div style={{ padding: "40px", textAlign: "center" }}>

            <h2>Select Your Profile Method</h2>

            <p>
                Choose how you want to provide your skills information
            </p>


            <div style={{ marginTop: "30px" }}>

                <button
                    onClick={handleResumeUpload}
                    style={{
                        padding: "15px 30px",
                        margin: "10px",
                        cursor: "pointer"
                    }}
                >
                    Upload Resume
                </button>


                <button
                    onClick={handleManualEntry}
                    style={{
                        padding: "15px 30px",
                        margin: "10px",
                        cursor: "pointer"
                    }}
                >
                    Enter Skills Manually
                </button>

            </div>

        </div>
    );
}

export default ProfileMethod;