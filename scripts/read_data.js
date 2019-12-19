const csv=require('csvtojson')
const mongoose       = require('mongoose');
const db_url         = 'DB_URL_HERE';

// Change this to change simulation model
const FILE = '../data/control_personas/average_data.csv';
// const FILE = '../data/control_personas/good_data.csv';
// const FILE = '../data/control_personas/bad_data.csv';
// const FILE = '../data/activity_personas/activity_persona_1.csv';
// const FILE = '../data/activity_personas/activity_persona_2.csv';
// const FILE = '../data/activity_personas/activity_persona_3.csv';
// const FILE = '../data/activity_personas/activity_persona_4.csv';
// const FILE = '../data/activity_personas/activity_persona_5.csv';

// const FILE = '../data/stress-testing/ten.csv';

var BloodGlucoseModel = require('../models/blood_glucose_level');

mongoose.connect(db_url, () => {
    console.log("MongoDB successfully connected");
});

csv()
.fromFile(FILE)
.then((jsonObj)=>{
    jsonObj.forEach(async (item, i) => {
        
        let x = item.timestamp;
        yDate=x.split("/");

        var newDate=yDate[1]+"/"+yDate[0]+"/"+yDate[2];

        let timestamp = await new Date(newDate);

        switch(item.meal){
            
            case "breakfast":
                timestamp.setHours(timestamp.getHours() + 7);
                break;
            case "lunch":
                timestamp.setHours(timestamp.getHours() + 12);
                break;
            case "dinner":
                timestamp.setHours(timestamp.getHours() + 17);
                break;
            case "bed":
                timestamp.setHours(timestamp.getHours() + 22);
                break;
            
            case "overnight":
                timestamp.setHours(timestamp.getHours() + 24);
                break;

            default:
                console.log(item.meal);
        }

        const entry = new BloodGlucoseModel({ 
            level:item.level,
            insulin_dose:item.dose,
            datetime:timestamp.getTime(),
            day:["Sunday", "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][timestamp.getDay()],
            meal: item.meal,
            physical_activity: item.activity,
            carb_consumption: item.carbs,
            outcome:item.outcome
        });
    
        await entry.save();

    });
})

async function read(){
    console.log("Beginning to read data...");

    const jsonArray=await csv().fromFile(FILE);

    console.log("Data successfully imported.");
}
read();