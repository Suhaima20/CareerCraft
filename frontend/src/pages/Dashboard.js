import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Dashboard() {

    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {

        try {

            const token = localStorage.getItem("token");

            const response = await axios.get(
                "http://127.0.0.1:5000/user/profile",
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setUser(response.data);

        } catch (error) {

            alert(
                error.response?.data?.message ||
                "Unable to load profile."
            );

        } finally {

            setLoading(false);

        }

    };

    const logout = () => {

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/");

    };

    if (loading) {
        return (
            <div
                style={{
                    textAlign: "center",
                    marginTop: "100px"
                }}
            >
                <h2>Loading Dashboard...</h2>
            </div>
        );
    }

    return (

        <div
            style={{
                width: "900px",
                margin: "40px auto",
                padding: "30px",
                border: "1px solid #ddd",
                borderRadius: "10px",
                boxShadow: "0px 2px 10px rgba(0,0,0,0.15)"
            }}
        >

            <h1 style={{ textAlign: "center" }}>
                CareerCraft Dashboard
            </h1>

            <hr />

            <h2>
                Welcome, {user.name}
            </h2>

            <p>
                <strong>Email :</strong> {user.email}
            </p>

            <p>
                <strong>Target Career :</strong>{" "}
                {user.targetCareer || "Not Selected"}
            </p>

            <p>
                <strong>Active Career :</strong>{" "}
                {user.activeCareer || "Not Selected"}
            </p>

            <p>
                <strong>Profile Method :</strong>{" "}
                {user.inputMethod || "Not Selected"}
            </p>

            <hr />

            <h2>Your Skills</h2>

            {user.skills && user.skills.length > 0 ? (

                <ul>
                    {user.skills.map((skill, index) => (
                        <li key={index}>
                            {skill}
                        </li>
                    ))}
                </ul>

            ) : (

                <p>No skills available.</p>

            )}

            <hr />

            <h2>Learning Roadmap</h2>

            <p>
                Click below to start your personalized learning roadmap.
            </p>

            <button
                onClick={() => navigate("/roadmap")}
                style={{
                    padding: "10px 20px",
                    marginRight: "15px",
                    cursor: "pointer"
                }}
            >
                View Roadmap
            </button>

            <button
                onClick={logout}
                style={{
                    padding: "10px 20px",
                    cursor: "pointer"
                }}
            >
                Logout
            </button>

        </div>

    );

}

export default Dashboard;