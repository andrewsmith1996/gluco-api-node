const express        = require('express');
const bodyParser     = require('body-parser');
const mongoose       = require('mongoose');
const cors           = require('cors')
const app            = express();
const port           = process.env.PORT || 8080;

// const environment    = 'LOCAL';
const environment    = 'LIVE';
const SIMULATION     = false;
// const SIMULATION        = true;

let db_url;

switch(environment){

    case 'LOCAL':    
        db_url = 'DB_URL_HERE';
        if(SIMULATION) db_url += '_simulation';
        break;

    case 'LIVE':
        db_url = 'DB_URL_HERE';
        if(SIMULATION) db_url += '_simulation';
        break;
    
    default:
        db_url = 'DB_URL_HERE';
        if(SIMULATION) db_url += '_simulation';
}

// Sentry error tracking
const Sentry = require('@sentry/node');
Sentry.init({ dsn: 'SENTRY_URL_HERE' });

// Settings
app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json());

// Get our Routes
const routes = require('./routes');
app.use(routes);

mongoose.connect(db_url, () => {
    console.log("MongoDB successfully connected");
    console.log(db_url)
});

app.listen(port, () => {
    console.log('Server running on port ' + port);
    console.log('Environment: ' + environment);
});        

app.use(function(err, req, res, next) {
    
    // Show the error
    console.log(err);
    
    // Send back response
    res.send(JSON.stringify({error: true}));

});
