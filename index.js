import express from "express";
import { MongoClient, ObjectId } from "mongodb";
const app = express();

const PORT = 4000;

const MONGO_URL = "mongodb://127.0.0.1";

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
  response.send("Hall Booking App is running");
});

//create mentor
app.post("/createMentor", async function (request, response) {
  const { mentor_name } = request.body;
  const data = {
    "mentor_name" : mentor_name,
    "student_id" : [],
    "student_assigned" : false 
  }
  console.log(mentor_name);
  const result = await client.db("Zendatabase").collection("mentors").insertOne(data);
  response.send(result);
});

//create student
app.post("/createStudent", async function (request, response) {
  const { student_name } = request.body;
  console.log(student_name);
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
  // console.log(mentorFromDB);

  const studentsList = [];
  let initialMenteeCount = 0;

  if(mentorFromDB.student_assigned === true){
      initialMenteeCount = mentorFromDB.student_id.length;
      mentorFromDB.student_id.map( (stud_id ) => studentsList.push(stud_id) )
  }

  for(let i=0; i<students.length; i++){
    const studentName = students[i];
    // console.log(studentName);
    const studentFromDB = await client.db("Zendatabase").collection("students").findOne({ "student_name" : studentName  })
    // console.log(studentFromDB);

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

  // console.log(mentorFromDB)
  const studentFromDB = await client.db("Zendatabase")
                                   .collection("students")
                                   .findOne({ "student_name" : student_name })
   
  console.log(studentFromDB)
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

// to get all the students under a mentor
app.get(`/getAllStudents`, async function (request, response) {
  
  const mentorFromDB = await client.db("Zendatabase")
                                   .collection("mentors")
                                   .findOne({ "mentor_name" : "Divya" });
  
  const studentsList = mentorFromDB.student_id;
  console.log(studentsList)
  if(studentsList.length > 0){
    let students_name = [];
    for(let i=0; i<studentsList.length; i++){
      const studentFromDB = await client.db("Zendatabase")
                                   .collection("students")
                                   .findOne({ "_id" : ObjectId(studentsList[i]) });
      console.log(studentFromDB)
      students_name.push(studentFromDB.student_name)
    }
    students_name = students_name.join(",");
    response.send(`students of ${mentor_name} are ${students_name}`)
  }else{
    response.send(`${mentor_name} has no students`)
  }

});



// api to create rooms
app.post("/createroom", async function (request, response) {
    const data = request.body;
    const { seats_available, amenities, room_name, price } = request.body;

    if(!seats_available || !amenities || !room_name || !price) {
      response.status(400).send("Kindly enter all the required details properly");
    } else {
      const result = await client.db("hallbooking").collection("rooms").insertOne(data);
      response.send(result); 
    }
});

// api to book rooms
app.post("/bookroom", async function ( request, response) {
  const data = request.body
  const { id, start_time, end_time, booking_date} = request.body;
  data.booking_date = new Date(booking_date);
  data.start_time = new Date(booking_date + "T" + start_time + ":00.000Z");
  data.end_time = new Date(booking_date + "T" + end_time + ":00.000Z");
  data.booking_status = "booked";

  let isroombooked = await client.db("hallbooking")
                                 .collection("booked_rooms")
                                 .find({
                                    $and : [
                                      {
                                        $or : [
                                          {
                                            $and : [
                                              { start_time : { $lte : new Date(data.start_time)}},
                                              { end_time : { $gte : new Date(data.start_time)}}
                                            ]
                                          },
                                          {
                                            $and : [
                                              { start_time : { $lte : new Date(data.end_time)}},
                                              { end_time : { $gte : new Date(data.end_time)}}
                                            ]
                                          }
                                        ]
                                      },
                                      { id : id }
                                    ]
                                 }).toArray()

  if(isroombooked === 0){
    let result = await client
                       .db("hallbooking")
                       .collection("booked_rooms")
                       .insertOne(data)

    let updateresult = await client 
                              .db("hallbooking")
                              .collection("rooms")
                              .updateOne(
                                { _id : ObjectId(id)},
                                { $set : { booking_status : "Booked"}}
                              )
    response.send(result);
  }else {
    response.status(400).send("Room has been booked for this time slot.");
  }
});

app.listen(PORT, () => console.log(`The server started in: ${PORT} ✨✨`));
