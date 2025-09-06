const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()


// middleware
app.use(express.json());
app.use(cors())





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@clustershakibwebcraft.lm1t8cs.mongodb.net/?retryWrites=true&w=majority&appName=ClusterShakibWebCraft`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        const db = client.db("scheduleDB");
        ScheduleCollections = db.collection("schedules");

        // all schedule data get
        app.get("/schedules", async (req, res) => {
            const schedules = await ScheduleCollections.find().toArray();
            res.send(schedules);
        });
        
        // schedule data post
        app.post("/schedules", async (req, res) => {
            const schedule = req.body;
            const result = await ScheduleCollections.insertOne(schedule);
            res.send(result);
        });
       

        // schedule data update
        app.put("/schedules/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const updatedSchedule = req.body;

                const result = await ScheduleCollections.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updatedSchedule }
                );

                res.send(result);
            } catch (err) {
                res.status(500).send({ error: err.message });
            }
        });
        

        // schedule data delete
        app.delete("/schedules/:id", async (req, res) => {
            try {
                const { id } = req.params;

                const result = await ScheduleCollections.deleteOne({
                    _id: new ObjectId(id),
                });

                if (result.deletedCount === 0) {
                    return res.status(404).json({ message: "Schedule not found" });
                }

                res.json({ message: "Deleted successfully" });
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });

        await client.db("admin").command({ ping: 1 });
        console.log("✅ Connected to MongoDB!");
    } catch (err) {
        console.error(err);
    }
}

run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
