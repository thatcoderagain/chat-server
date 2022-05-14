const express = require('express');
const User = require('../models/user');
const Message = require("../models/message");
const {uuidv4} = require("../utils/uuid");
const router = express.Router();

// middleware
async function auth (req, res, next) {
    if (req.headers.authorization) {
        req.userId = req.headers.authorization.split('Bearer ')[1];
        return next();
    }
    return res.status(401).json({message: 'Unauthenticated'})
}

router.get('/user/:id', auth, async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [
                { $and: [{to: req.params.id}, {from: req.userId}]},
                { $and: [{to: req.userId}, {from: req.params.id}]},
            ]
        });
        return res.status(200).json(messages);
    } catch (error) {
        return res.status(400).json({message: error.message});
    }
})

// router.get('/', async (req, res) => {
//     try {
//         const messages = await Message.find();
//         return res.status(200).json(messages);
//     } catch (error) {
//         return res.status(500).json({message: error.message});
//     }
// });
//
// router.put('/', async (req, res) => {
//     const message = new Message({
//         id:      req.body.id,
//         from:    req.body.from,
//         to:      req.body.to,
//         text:    req.body.text,
//         sent_at: req.body.sent_at || Date.now()
//     });
//     try {
//         const newMessage = await message.save();
//         return res.status(201).send(newMessage);
//     } catch (error) {
//         return res.status(400).json({message: error.message});
//     }
// });
//
// router.patch('/:id', getMessage, async (req, res) => {
//     // if (req.body.name !== null) {
//     //     res.message.name = req.body.name;
//     // }
//     try {
//         const updatedUser = await res.message.save();
//         return res.status(200).json(updatedUser);
//     } catch (error) {
//         return res.status(400).json({message: error.message});
//     }
// })
//
// router.delete('/:id', getMessage, async (req, res) => {
//     try {
//         await res.message.remove();
//         return res.status(200).send({message: 'User deleted'})
//     } catch (error) {
//         return res.status(400).json({message: error.message});
//     }
// });
//
// // middleware
//
// async function getMessage(req, res, next) {
//     let message;
//     try {
//         const messages = await Message.find({id: req.params.id});
//         if (messages[0] === undefined) {
//             return res.status(404).json({message: 'User not found'});
//         } else {
//             message = messages[0];
//         }
//     } catch (error) {
//         return res.status(500).json({message: error.message});
//     }
//     res.message = message;
//     next();
// }

module.exports = router;