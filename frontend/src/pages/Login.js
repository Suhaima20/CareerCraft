import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async () => {
        try {
            const response = await axios.post(
                "http://127.0.0.1:5000/login",
                {
                    email,
                    password,
                }
            );

            // Save JWT Token
            localStorage.setItem(
                "token",
                response.data.token
            );

            alert("Login Successful");

            // Get logged in user
            const user = response.data.user;

            // Check if career is selected
            if (!user.targetCareer) {
                navigate("/career-selection");
            } else {
                navigate("/profile-method");
            }

        } catch (error) {
            alert(
                error.response?.data?.message ||
                "Login failed"
            );
        }
    };

    return (
        <div>
            <h2>CareerCraft Login</h2>

            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />

            <br /><br />

            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />

            <br /><br />

            <button onClick={handleLogin}>
                Login
            </button>

            <br /><br />

            <p>Don't have an account?</p>

            <button onClick={() => navigate("/register")}>
                Register
            </button>
        </div>
    );
}

export default Login;