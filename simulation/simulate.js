const csv            = require('csvtojson')
const mongoose       = require('mongoose');

const { performance } = require('perf_hooks');
const axios          = require('axios')
const blood_glucose_operations = require('../controllers/bloodGlucoseController.js');
var fs = require('fs');

// Change this to change simulation model
const FILE = '../data/control_personas/average_data.csv';
const API_URL = 'DB_URL_HERE';

var items_processed = 0;
let simulation_logs = `Day,Meal,BG,Insulin,Carbs,Activity,Patterns Identified,Patterns Fixed\n`;

var t0 = performance.now();

csv()
.fromFile(FILE)
.then(async (jsonObj)=>{
        for(var count=0;count<jsonObj.length;count++){
            
            var item = jsonObj[count];
            var i = count;
            
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

            let data = {
                bg_level: item.level,
                carb_consumption:  item.carbs,
                datetime: timestamp.getTime(),
                day: ["Sunday", "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][timestamp.getDay()],
                insulin_dose: item.dose,
                meal: item.meal,
                physical_activity: item.activity
            }

            let diary_entry = await axios.post(API_URL + '/add_diary_entry', data);

            if(diary_entry.data.success){
                simulation_logs += `${data.day[0].toUpperCase() + data.day.substring(1)},${data.meal[0].toUpperCase() + data.meal.substring(1)},${data.bg_level},${data.insulin_dose},${data.carb_consumption},${data.physical_activity},`;
            }
            
            let recommendation = await axios.get(API_URL + '/refresh_recommendations')

            if(recommendation.data.daily_pattern_found){
                
                let ID = JSON.stringify(recommendation.data.daily_pattern_id);
                let SYMBOLS = recommendation.data.daily_pattern;
                let RECOMMENDATION = JSON.stringify(recommendation.data.daily_recommendation);

                let level = SYMBOLS.blood_glucose_classSymbol == 'H' ? "High" : "Low";
                let meal = blood_glucose_operations.getFullMeal(SYMBOLS.mealSymbol).toLowerCase();
                let text = "";
                
                if(SYMBOLS.daySymbol){
                    text += (level + " at " + blood_glucose_operations.getFullDay(SYMBOLS.daySymbol) + " " + meal);
                } else {
                    text += (level + " at " + meal);
                }
               
                simulation_logs += `ID: ${ID} PATTERN: ${text} - RECOMMENDATION: ${RECOMMENDATION} `

                let daily_causes = await axios.get(API_URL + '/check_for_pattern_causes/' + recommendation.data.daily_pattern_id);

                let day_time = "";

                if(daily_causes.data.day){
                    day_time += (daily_causes.data.day + " ");
                }

                simulation_logs += `CAUSES: `;

                day_time += (daily_causes.data.meal);

                if(daily_causes.data.low_carb){
                    simulation_logs += `Low Carbohydrate - ${day_time} `;
                }

                if(daily_causes.data.high_carb){
                    simulation_logs += `High Carbohydrate - ${day_time} `;
                }

                if(daily_causes.data.high_activity){
                    simulation_logs += `High Activity Level - ${day_time} `;
                }

                if(daily_causes.data.low_activity){
                    simulation_logs += `Low Activity Level - ${day_time} `;
                }

                if(daily_causes.data.high){
                    simulation_logs += `Not enough insulin at ${day_time} `;
                }

                if(daily_causes.data.low){
                    simulation_logs += `Too much insulin at ${day_time} `;
                }
            }

            if(recommendation.data.meal_pattern_found){

                let ID = JSON.stringify(recommendation.data.meal_pattern_id);
                let SYMBOLS = recommendation.data.meal_pattern;
                let RECOMMENDATION = JSON.stringify(recommendation.data.meal_recommendation);
               
                let level = SYMBOLS.blood_glucose_classSymbol == 'H' ? "High" : "Low";
                let meal = blood_glucose_operations.getFullMeal(SYMBOLS.mealSymbol).toLowerCase();
                let text = "";
                
                if(SYMBOLS.daySymbol){
                    text += (level + " at " + blood_glucose_operations.getFullDay(SYMBOLS.daySymbol) + " " + meal);
                } else {
                    text += (level + " at " + meal);
                }

                simulation_logs += `ID: ${ID} PATTERN: ${text} - RECOMMENDATION: ${RECOMMENDATION} `

                let meal_causes = await axios.get(API_URL + '/check_for_pattern_causes/' + recommendation.data.meal_pattern_id);

                let day_time = "";

                if(meal_causes.data.day){
                    day_time += (meal_causes.data.day + " ");
                }

                simulation_logs += `CAUSES: `;

                day_time += (meal_causes.data.meal);

                if(meal_causes.data.low_carb){
                    simulation_logs += `Low Carbohydrate - ${day_time} `;
                }

                if(meal_causes.data.high_carb){
                    simulation_logs += `High Carbohydrate - ${day_time} `;
                }

                if(meal_causes.data.high_activity){
                    simulation_logs += `High Activity Level - ${day_time} `;
                }

                if(meal_causes.data.low_activity){
                    simulation_logs += `Low Activity Level - ${day_time} `;
                }

                if(meal_causes.data.high){
                    simulation_logs += `Not enough insulin at ${day_time} `;
                }

                if(meal_causes.data.low){
                    simulation_logs += `Too much insulin at ${day_time} `;
                }
            } 
                    
            if(!recommendation.data.daily_pattern_found || !recommendation.data.meal_pattern_found) simulation_logs += `,`;
            let fixed_pattern = await axios.get(API_URL + '/check_for_fixed_patterns')

            if(fixed_pattern.data.patterns_fixed.length > 0){
              
                for(var fixed_pattern_count=0;fixed_pattern_count < fixed_pattern.data.patterns_fixed.length; fixed_pattern_count++){
                    simulation_logs += `${fixed_pattern.data.patterns_fixed[fixed_pattern_count].id} `;
                }
                
                simulation_logs += `,`;

            } else {
                simulation_logs += `,`;
            }

            simulation_logs += '\n';
            console.log(`${((count/jsonObj.length) * 100).toFixed(1)}%`);

        }
        console.log("Simulation complete.");
        write_logs(simulation_logs);
});

function write_logs(simulation_logs){
    
    console.log("Generating simulation logs...");

    // Write the data
    fs.writeFile('new_good.csv', simulation_logs, 'utf8', function (err) {
        if (err) {
            console.log('Some error occured - file either not saved or corrupted file saved.');
        } else{
            console.log('Successfully generated simulation logs.');

            var t1 = performance.now();
            console.log("Simulation time: " + ((t1 - t0) * 0.001).toFixed(2) + " seconds.")
            console.log("---------- END OF SIMULATION ---------");
        }
    });
}

async function read(){
    console.log("---------- GLUCO SIMULATION ----------");
    console.log("Simulating...");
    const jsonArray = await csv().fromFile(FILE);
}
read();