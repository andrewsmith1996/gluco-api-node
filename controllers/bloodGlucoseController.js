// Get our model
const BloodGlucoseModel = require('../models/blood_glucose_level');

module.exports = {

    addBloodGlucoseEntry : (req, res, next) => {

        // Check if all the body parameters are specified
        if (typeof req.body.bg_level !== 'undefined' && typeof req.body.insulin_dose !== 'undefined' && typeof req.body.physical_activity !== 'undefined' && typeof req.body.carb_consumption !== 'undefined'){

            // Parse the blood glucose result
            let bg = parseFloat(req.body.bg_level).toFixed(1);

            // Create our new blood glucose document from the POST data
            const new_blood_glucose_entry = new BloodGlucoseModel({ 
                level:bg,
                insulin_dose:parseFloat(req.body.insulin_dose).toFixed(1),
                datetime:req.body.datetime,
                day:req.body.day,
                meal: req.body.meal,
                physical_activity: parseInt(req.body.physical_activity),
                carb_consumption: parseInt(req.body.carb_consumption),
                outcome:""
            });

            // Save the current document and get its ID
            new_blood_glucose_entry.save((err, current_document) => {

                if (err) return next(err);
                
                // Find the previous case
                BloodGlucoseModel.find({_id: {$lt: current_document._id}}).sort({_id: -1 }).limit(1).exec((err, previous_document) => {

                    if (err) return next(err);
                    
                    // Do we have a previous blood glucose level?
                    if(previous_document !== undefined && previous_document.length !== 0){
                        
                        // Find the previous result and update its outcome
                        BloodGlucoseModel.findOneAndUpdate(
                            {_id:previous_document[0]._id}, 
                            {outcome: current_document.level},
                            {new: true, runValidators: true}, (err, updated_document) => {

                                if (err) return next(err);
                                
                                // Send the response
                                res.send(JSON.stringify({ success: true, id:current_document._id}));
                            }
                        );
                    } else {
                        res.send(JSON.stringify({ success: true, id:current_document._id}));
                    }
                });
            });
        } else {
            
            // All data has no come through, send back error
            res.send(JSON.stringify({ success: false }));
        }
    },

    getDiary: (req, res, next) => {
    
        // Get all blood glucose results
        BloodGlucoseModel.find({}).sort({datetime: 'descending'}).exec((err, diary) => {
            
            if (err) return next(err);
            
            // Return the diary
            res.send(JSON.stringify(diary));
        });
    },

    getBloodGlucoseEntryById: (req, res, next) => {

        // Get the specific entry
        BloodGlucoseModel.findById(req.params.id, (err, result) => {
            if (err) return next(err);

            // Return the result
            res.send(JSON.stringify(result));
        });
    },


    // Return bad results with day
    convertToSymbolsWithDay: (entries, next) => {

        let dayEntries = [];

        // Convert all entries
        entries.forEach((diary_entry) => {

            // Get the ID
            const id = diary_entry.id;
                
            // Threshold the blood glucose level into its class
            const blood_glucose_classSymbol = diary_entry.level >= 13.0 ? 'H' : 'L';
            
            // Convert the meal to its symbol
            const mealSymbol = module.exports.getMealRepresentation(diary_entry.meal);
    
            // Get the day symbol
            const daySymbol = module.exports.getDayRepresentation(diary_entry.day);
    
            const pattern_symbols = {
                blood_glucose_classSymbol,
                mealSymbol,
                daySymbol
            };

            // Push this result to the array
            dayEntries.push({id:id, patternSymbols:pattern_symbols});
        });

        return dayEntries;
    },

    // Return bad results without day
    convertToSymbolsWithMeal: (entries) => {

        let intervalEntries = [];

        entries.forEach((diary_entry) => {

            // Get the ID
            const id = diary_entry.id;
                
            // Threshold the blood glucose level into its class
            const blood_glucose_classSymbol = diary_entry.level >= 13.0 ? 'H' : 'L';
            
            // Convert the meal to its symbol
            const mealSymbol = module.exports.getMealRepresentation(diary_entry.meal);
    
            let pattern_symbols = {
                blood_glucose_classSymbol,
                mealSymbol
            };

            // Push this result to the array
            intervalEntries.push({id:id, patternSymbols:pattern_symbols});
        });

        return intervalEntries;
    },

    getFullDay: (symbol) => {
        let day;
        switch(symbol){
            case "MO":
                day = "Monday";
                break;
            case "TU":
                day = "Tuesday";
                break;
            case "WE":
                day = "Wednesday";
                break;
            case "TH":
                day = "Thursday";
                break;
            case "FR":
                day = "Friday";
                break;
            case "SA":
                day = "Saturday";
                break;
            case "SU":
                day = "Sunday";
                break;
            default:
                day = null;
                break;
        }

        return day;
    },


    getFullMeal: (symbol) => {
        let meal;
        switch(symbol){
            case 'B':
                meal = "breakfast";
                break;
            case 'L':
                meal = "lunch";
                break;
            case 'D':
                meal = "dinner";
                break;
            case 'BE':
                meal = "bedtime";
                break;
            default:
                meal = null;
                break;
        }

        return meal;
    },

    // Convert the meal to its symbol
    getMealRepresentation: (inputMeal) => {
         
        let symbol;
        switch(inputMeal){

            case 'breakfast':
                symbol = 'B';
                break;

            case 'lunch':
                symbol = 'L';
                break;
            
            case 'dinner':
                symbol = 'D';
                break;
            
            case 'bed':
                symbol = 'BE'
                break;
            
            default:
                symbol = 'X';
        }

        return symbol;
    },

    // Convert the day to its symbol
    getDayRepresentation: (inputDay) => {
        return inputDay.substr(0, 2).toUpperCase();
    },

    getPreviousDay: (inputDay) => {
        const DAY_SYMBOLS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

        let day_index;

        // Get the previous day
        if(DAY_SYMBOLS.indexOf(inputDay) == 0){
            day_index = DAY_SYMBOLS.length - 1;
        } else  {
            day_index = DAY_SYMBOLS.indexOf(inputDay) - 1;
        }

        // Convert to symbol
        let previousDay = module.exports.getFullDay(DAY_SYMBOLS[day_index]);
        
        return previousDay;
        
    },

    getPreviousMeal: (inputMeal) => {
        const MEAL_SYMBOLS = ['B','L','D','BE'];

        let meal_index;

        // Get the previous day
        if(MEAL_SYMBOLS.indexOf(inputMeal) == 0){
            meal_index = MEAL_SYMBOLS.length - 1;
        } else  {
            meal_index = MEAL_SYMBOLS.indexOf(inputMeal) - 1;
        }
    
        // Convert to symbol
        let previousMeal = module.exports.getFullMeal(MEAL_SYMBOLS[meal_index]);

        return previousMeal;
    },
    
    // Convert the physical activity to its symbol
    getPhysicalActivityRepresentation: (inputPhysicalActivity) => {
        let symbol;

        // Threshold values
        if(inputPhysicalActivity >= 0 && inputPhysicalActivity <= 15){
            symbol = 'L';
        } else if(inputPhysicalActivity > 15 && inputPhysicalActivity < 45){
            symbol = 'M';
        } else {
            symbol = 'H';
        }

        return symbol;
    },
    
    // Convert the carbohydrate consumption to its symbol
    getCarbohydrateRepresentation: (inputCarbConsumption) => {
       
        let symbol;

        // Threshold values
        if(inputCarbConsumption >= 0 && inputCarbConsumption <= 30){
            symbol = 'L';
        } else if(inputCarbConsumption > 30 && inputCarbConsumption < 80){
            symbol = 'M';
        } else {
            symbol = 'H';
        }

        return symbol;
    },
}