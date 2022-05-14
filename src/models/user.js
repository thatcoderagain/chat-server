const mongoose = require('mongoose');

const User = new mongoose.Schema({
    id: {
        type: String,
        require: true,
    },
    name: {
        type: String,
        require: true
    },
    age: {
        type: Number,
        require: true
    },
    sex: {
        type: String,
        require: true
    }
});

module.exports = mongoose.model('User', User);