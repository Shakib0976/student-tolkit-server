const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 5000;
const { OpenAI } = require("openai");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()


// middleware
app.use(express.json());
app.use(cors())


// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});





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
        const Transaction = db.collection("transactions");
        TransactionCollection = db.collection("transactions");
        const studyPlanner = db.collection("studyPlanner");
        studyPlannerCollection = db.collection("studyPlanner");
        const quizCollection = db.collection("quizResults");
        const reminderCollection = db.collection("reminders");




        // .................schedule data ...................

        // all schedule data get
        app.get("/schedules", async (req, res) => {
            const schedules = await ScheduleCollections.find().toArray();
            res.send(schedules);
        });

        // email wise schedule data get
        app.get("/email/schedules", async (req, res) => {
            const email = req.query.email;
            const result = await ScheduleCollections.find({ email }).toArray();
            res.send(result);
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





        // ...............transaction section...................



        // Get all transactions for a specific user
        app.get("/transactions/:email", async (req, res) => {
            try {
                const email = req.params.email;
                const transactions = await TransactionCollection.find({ userEmail: email }).toArray();
                res.send(transactions);
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });

        // Add a new transaction
        app.post("/transactions", async (req, res) => {
            try {
                const transaction = req.body;
                const result = await TransactionCollection.insertOne(transaction);
                res.send(result);
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });

        // Delete a transaction
        app.delete("/transactions/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const result = await TransactionCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 0) {
                    return res.status(404).json({ message: "Transaction not found" });
                }

                res.json({ message: "Deleted successfully" });
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });


        //..................Study planner ..............


        //  Get tasks by email
        app.get("/tasks/:email", async (req, res) => {
            const { email } = req.params;
            const tasks = await studyPlannerCollection.find({ email }).toArray();
            res.send(tasks);
        });

        //  Add task with email
        app.post("/tasks", async (req, res) => {
            const studyPlanner = req.body;
            const newTask = await studyPlannerCollection.insertOne(studyPlanner);
            res.send(newTask);

        });

        //  Delete task
        app.delete("/tasks/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const result = await studyPlannerCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 0) {
                    return res.status(404).json({ message: "Transaction not found" });
                }

                res.json({ message: "Deleted successfully" });
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });


        // Update a task by ID
        app.put("/tasks/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const updatedTask = { ...req.body };

                // Remove _id if present
                delete updatedTask._id;

                const result = await studyPlannerCollection.findOneAndUpdate(
                    { _id: new ObjectId(id) },
                    { $set: updatedTask },
                    { returnDocument: "after" } // return updated doc
                );

                if (!result.value) {
                    return res.status(404).send({ message: "Task not found" });
                }

                res.send(result.value);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Error updating task" });
            }
        });





        // ...................Quiz generate section .................

        app.post("/generate-question", async (req, res) => {
            try {
                const { subject, type = "MCQ", difficulty = "medium" } = req.body;

                const prompt = `Generate one ${type} question in ${subject} at ${difficulty} difficulty.
                                Provide options (a,b,c,d) if MCQ and clearly mark the correct answer.
                                Return JSON like this:
                               {
                                 "question": "your question here",
                                 "options": ["a) ...", "b) ...", "c) ...", "d) ..."],
                                 "answer": "b"
                               }`;

                const completion = await openai.chat.completions.create({
                    model: "gpt-4.1-mini", // Flash AI
                    messages: [
                        { role: "system", content: "You are an AI exam question generator." },
                        { role: "user", content: prompt },
                    ],
                });

                const rawText = completion.choices[0].message.content;

                let questionData;
                try {
                    questionData = JSON.parse(rawText); // parse JSON output
                } catch (err) {
                    questionData = { question: rawText, options: [], answer: "" }; // fallback
                }

                res.json(questionData);
            } catch (error) {
                console.error("AI question error:", error);
                res.status(500).json({ error: "Failed to generate AI question" });
            }
        });

        // alias for saving attempts
        app.post("/quiz-attempts", async (req, res) => {
            try {
                const quizData = req.body;
                quizData.timestamp = new Date();
                const result = await quizCollection.insertOne(quizData);
                res.send({ message: "Attempt saved", data: result });
            } catch (err) {
                res.status(500).send({ error: err.message });
            }
        });

        // alias for getting attempts
        app.get("/quiz-attempts/:email", async (req, res) => {
            try {
                const { email } = req.params;
                const results = await quizCollection.find({ email }).sort({ timestamp: -1 }).toArray();
                res.send(results);
            } catch (err) {
                res.status(500).send({ error: err.message });
            }
        });

        // clear history
        app.delete("/quiz-attempts/clear/:email", async (req, res) => {
            try {
                const { email } = req.params;
                const result = await quizCollection.deleteMany({ email });
                res.send({ message: "History cleared", deletedCount: result.deletedCount });
            } catch (err) {
                res.status(500).send({ error: err.message });
            }
        });







        // ...............reminder data ...........................


        // Add a reminder
        app.post("/reminders", async (req, res) => {
            try {
                const { email, task, date } = req.body;
                if (!email || !task || !date) {
                    return res.status(400).send({ error: "Missing required fields" });
                }

                const newReminder = {
                    email,
                    task,
                    date,
                    createdAt: new Date(),
                };

                const result = await reminderCollection.insertOne(newReminder);
                res.send({ message: "Reminder added", data: result });
            } catch (err) {
                res.status(500).send({ error: err.message });
            }
        });

        // Get reminders by user email
        app.get("/reminders/:email", async (req, res) => {
            try {
                const { email } = req.params;
                const reminders = await reminderCollection
                    .find({ email })
                    .sort({ date: 1 })
                    .toArray();
                res.send(reminders);
            } catch (err) {
                res.status(500).send({ error: err.message });
            }
        });

        // Delete reminder by id
        app.delete("/reminders/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const result = await reminderCollection.deleteOne({ _id: new ObjectId(id) });
                res.send({ message: "Reminder deleted", deletedCount: result.deletedCount });
            } catch (err) {
                res.status(500).send({ error: err.message });
            }
        });





        await client.db("admin").command({ ping: 1 });
        console.log(" Connected to MongoDB!");
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
