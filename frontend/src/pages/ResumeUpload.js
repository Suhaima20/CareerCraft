import React, { useState } from "react";
import axios from "axios";

function ResumeUpload() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [skills, setSkills] = useState([]);
  const [skillGap, setSkillGap] = useState(null);
  const [recommendedCareer, setRecommendedCareer] = useState(null);
  const [careerRanking, setCareerRanking] = useState([]);

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a PDF file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        "http://127.0.0.1:5000/resume/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log(response.data);

      setMessage(response.data.message);
      setSkills(response.data.skills || []);
      setSkillGap(response.data.skill_gap || null);
      setRecommendedCareer(response.data.recommended_career || null);
      setCareerRanking(response.data.career_ranking || []);
    } catch (error) {
      console.error(error);

      if (error.response) {
        alert(error.response.data.error);
      } else {
        alert("Upload failed");
      }
    }
  };

  return (
    <div>
      <h2>Resume Upload</h2>

      <input
        type="file"
        accept=".pdf"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <br />
      <br />

      <button onClick={handleUpload}>
        Upload Resume
      </button>

      <br />
      <br />

      {message && <h3>{message}</h3>}

      {skills.length > 0 && (
        <>
          <h3>Extracted Skills</h3>
          <ul>
            {skills.map((skill, index) => (
              <li key={index}>{skill}</li>
            ))}
          </ul>
        </>
      )}

      {recommendedCareer && (
        <div style={{ marginTop: "20px" }}>
          <h2>🏆 Recommended Career</h2>

          <p>
            <strong>Career:</strong> {recommendedCareer.career}
          </p>

          <p>
            <strong>Match Score:</strong>{" "}
            {recommendedCareer.match_score}%
          </p>
        </div>
      )}

      {careerRanking.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h2>📊 Top Career Matches</h2>

          <ol>
            {careerRanking.slice(0, 5).map((career, index) => (
              <li key={index}>
                <strong>{career.career}</strong> - {career.match_score}%
              </li>
            ))}
          </ol>
        </div>
      )}

      {skillGap && (
        <div style={{ marginTop: "20px" }}>
          <h2>Skill Gap Analysis</h2>

          <p>
            <strong>Match Score:</strong> {skillGap.match_score}%
          </p>

          <h4>✅ Matched Skills</h4>

          <ul>
            {skillGap.matched_skills.map((skill, index) => (
              <li key={index}>{skill}</li>
            ))}
          </ul>

          <h4>❌ Missing Skills</h4>

          <ul>
            {skillGap.missing_skills.map((skill, index) => (
              <li key={index}>{skill}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ResumeUpload;