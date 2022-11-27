import express from "express";
import { MongoClient } from "mongodb";
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
  console.log(mentorFromDB);

  const studentsList = [];
  let initialMenteeCount = 0;

  if(mentorFromDB.student_assigned === true){
      initialMenteeCount = mentorFromDB.student_id.length;
      mentorFromDB.student_id.map( (stud_id ) => studentsList.push(stud_id) )
  }

  for(let i=0; i<students.length; i++){
    const studentName = students[i];

    const studentFromDB = await client.db("Zendatabase").collection("students").findOne({ "student_name" : studentName  })
    console.log(studentFromDB);

    if(studentFromDB.mentor_assigned === false ){
       const data = await client.db("Zendatabase")
                                .collection("students")
                                .findOne(
                                  { 
                                    "student_name" : studentName 
                                  },
                                  { 
                                    $set : 
                                      {
                                        "mentor_name" : mentorFromDB.name,
                                        "mentor_id" : mentorFromDB._id,
                                        "mentor_assigned" : true
                                      }
                                  }
                                )
      studentsList.push(studentFromDB._id);
    }
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
