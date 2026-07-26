import axios from "axios";

// Backend Base URL
const API_URL = "http://127.0.0.1:5000";

// Get all careers
export const getCareers = async () => {
    try {
        const response = await axios.get(`${API_URL}/career/list`);
        return response.data;
    } catch (error) {
        console.error("Error fetching careers:", error);
        throw error;
    }
};

// Save selected career
export const selectCareer = async (career) => {
    try {
        const token = localStorage.getItem("token");

        const response = await axios.post(
            `${API_URL}/career/select`,
            {
                career: career
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        return response.data;
    } catch (error) {
        console.log("Status:", error.response?.status);
        console.log("Response:", error.response?.data);
        alert(JSON.stringify(error.response?.data));
        throw error;
    }
};