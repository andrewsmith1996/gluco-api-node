var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Pattern = new Schema({
    symbol: Object,
    type: String,
    frequency: Number,
    datetime: Date,
    in_progress: Boolean,
    blood_glucose_results: [mongoose.Schema.Types.ObjectId]
});

module.exports = mongoose.model('patterns', Pattern);