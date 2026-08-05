import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Login() {

    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {

        if (!email || !password) {
            alert("Please enter both email and password.");
            return;
        }

        try {

            setLoading(true);

            const response = await axios.post(
                "http://127.0.0.1:5000/login",
                {
                    email,
                    password
                }
            );

            // Save JWT Token
            localStorage.setItem("token", response.data.token);

            // Save user data (optional but useful later)
            localStorage.setItem(
                "user",
                JSON.stringify(response.data.user)
            );

            const user = response.data.user;

            /*
                FLOW

                1. First Login
                   → No Career Selected
                   → Go to Profile Page

                2. Existing User
                   → Career already selected
                   → Continue from Profile Method
            */

            if (!user.targetCareer) {
                navigate("/profile");
            } else {
                navigate("/profile-method");
            }

        } catch (error) {

            alert(
                error.response?.data?.message ||
                "Invalid email or password."
            );

        } finally {

            setLoading(false);

        }

    };

    return (

        <div style={{ textAlign: "center", marginTop: "60px" }}>

            <h2>CareerCraft Login</h2>

            <br />

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
                onClick={handleLogin}
                disabled={loading}
                style={{
                    padding: "10px 25px",
                    cursor: "pointer"
                }}
            >
                {loading ? "Logging in..." : "Login"}
            </button>

            <br /><br />

            <p>Don't have an account?</p>

            <button
                onClick={() => navigate("/register")}
                style={{
                    padding: "10px 25px",
                    cursor: "pointer"
                }}
            >
                Register
            </button>

        </div>

    );
}

export default Login;