import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import joi from "joi";
import Joi from "joi";
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect(() => {
    db = mongoClient.db("batepapouol");
});

const server = express();
server.use(express.json());

// ****Schema**** //
const participantsSchema = Joi.object({
    name: Joi.string()
        .alphanum()
        .empty('')
        .required()
});

const messagesSchema = Joi.object({
    to: Joi.string().empty('').required(),
    text: Joi.string().empty('').required(),
    type: Joi.string().empty('').valid('message', 'private_message').required()
});

// ****Creating and Listing Participants****//
server.post('/participants', async (req, res) => {
    try {
        const search = await db.collection('participants').findOne({ name: req.body.name });
        /* if (!search) {
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
        } */
        if (!search) {
            await participantsSchema.validateAsync(req.body);
            db.collection('participants').insertOne({ name: req.body.name, lastStatus: Date.now() });
            const time = `${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`;
            db.collection('messages').insertOne({ from: req.body.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: time });
            res.sendStatus(201);
        } else {
            res.sendStatus(409);
        }

    } catch (error) {
        res.status(422).send(error.details.map((detail) => detail.message));
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
        /* const participants = await db.collection('participants').find().toArray();
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
            if (!req.body.to || !req.body.text || !req.body.type) {
                res.sendStatus(422);
            } else if (req.body.type !== "private_message" && req.body.type !== "message") {
                res.sendStatus(422);
            } else {
                const time = `${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`;
                db.collection('messages').insertOne({ to: req.body.to, text: req.body.text, type: req.body.type, time: time })
                res.sendStatus(201);
            }
        } */
        //const messagesValidation = await messagesSchema.validateAsync(req.body);
        const participants = await db.collection('participants').find().toArray();
        await messagesSchema.validateAsync(req.body);
        if (participants.some(participant => participant.name === req.headers.user)) {
            const time = `${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`;
            db.collection('messages').insertOne({ from: req.headers.user, to: req.body.to, text: req.body.text, type: req.body.type, time: time })
            res.sendStatus(201);
        } else {
            res.sendStatus(422);
        }
    } catch (error) {
        res.status(422).send(error.details.map((detail) => detail.message));
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
        res.sendStatus(500);
    }
});

server.post('/status', async (req, res) => {
    try {
        const participants = await db.collection('participants').find().toArray();
        if (participants.some(participant => participant.name === req.headers.user)) {
            db.collection('participants').update({ name: req.headers.user }, { $set: { lastStatus: Date.now() } });
            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        res.status(422).send(error.details.map((detail) => detail.message));
    }
});

setInterval(async () => {
    const participants = await db.collection('participants').find().toArray();
    for (let i = 0; i < participants.length; i++) {
        if ((Date.now() - participants[i].lastStatus) > 10000) {
            console.log(participants[i].name);
            await db.collection('participants').deleteOne({ name: participants[i].name });
            const time = `${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`;
            db.collection('messages').insertOne({ from: participants[i].name, to: 'Todos', text: 'sai da sala...', type: 'status', time: time });
        }
    }
}, 15000);

server.listen(5000, () => { console.log("Server is litening on port 5000") });
