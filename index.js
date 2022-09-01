import express from "express";
import { MongoClient } from "mongodb";
import dotenv from 'dotenv';
import dayjs from 'dayjs';
dotenv.config();

const mongoClient = new MongoClient('mongodb://localhost:27017');
let db;
mongoClient.connect(() => {
    db = mongoClient.db("batepapouol");
});

const server = express();
server.use(express.json());

// ****Creating and Listing Participants****//
server.post('/participants', async (req, res) => {
    try {
        const search = await db.collection('participants').findOne({ name: req.body.name });
        if (!search) {
            if (!req.body.name) {
                res.sendStatus(422);
            } else {
                db.collection('participants').insertOne({ name: req.body.name, lastStatus: Date.now() });
                const time = `${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`;
                db.collection('messages').insertOne({ from: req.body.name, to: 'ciclano', text: 'entra na sala...', type: 'status', time: time });
                res.sendStatus(201);
            }
        } else {
            res.sendStatus(409);
        }
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

server.get('/participants', async (req, res) => {
    try {
        const answer = await db.collection('participants').find().toArray();
        res.send(answer);
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

// ****Creating and listing messages**** //
server.post('/messages', async (req, res) => {
    try {
        const participants = await db.collection('participants').find().toArray();
        let flag = 0;
        for (let i = 0; i < participants.length; i++) {
            if (participants[i].name === req.headers.user) {
                flag = 1;
                break;
            }
        }
        if (flag === 0) {
            res.sendStatus(422);
        } else {
            res.send(req.headers.user);
        }
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

server.get('/messages', async (req, res) => {
    const limit = parseInt(req.query.limit);
    let userMessages = [];
    try {
        if (!req.headers.user) {
            res.sendStatus(422);
        }
        const messages = await db.collection('messages').find().toArray();
        for (let i = 0; i < messages.length; i++) {
            if (messages[i].to === "Todos" || messages[i].to === req.headers.user) {
                userMessages.push(messages[i]);
            }
        }

        if (!limit) {
            //const answer = await db.collection('messages').find().toArray();
            res.send(userMessages);
        } else {
            //const answer = await db.collection('messages').find().toArray();
            const limitedMessages = [...userMessages].splice(userMessages.length - limit).reverse();
            res.send(limitedMessages);
        }
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

server.listen(5000, () => { console.log("Server is litening on port 5000") });
