import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function ProfilePage() {

    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        age: "",
        gender: "",
        qualification: "",
        college: "",
        branch: "",
        graduationYear: "",
        currentStatus: ""
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async () => {

        // Validation
        if (
            !formData.age ||
            !formData.gender ||
            !formData.qualification ||
            !formData.college ||
            !formData.branch ||
            !formData.graduationYear ||
            !formData.currentStatus
        ) {
            alert("Please fill all fields.");
            return;
        }

        if (formData.age < 15 || formData.age > 100) {
            alert("Please enter a valid age.");
            return;
        }

        if (
            formData.graduationYear < 2020 ||
            formData.graduationYear > 2050
        ) {
            alert("Please enter a valid graduation year.");
            return;
        }

        try {

            setLoading(true);

            const token = localStorage.getItem("token");

            await axios.post(
                "http://localhost:5000/user/profile",
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            alert("Basic Profile Saved Successfully!");

            navigate("/career-selection");

        } catch (error) {

            alert(
                error.response?.data?.message ||
                "Unable to save profile."
            );

        } finally {

            setLoading(false);

        }

    };

    return (

        <div
            style={{
                maxWidth: "600px",
                margin: "40px auto",
                padding: "30px",
                border: "1px solid #ddd",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
            }}
        >

            <h2 style={{ textAlign: "center" }}>
                Complete Basic Profile
            </h2>

            <br />

            <input
                type="number"
                name="age"
                placeholder="Age"
                value={formData.age}
                onChange={handleChange}
                style={{ width: "100%", padding: "10px" }}
            />

            <br /><br />

            <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                style={{ width: "100%", padding: "10px" }}
            >
                <option value="">Select Gender</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
            </select>

            <br /><br />

            <input
                type="text"
                name="qualification"
                placeholder="Highest Qualification"
                value={formData.qualification}
                onChange={handleChange}
                style={{ width: "100%", padding: "10px" }}
            />

            <br /><br />

            <input
                type="text"
                name="college"
                placeholder="College / University"
                value={formData.college}
                onChange={handleChange}
                style={{ width: "100%", padding: "10px" }}
            />

            <br /><br />

            <input
                type="text"
                name="branch"
                placeholder="Branch / Specialization"
                value={formData.branch}
                onChange={handleChange}
                style={{ width: "100%", padding: "10px" }}
            />

            <br /><br />

            <input
                type="number"
                name="graduationYear"
                placeholder="Graduation Year"
                value={formData.graduationYear}
                onChange={handleChange}
                style={{ width: "100%", padding: "10px" }}
            />

            <br /><br />

            <select
                name="currentStatus"
                value={formData.currentStatus}
                onChange={handleChange}
                style={{ width: "100%", padding: "10px" }}
            >
                <option value="">Current Status</option>
                <option>Student</option>
                <option>Fresher</option>
                <option>Professional</option>
            </select>

            <br /><br />

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between"
                }}
            >
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        padding: "10px 20px",
                        cursor: "pointer"
                    }}
                >
                    ← Back
                </button>

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{
                        padding: "10px 20px",
                        cursor: "pointer"
                    }}
                >
                    {loading ? "Saving..." : "Save & Continue"}
                </button>
            </div>

        </div>
    );
}

export default ProfilePage;