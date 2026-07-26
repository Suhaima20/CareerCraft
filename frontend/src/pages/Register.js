import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      const response = await axios.post(
        "http://127.0.0.1:5000/register",
        {
          name: name,
          email: email,
          password: password,
        }
      );

      alert("Registration successful! Please login.");

      // Clear fields after successful registration
      setName("");
      setEmail("");
      setPassword("");
      navigate("/");

    } catch (error) {
      console.log("Registration Error:", error);

      if (error.response) {
        alert(error.response.data.message);
      } else {
        alert("Cannot connect to backend server");
      }
    }
  };

  return (
    <div style={{ marginBottom: "30px" }}>
      <h2>CareerCraft Register</h2>

      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <br />
      <br />

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <br />
      <br />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <br />
      <br />

      <button onClick={handleRegister}>
        Register
      </button>
    </div>
  );
}

export default Register;