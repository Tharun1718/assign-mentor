import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import * as dotenv from 'dotenv';
dotenv.config()

const app = express();

const PORT = process.env.PORT;

const MONGO_URL = process.env.MONGO_URL;

async function createConnection(){
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  console.log("Mongo is connected ❤")
  return client;
}

export const client = await createConnection();

app.use(express.json());

// home page
app.get("/", function (request, response) {
  response.send("App is running");
});

//create mentor
app.post("/createMentor", async function (request, response) {
  const { mentor_name } = request.body;
  
  const data = {
    "mentor_name" : mentor_name,
    "student_id" : [],
    "student_assigned" : false 
  }
  
  const result = await client.db("Zendatabase").collection("mentors").insertOne(data);
  
  response.send(result);
});

//create student
app.post("/createStudent", async function (request, response) {
  const { student_name } = request.body;
  
  const data = {
    "student_name" : student_name,
    "mentor_name": "",
    "mentor_id" : "",
    "mentor_assigned" : false
  }
  const result = await client.db("Zendatabase").collection("students").insertOne(data);
  response.send(result);
});

//assigning students to the mentor
app.put("/assignMentor", async function (request, response) {
  const { mentor_name, students } = request.body;
  
  const mentorFromDB = await client.db("Zendatabase").collection("mentors").findOne({ "mentor_name" : mentor_name  })

  const studentsList = [];
  let initialMenteeCount = 0;

  if(mentorFromDB.student_assigned === true){
      initialMenteeCount = mentorFromDB.student_id.length;
      mentorFromDB.student_id.map( (stud_id ) => studentsList.push(stud_id) )
  }

  for(let i=0; i<students.length; i++){
    const studentName = students[i];
    console.log(studentName)
    const studentFromDB = await client.db("Zendatabase").collection("students").findOne({ "student_name" : studentName  })
    console.log(studentFromDB);

    if(studentFromDB.mentor_assigned === false ){
       const data = await client.db("Zendatabase")
                                .collection("students")
                                .updateOne(
                                  { 
                                    "student_name" : studentName 
                                  },
                                  { 
                                    $set : 
                                      {
                                        "mentor_name" : mentorFromDB.mentor_name,
                                        "mentor_id" : mentorFromDB._id,
                                        "mentor_assigned" : true
                                      }
                                  }
                                )
      studentsList.push(studentFromDB._id);
    }
  }

  if((studentsList.length - initialMenteeCount) > 0){
    const res = await client.db("Zendatabase")
                            .collection("mentors")
                            .updateOne(
                              {"mentor_name" : mentor_name},
                              { $set : {
                                "student_id": studentsList,
                                "student_assigned": true
                              }}
                            )
    response.send("Mentor have assigned for the students")
  }else{
    response.send("Students already have an mentor")
  }  
});

// to change mentor for a student
app.put("/changeMentor", async function (request, response) {
  const {mentor_name, student_name} = request.body;
  
  const mentorFromDB = await client.db("Zendatabase")
                                   .collection("mentors")
                                   .findOne({ "mentor_name" : mentor_name })

  const studentFromDB = await client.db("Zendatabase")
                                   .collection("students")
                                   .findOne({ "student_name" : student_name })
   
  let sameMentorCheck = mentorFromDB.student_id.filter((std_id)=>{
    if(String(std_id) === String(studentFromDB._id)){
      return std_id;
    }
  })

  if(sameMentorCheck.length > 0){
    response.send("Student is already assigned to the same mentor");
  }else{
    let flag=0;
    
    if(studentFromDB.mentor_assigned === true){
      let oldMentorStudentList = [];
      const oldMentorFromDB = await client.db("Zendatabase")
                                   .collection("mentors")
                                   .findOne({ "mentor_name" : studentFromDB.mentor_name })

      if(oldMentorFromDB.student_id.length > 1){
          oldMentorStudentList = oldMentorFromDB.student_id;
          oldMentorStudentList = oldMentorStudentList.filter((std_id)=>{
             if(String(std_id) !== String(studentFromDB._id)){
              return std_id;
             }
          })
        const res = await client.db("Zendatabase")
                                .collection("mentors")
                                .updateOne(
                                  { "mentor_name" : oldMentorFromDB.mentor_name},
                                  { $set : { "student_id" :oldMentorStudentList }}
                                )
      }else{
        const res = await client.db("Zendatabase")
                                .collection("mentors")
                                .updateOne(
                                  { "mentor_name" : oldMentorFromDB.mentor_name},
                                  { $set : { "student_id" : [] ,"student_assigned" : false }}
                                )
      }

      flag = 1;
    }
    const studentList = [];

    if(mentorFromDB.student_assigned === true){
      mentorFromDB.student_id.map((stud_id) => studentList.push(stud_id))
    }

    const result = await client.db("Zendatabase")
                                .collection("mentors")
                                .updateOne(
                                  { "mentor_name" : mentor_name},
                                  { $set : { "student_id" : studentList,"student_assigned" : true }}
                                )

    const result3 = await client.db("Zendatabase")
                                .collection("students")
                                .updateOne(
                                  { "student_name" : student_name},
                                  { $set : 
                                    { "mentor_id" : mentorFromDB._id,
                                      "mentor_name" : mentorFromDB.mentor_name,
                                      "menotor_assigned" : true 
                                    }
                                  }
                                )

    if(flag === 1) {
      response.send("Mentor changed for the student")
    }else{
      response.send("Mentor assigned for the student")
    }
  }

});

// to get all the students 
app.get("/getAllStudents/:mentorName", async function (request, response) {
  const {mentorName} = request.params
  const mentorFromDB = await client.db("Zendatabase")
                              .collection("mentors")
                              .findOne({"mentor_name": mentorName})

  const studentsList = mentorFromDB.student_id;
  
  if(studentsList.length > 0){
    let students_name = [];
    for(let i=0; i<studentsList.length; i++){
      const studentFromDB = await client.db("Zendatabase")
                                   .collection("students")
                                   .findOne({ "_id" : ObjectId(studentsList[i]) });
     
      students_name.push(studentFromDB.student_name)
    }
    students_name = students_name.join(",");
    response.send(`students of ${mentorName} are ${students_name}`)
  }else{
    response.send(`${mentorName} has no students`)
  }
});


app.listen(PORT, () => console.log(`The server started in: ${PORT} ✨✨`));
