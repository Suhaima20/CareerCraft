import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Register() {

    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {

        if (!name || !email || !password) {
            alert("Please fill all the fields.");
            return;
        }

        try {

            setLoading(true);

            // Register User
            await axios.post(
                "http://127.0.0.1:5000/register",
                {
                    name,
                    email,
                    password
                }
            );

            // Automatically Login
            const loginResponse = await axios.post(
                "http://127.0.0.1:5000/login",
                {
                    email,
                    password
                }
            );

            // Save JWT Token
            localStorage.setItem(
                "token",
                loginResponse.data.token
            );

            // Save User Details
            localStorage.setItem(
                "user",
                JSON.stringify(loginResponse.data.user)
            );

            alert("Registration Successful!");

            navigate("/profile");

        } catch (error) {

            console.log(error);

            alert(
                error.response?.data?.message ||
                "Registration failed."
            );

        } finally {

            setLoading(false);

        }

    };

    return (

        <div style={{ textAlign: "center", marginTop: "50px" }}>

            <h2>CareerCraft Register</h2>

            <br />

            <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                    width: "300px",
                    padding: "10px"
                }}
            />

            <br /><br />

            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                    width: "300px",
                    padding: "10px"
                }}
            />

            <br /><br />

            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                    width: "300px",
                    padding: "10px"
                }}
            />

            <br /><br />

            <button
                onClick={handleRegister}
                disabled={loading}
                style={{
                    padding: "10px 25px",
                    cursor: "pointer"
                }}
            >
                {loading ? "Registering..." : "Register"}
            </button>

            <br /><br />

            <p>Already have an account?</p>

            <button
                onClick={() => navigate("/")}
                style={{
                    padding: "10px 25px",
                    cursor: "pointer"
                }}
            >
                Login
            </button>

        </div>

    );
}

export default Register;