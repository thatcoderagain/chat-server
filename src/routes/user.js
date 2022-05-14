const express = require('express');
const User = require('../models/user');
const {uuidv4} = require("../utils/uuid");
const {names} = require("../assets/names");

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const users = await User.find();
        return res.status(200).json(users);
    } catch (error) {
        return res.status(500).json({message: error.message});
    }
});

router.put('/', async (req, res) => {
    const user = new User({
        id:   req.body.id   || uuidv4(),
        name: req.body.name || names[Math.floor(Math.random() * 250)],
        age:  req.body.age  || 25,
        sex:  req.body.sex  || 'male',
    });
    try {
        const newUser = await user.save();
        return res.status(201).send(newUser);

    } catch (error) {
        return res.status(400).json({message: error.message});
    }
});

router.get('/:id', getUser, async (req, res) => {
    try {
        return res.status(200).json(res.user);
    } catch (error) {
        return res.status(400).json({message: error.message});
    }
})

router.patch('/:id', getUser, async (req, res) => {
    if (req.body.name !== null) {
        res.user.name = req.body.name;
    }
    if (req.body.age !== null) {
        res.user.age = req.body.age;
    }
    if (req.body.sex !== null) {
        res.user.sex = req.body.sex;
    }
    try {
        const updatedUser = await res.user.save();
        return res.status(200).json(updatedUser);
    } catch (error) {
        return res.status(400).json({message: error.message});
    }
})

router.delete('/:id', getUser, async (req, res) => {
    try {
        await res.user.remove();
        return res.status(200).send({message: 'User deleted'})
    } catch (error) {
        return res.status(400).json({message: error.message});
    }
});

// middleware

async function getUser(req, res, next) {
    let user;
    try {
        const users = await User.find({id: req.params.id});
        if (users[0] === undefined) {
            return res.status(404).json({message: 'User not found'});
        } else {
            user = users[0];
        }
    } catch (error) {
        return res.status(500).json({message: error.message});
    }
    res.user = user;
    next();
}

module.exports = router;