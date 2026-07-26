import React, { useState } from "react";
import axios from "axios";

function ManualSkillEntry() {

    const [skills, setSkills] = useState("");
    const [message, setMessage] = useState("");

    const saveSkills = async () => {

        const skillArray = skills
            .split(",")
            .map(skill => skill.trim())
            .filter(skill => skill.length > 0);


        if (skillArray.length === 0) {
            setMessage("Please enter at least one skill");
            return;
        }


        try {

            const response = await axios.post(
                "http://127.0.0.1:5000/user/skills",
                {
                    skills: skillArray
                },
                {
                    headers: {
                        Authorization:
                            `Bearer ${localStorage.getItem("token")}`
                    }
                }
            );


            setMessage(response.data.message);

        } catch (error) {

            console.log(error);

            if (error.response) {
                setMessage(error.response.data.message || "Failed to save skills");
            } else {
                setMessage("Server not reachable");
            }
        }
    };


    return (
        <div style={{ padding: "30px" }}>

            <h2>Enter Your Skills</h2>

            <p>
                Enter your skills separated by commas
            </p>


            <input
                type="text"
                placeholder="Example: Python, SQL, Excel"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                style={{
                    width: "400px",
                    padding: "10px"
                }}
            />


            <br />
            <br />


            <button onClick={saveSkills}>
                Save Skills
            </button>


            <h3>{message}</h3>

        </div>
    );
}

export default ManualSkillEntry;