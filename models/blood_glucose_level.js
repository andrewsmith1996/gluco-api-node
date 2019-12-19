var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var BloodGlucoseLevel = new Schema({
    level: Number,
    insulin_dose: Number,
    datetime: Date,
    day: String,
    meal: String,
    physical_activity: Number,
    carb_consumption: Number,
    outcome: Number
});

module.exports = mongoose.model('diary_entries', BloodGlucoseLevel);