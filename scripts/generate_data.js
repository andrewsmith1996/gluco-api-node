var fs = require('fs');

const DAYS = 90;
const READINGS_PER_DAY = 4;

const INSULIN_DOSE_MIN = 4;
const INSULIN_DOSE_MAX = 12;

const CARBS_MIN = 0;
const CARBS_MAX = 100;

const EXERCISE_MIN = 0;
const EXERCISE_MAX = 60;

const WEIGHTS_BAD = [0.4, 0.2, 0.4];
const WEIGHTS_AVERAGE = [0.2, 0.7, 0.1];
const WEIGHTS_GOOD = [0.1, 0.8, 0.1];
const WEIGHTED_VALUES = ['low', 'good', 'high'];
const MEALS = ['breakfast','lunch','dinner','bed'];

const GROUPED_WEIGHTS = [WEIGHTS_BAD, WEIGHTS_AVERAGE, WEIGHTS_GOOD];
const FILE_NAMES = ['../data/control_personas/bad_data.csv','../data/control_personas/average_data.csv','../data/control_personas/good_data.csv'];


GROUPED_WEIGHTS.forEach((item, n) => {
    
    let dataToWrite = `timestamp,meal,level,dose,outcome,carbs,activity\n`;
    let outcome = 0;
    let date = new Date();

    date.setDate(date.getDate() - DAYS);

    for(let i = 0; i < DAYS; i++){
        for(let mealIndex = 0; mealIndex < READINGS_PER_DAY; mealIndex++){
            
            // Get the date
            let csvDate = date.getDate() + '/' + (date.getMonth() + 1) + "/" + date.getFullYear();
            
            // Random result
            let category = getWeightedCategory(item);
            let bgResult = getWeightedResult(category);

            let carbs = generateRandomCarbs();
            let activity = generateRandomActivity();
            let dose = generateRandomDose();
            
            // Add the row to the CSV
            dataToWrite += `${csvDate},${MEALS[mealIndex]},${bgResult},${dose},${outcome},${carbs},${activity}\n`;
           
            // Store the current bg to add as the outcome of the next case
            outcome = bgResult;
        }

        // Increase the day
        date.setDate(date.getDate() + 1);
    }

    // Write the data
    fs.writeFile(FILE_NAMES[n], dataToWrite, 'utf8', function (err) {
        if (err) {
            console.log('Some error occured - file either not saved or corrupted file saved.');
        } else{
            console.log('data successfully generated');
        }
    });
})

function rand(min, max) {
    return Math.random() * (max - min) + min;
};
 
function getWeightedCategory(weight) {
  
    var total_weight = weight.reduce(function (prev, cur, i, arr) {
        return prev + cur;
    });
     
    var random_num = rand(0, total_weight);
    var weight_sum = 0;
     
    for (var i = 0; i < WEIGHTED_VALUES.length; i++) {
        weight_sum += weight[i];
        weight_sum = +weight_sum.toFixed(1);
         
        if (random_num <= weight_sum) {
            return WEIGHTED_VALUES[i];
        }
    }
};

function getWeightedResult(category){
    let lowerBound;
    let upperBound;

    switch(category){
        case 'low':
            lowerBound = 2.0;
            upperBound = 4.0;
            break;

        case 'good':
            lowerBound = 4.0;
            upperBound = 13.0;
            break;
        
        case 'high':
            lowerBound = 13.0;
            upperBound = 18.0;
            break;
        
        default:
            lowerBound = null;
            upperBound = null;
    }

    let result = (Math.random() * (upperBound- lowerBound + 1) + lowerBound).toFixed(1);

    if(result < lowerBound){
        result = lowerBound;
    }
    else if(result > upperBound){
        result = upperBound;
    }
    
    return result;

}

function generateRandomDose(){
    return Math.floor(Math.random() * INSULIN_DOSE_MAX) + INSULIN_DOSE_MIN;
}

function generateRandomCarbs(){
    return Math.round((Math.random()*(CARBS_MAX-CARBS_MIN)+CARBS_MIN)/10)*10;
}

function generateRandomActivity(){
    return Math.floor(Math.random() * EXERCISE_MAX) + EXERCISE_MIN;
}

