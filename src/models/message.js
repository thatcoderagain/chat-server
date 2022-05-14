const mongoose = require('mongoose');

const Message = new mongoose.Schema({
    id: {
        type: String,
        require: true,
    },
    to: {
        type: String,
        require: true
    },
    from: {
        type: String,
        require: true
    },
    text: {
        type: String,
        require: true
    },
    type: {
        type: String,
        require: true,
        default: 'text'
    },
    sent_at: {
        type: Date,
        require: true,
        default: Date.now()
    },
    delivered_at: {
        type: Date,
        require: true,
        default: null
    },
    read_at: {
        type: Date,
        require: true,
        default: null
    },
    deleted_at: {
        type: Date,
        require: true,
        default: null
    }
});

module.exports = mongoose.model('Message', Message);