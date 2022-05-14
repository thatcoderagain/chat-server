console.clear();

require('dotenv').config();

const express = require('express');

const cors = require('cors');

const http = require('http');

const mongoose = require('mongoose');

const socketIO = require('socket.io');

// models & utils
const Message = require("./models/message");
const {uuidv4} = require("./utils/uuid");

mongoose.connect(`${process.env.DATABASE_URL}:${process.env.DATABASE_PORT}/chatter`, {
    maxPoolSize:50,
    wtimeoutMS:2500,
    useNewUrlParser:true
});

const db = mongoose.connection;

db.on('error', (error) => console.error(error));

db.once('open', () => console.log(`Connected to Database`));

const app = express();

const server = http.createServer(app);

const io = socketIO(server, {
    cors: {
        origin: [
            'http://localhost',
            'http://127.0.0.1',
            'http://localhost:8080',
            'http://127.0.0.1:8080'
        ],
        methods: [
            'GET',
            'POST',
            'DELETE',
            'UPDATE',
            'PUT',
            'PATCH'
        ],
    },
});

function findPartner({id}) {

    const partners = [];

    Object.keys(connections).forEach((index) => {
        if (connections[index].status === 'searching' && connections[index].socketId !== id) {
            partners.push(connections[index])
        }
    });

    return partners[Math.floor(Math.random() * partners.length)];
}

function getSocketToUser(socket) {
    return userSocketMap[socket.id];
}

function showConnections() {
    console.log("\nConnections: ", connections);
    console.log("\nuserSocketMap: ", userSocketMap);
}

let connections = {};

let userSocketMap = {};

io.on('connection', (socket) => {

    console.log(`User : ${socket.id} : connected`);

    socket.on('joined', ({user}) => {
        console.log(`User : ${socket.id} : has joined`);

        userSocketMap[socket.id] = user.id;

        connections[user.id] = {
            socketId: socket.id,
            userId: user.id,
            user: user,
            status: 'joined'
        }

        showConnections();
    });

    socket.on('cancel-search', () => {
        console.log(`User : ${socket.id} : cancelled searching for friend`);
        if (connections[getSocketToUser(socket)]) {
            connections[getSocketToUser(socket)]['status'] = 'joined';
        }

        showConnections();
    });

    socket.on('search', async () => {
        console.log(`User : ${socket.id} : searching for friend`);
        if (connections[getSocketToUser(socket)]) {
            connections[getSocketToUser(socket)]['status'] = 'searching';

            console.log("\nPartner search .... ");
            const partner = findPartner(socket);
            if (partner) {
                console.log("match found: ", `${socket.id}.found`, ":", `${partner.socketId}.found`);
                const connection1 = connections[getSocketToUser(socket)];
                const connection2 = connections[getSocketToUser({id: partner.socketId})];

                connection1['status'] = 'busy';
                connection2['status'] = 'busy';

                await io.emit(`${connection2.user.id}.found`, {
                    event: 'found',
                    partner: connection1.user,
                });
                await io.emit(`${connection1.user.id}.found`, {
                    event: 'found',
                    partner: connection2.user,
                });
            } else {
                console.log("\nWaiting for more people to join");
            }
        }

        showConnections();
    });

    socket.on('disconnect', () => {
        // TODO:: handle connected-with on leave
        console.log(`User : ${socket.id} : disconnected`);
        if (connections[getSocketToUser(socket)]) {
            connections[getSocketToUser(socket)]['status'] = 'offline';
            connections[getSocketToUser(socket)]['socketId'] = null;
            delete userSocketMap[socket.id];
        }

        io.emit('disconnected', {socketId: socket.id, event: 'disconnected'});

        showConnections();
    });

    socket.on(`new-message`, async ({message}) => {
        console.log(`User : ${socket.id} : sent new message`);
        console.log('message: ' + JSON.stringify(message));

        const msg = new Message({
            id:      message.uuid,
            from:    message.from,
            to:      message.to,
            text:    message.text,
            sent_at: message.sent_at || Date.now()
        });

        try {
            const newMessage = await msg.save();
            io.emit(`${message.from}.new-message`, {event: 'new-message', message: newMessage});
            io.emit(`${message.to}.new-message`,   {event: 'new-message', message: newMessage});
        } catch (error) {
            console.error({message: error.message});
        }

    });

    socket.on(`received-message`, async ({message}) => {
        console.log(`User : ${socket.id} : received new message`);
        console.log('message: ' + JSON.stringify(message));

        await Message.updateMany(
            {
                delivered_at: null,
                from: message.from,
                sent_at: {$lte: new Date(message.sent_at)},
            }, {
                $set: {
                    delivered_at: Date.now()
                }
            }, {
                multi: true
            }
        );

        io.emit(`${message.from}.delivered-message`, {event: 'update-message', message: message});
    });

    socket.on(`typing`, async ({event, userId, partnerId}) => {
        console.log(`User : ${socket.id} : typing`);
        io.emit(`${userId}.${partnerId}.typing`, {event: 'typing'});
    });

    socket.on(`stoppedTyping`, async ({event, userId, partnerId}) => {
        console.log(`User : ${socket.id} : stoppedTyping`);
        io.emit(`${userId}.${partnerId}.stoppedTyping`, {event: 'stoppedTyping'});
    });

    socket.on(`seen-message`, async ({message}) => {
        console.log(`User : ${socket.id} : seen new message`);
        console.log('message: ' + JSON.stringify(message));

        await Message.updateMany(
            {
                read_at: null,
                from: message.from,
                sent_at: {$lte: new Date(message.sent_at)},
            }, {
                $set: {
                    read_at: Date.now()
                }
            }, {
                multi: true
            }
        );

        io.emit(`${message.from}.read-message`, {event: 'update-message', message: message});
    });
});

app.use(
    express.json(),
    cors({
        origin: [
            'http://localhost',
            'http://127.0.0.1',
            'http://localhost:8080',
            'http://127.0.0.1:8080'
        ],
        methods: [
            'GET',
            'POST',
            'DELETE',
            'UPDATE',
            'PUT',
            'PATCH'
        ],
    }),
);

app.get('/', (req, res) => {
    res.send('server is running . . .');
});

app.use('/user', require('./routes/user'));

app.use('/message', require('./routes/message'));

server.listen(process.env.SERVER_PORT, () => {
    console.log(`Server started and listening at ${process.env.SERVER_URL}:${process.env.SERVER_PORT}`);
})
