import React, { useEffect, useState } from "react";
import axios from "axios";
import "./LearningRoadmap.css";


const LearningRoadmap = () => {


    const [roadmap, setRoadmap] = useState(null);

    const [loading, setLoading] = useState(true);

    const [openSkill, setOpenSkill] = useState(null);

    const [openChapter, setOpenChapter] = useState(null);

    const [completed, setCompleted] = useState([]);



    const token = localStorage.getItem("token");





    useEffect(() => {

        fetchRoadmap();

        fetchProgress();

    }, []);







    // ==========================
    // Fetch User Roadmap
    // ==========================

    const fetchRoadmap = async () => {


        try {


            const response = await axios.get(

                "http://localhost:5000/roadmap/my-roadmap",

                {
                    headers:{
                        Authorization:`Bearer ${token}`
                    }
                }

            );


            console.log(
                "ROADMAP:",
                response.data
            );


            setRoadmap(response.data);



        }


        catch(error){


            console.log(

                "Roadmap Error:",
                error.response?.data || error.message

            );


        }



        finally{


            setLoading(false);


        }


    };









    // ==========================
    // Fetch Completed Chapters
    // ==========================

    const fetchProgress = async () => {


        try {



            const response = await axios.get(


                "http://localhost:5000/progress/my-progress",


                {

                    headers:{

                        Authorization:`Bearer ${token}`

                    }

                }


            );



            const completedIds =


            response.data.completed_chapters.map(


                item => item.chapter_id


            );



            setCompleted(completedIds);



        }



        catch(error){


            console.log(

                "Progress Error:",

                error.response?.data || error.message

            );


        }


    };









    // ==========================
    // Mark Complete / Remove
    // ==========================

    const markComplete = async(chapterId)=>{


        try{


            if(completed.includes(chapterId)){



                await axios.post(


                    "http://localhost:5000/progress/remove",


                    {

                        chapter_id:chapterId

                    },


                    {

                        headers:{

                            Authorization:`Bearer ${token}`,

                            "Content-Type":"application/json"

                        }

                    }


                );




                setCompleted(


                    completed.filter(

                        id => id !== chapterId

                    )


                );




            }



            else{



                await axios.post(


                    "http://localhost:5000/progress/complete",


                    {

                        chapter_id:chapterId

                    },


                    {

                        headers:{

                            Authorization:`Bearer ${token}`,

                            "Content-Type":"application/json"

                        }

                    }


                );





                setCompleted(


                    [

                        ...completed,

                        chapterId

                    ]


                );



            }



        }



        catch(error){


            console.log(

                "Update Progress Error:",

                error.response?.data || error.message

            );


        }


    };









    if(loading){


        return (

            <div className="loading">

                Loading Roadmap...

            </div>

        );


    }








    if(!roadmap){


        return (

            <div className="error-message">

                No roadmap available

            </div>

        );


    }









    const totalChapters =


    roadmap.skills.reduce(


        (total,skill)=>


        total + skill.chapters.length,


        0


    );





    const progressPercentage = totalChapters === 0

    ? 0

    :

    Math.round(

        (completed.length / totalChapters) * 100

    );









    return (



        <div className="roadmap-container">





            <div className="roadmap-header">



                <h1>

                    Personalized Learning Roadmap

                </h1>




                <h2>

                    {roadmap.career["Career name"]}

                </h2>




                <p>

                    {roadmap.career["Career description"]}

                </p>




            </div>









            <div className="skills-section">


                <h2>

                    Skills Roadmap

                </h2>







                {

                roadmap.skills.map(


                    (skillData,index)=>(




                    <div

                    className="skill-card"

                    key={skillData.skill["Skill ID"]}


                    >







                        <div

                        className="skill-header"


                        onClick={()=>


                            setOpenSkill(

                                openSkill === index

                                ?

                                null

                                :

                                index

                            )


                        }


                        >




                            <h2>


                            {

                            openSkill === index

                            ?

                            "▼"

                            :

                            "▶"

                            }



                            {" "}


                            Step {index+1} :


                            {" "}



                            {skillData.skill["Skill name"]}



                            </h2>





                        </div>









                        {


                        openSkill === index &&



                        <div className="skill-content">





                            <p className="skill-description">


                                {

                                skillData.skill["Skill description"]

                                }


                            </p>







                            <div className="chapter-list">



                            <h4>

                                Chapters

                            </h4>








                            {


                            skillData.chapters.map(


                                chapter=>(




                                <div

                                className="chapter-card"

                                key={chapter["Chapter ID"]}


                                >







                                    <div

                                    className="chapter-title"


                                    onClick={()=>


                                        setOpenChapter(


                                            openChapter === chapter["Chapter ID"]

                                            ?

                                            null

                                            :

                                            chapter["Chapter ID"]


                                        )


                                    }


                                    >




                                        <h3>



                                        {

                                        openChapter === chapter["Chapter ID"]

                                        ?

                                        "▼"

                                        :

                                        "▶"

                                        }



                                        {" "}



                                        {chapter["Chapter name"]}



                                        </h3>




                                    </div>









                                    {


                                    openChapter === chapter["Chapter ID"] &&



                                    <div className="chapter-details">






                                        <p>

                                            {chapter["Chapter description"]}

                                        </p>







                                        {


                                        chapter["Link"] &&



                                        <a

                                       className="course-link"

                                        href={chapter["Link"]}

                                        target="_blank"

                                        rel="noreferrer"

                                        >

                                            Start Learning 🔗

                                        </a>



                                        }








                                        <label>



                                        <input


                                        type="checkbox"


                                        checked={

                                            completed.includes(

                                                chapter["Chapter ID"]

                                            )

                                        }



                                        onChange={()=>


                                            markComplete(

                                                chapter["Chapter ID"]

                                            )


                                        }


                                        />



                                        Mark as Completed




                                        </label>






                                    </div>



                                    }






                                </div>



                                )


                            )


                            }





                            </div>






                        </div>



                        }







                    </div>




                    )


                )


                }






            </div>









            <div className="progress-box">





                <h2>

                    Learning Progress

                </h2>





                <div className="progress-percentage">


                    {progressPercentage}%


                </div>







                <div className="progress-track">



                    <div

                    className="progress-bar-fill"


                    style={{

                        width:`${progressPercentage}%`

                    }}


                    >


                    </div>




                </div>








                <p>


                    Completed :

                    {" "}

                    {completed.length}

                    /

                    {totalChapters}

                    Chapters



                </p>






                {


                progressPercentage === 100 &&



                <div className="completed-badge">


                    🎉 Skill Completed


                </div>


                }





            </div>






        </div>



    );



};



export default LearningRoadmap;