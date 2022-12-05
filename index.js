import express from "express";
import { MongoClient, MongoServerError, ObjectId } from "mongodb";
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
app.post("/createRoom", async function (request, response) {
    const data = request.body;
    const { seats_available, amenities, room_name, price } = request.body;

    if(!seats_available || !amenities || !room_name || !price) {
      response.status(400).send("Kindly enter all the required details properly");
    } else {
      const result = await client.db("hallbooking").collection("rooms").insertOne(data);
      response.send(result); 
    }
});


app.post("/bookRoom", async function (request, response) {
    const data = request.body
    const { id, start_time, end_time, booking_date } = request.body

    const checkRoom = await client.db("hallbooking")
                              .collection("booked_rooms")
                              .find({
                                $and:[
                                  {"id" : id},
                                  {"booking_date" : booking_date},
                                  {
                                    $or:[
                                      {
                                        $and:[
                                          { start_time : { $lte: start_time }},
                                          { end_time : { $gte: start_time }}
                                        ]
                                      },
                                      {
                                        $and:[
                                          { start_time: { $lte: end_time} },
                                          { end_time: { $gte: end_time} }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }).toArray();

    if(checkRoom.length === 0){
    const result = await client.db("hallbooking").collection("booked_rooms").insertOne(data);

    const updatedResult = await client.db("hallbooking")
                                .collection("rooms")
                                .updateOne({ _id:ObjectId(id) },{$set:{booking_status : "booked"}});

    response.send(result)
    }else{
      response.status(400).send("room already booked for this slot")
    }
})


app.get("/listAllRooms", async function(request, response) {
    
    let query = [
      {
        $addFields : { room_id: { $toString: "$_id" } }
      },
      {
        $lookup: {
          from:"booked_rooms",
          localField:"room_id",
          foreignField: "id",
          as: "booking_details"
        }
      },
      {
        $unwind: "$booking_details"
      },
      {
        $project : {
          _id: 0,
          "room_no" : "$_id",
          "room_name": "$room_name",
          "booking_status":"$booking_status",
          "customer_name": "$booking_details.customer_name",
          "booking_date" : "$booking_details.booking_date",
          "start_time" : "$booking_details.start_time",
          "end_time":"$booking_details.end_time"
        }
      }
    ]

    const roomsFromDB = await client.db("hallbooking").collection("rooms").aggregate(query).toArray();
    
    response.send(roomsFromDB);
})


app.get("/listAllCustomers", async function(request, response) {
    
    let query = [
      {
        $addFields : { match_id: { $toString: "$_id" } }
      },
      {
        $lookup: {
          from:"booked_rooms",
          localField:"match_id",
          foreignField: "id",
          as: "booking_details"
        }
      },
      {
        $unwind: "$booking_details"
      },
      {
        $project : {
          _id: 0,
          "customer_name": "$booking_details.customer_name",
          "room_name": "$room_name",
          "booking_date" : "$booking_details.booking_date",
          "start_time" : "$booking_details.start_time",
          "end_time":"$booking_details.end_time"
        }
      }
    ]

    const customersFromDB = await client.db("hallbooking").collection("rooms").aggregate(query).toArray();
    
    response.send(customersFromDB);
})


app.listen(PORT, () => console.log(`The server started in: ${PORT} ✨✨`));
