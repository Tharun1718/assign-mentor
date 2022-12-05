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
  response.send("Hall Booking App is running");
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
