var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Recommendation = new Schema({
    title: String,
    text: String,
    seen: Boolean,
    patternID: mongoose.Schema.Types.ObjectId,
});

module.exports = mongoose.model('recommendations', Recommendation);