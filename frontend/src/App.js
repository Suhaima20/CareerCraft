import React from "react";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ResumeUpload from "./pages/ResumeUpload";

function App() {
  return (
    <div style={{ padding: "30px" }}>
      <h1>CareerCraft</h1>

      <Register />

      <hr />

      <Login />

      <hr />

      <ResumeUpload />
    </div>
  );
}

export default App;