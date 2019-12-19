var PatternModel = require('../models/pattern.js');
var BloodGlucoseModel = require('../models/blood_glucose_level.js');
var RecommendationModel = require('../models/recommendation.js');

// Get our operations
const blood_glucose_operations = require('./bloodGlucoseController.js');

module.exports = {
    getPatternById: (req, res, next) => {
        
        PatternModel.findById(req.params.id, (err, pattern) => {
            if (err) return next(err);
            
            // Send back the pattern
            res.send(JSON.stringify(pattern));
        });
    },

    checkIfFixedPatterns: async (req, res, next) => {
        
        try {

            let items_processed = 0;
            let patterns_fixed = [];
            let recommendation = null;

            // Get all the in progress patterns
            let patterns = await PatternModel.find({in_progress: true});

            if(patterns.length > 0){

                // Loop through all patterns to check if we have any improvements
                for(let count = 0; count < patterns.length; count++){
                        
                    pattern = patterns[count]
                        
                    // Get the start date of this pattern
                    let date_initialised = new Date(pattern.datetime);
                    let end_date = new Date(pattern.datetime);

                    let latest_result = await BloodGlucoseModel.findOne({}, {}, {sort: { 'datetime': -1 }});
                    let today = new Date(latest_result.datetime);

                    // Here we're creating a 'fixed' time period for checking the pattern
                    // This is the dathe the pattern was initialised plus a specified 30 days or 14 days
        
                    // Add 30 days onto date if it's a daily pattern, add 14 if a meal pattern
                    end_date.setDate(end_date.getDate() + (pattern.type == "Daily Pattern" ? 30 : 14));

                    // Have we finished the designated waiting period for the particular pattern?
                    if(today > end_date){

                        // Initialise our symbol query
                        let symbolQuery;

                        if(pattern.type == "Daily Pattern"){
                            symbolQuery = { 
                                level: pattern.symbol.blood_glucose_classSymbol == "L" ? {$lte: 4.0} : {$gte: 13.0},
                                datetime:{$gte: date_initialised,$lt: end_date},
                                day:blood_glucose_operations.getFullDay(pattern.symbol.daySymbol),
                                meal:blood_glucose_operations.getFullMeal(pattern.symbol.mealSymbol)
                            }
                        } else {
                            symbolQuery = {
                                level: pattern.symbol.blood_glucose_classSymbol == "L" ? {$lte: 4.0} : {$gte: 13.0},
                                datetime:{$gte: date_initialised,$lt: end_date},
                                day:null,
                                meal:blood_glucose_operations.getFullMeal(pattern.symbol.mealSymbol)
                            }
                        }
                            
                        // Get the number of results that match this pattern 
                        let num_bad_levels = BloodGlucoseModel.countDocuments(symbolQuery);
                                
                        // Have we decreased the number of levels to what they were identified to?
                        if(num_bad_levels < pattern.type == "Daily Pattern" ? 3 : 5){

                            // If so, then we've fixed a pattern
                            // Update the object in the database 
                            pattern.in_progress = false;

                            // Resave the pattern object
                            await pattern.save();

                            // Find the recommendation that is linked to this pattern
                            recommendation = await RecommendationModel.find({patternID:pattern._id});
                                    
                            patterns_fixed.push({recommendation:recommendation[0], id:pattern._id});           
                        }
                    }
                }
            }
        
            res.send(JSON.stringify({success:true, patterns_fixed: patterns_fixed, recommendation: recommendation}));
        } catch(err){
            console.log(err);
        }
    },

    checkPatternCauses: (req, res, next) => {

        // Check if we have an ID
        if(typeof req.params.id !== 'undefined'){

            const PATTERN_ID =req.params.id;

            // Get the pattern we're looking at
            PatternModel.findById(PATTERN_ID, (err, pattern) => {
                
                if(err) console.log(err);
                
                // Find all blood glucose results that this pattern occured at
                BloodGlucoseModel.find({ _id: { $in: pattern.blood_glucose_results }}, (err, blood_glucose_results) => {

                    if(err) console.log(err);
                    
                    // Initialise our counts 
                    let heavy_carb_count = 0, low_carb_count = 0, high_activity_count = 0, low_activity_count = 0, itemsProcessed = 0;
                    // console.log(blood_glucose_results);
                   
                    // Loop through all the results blood glucose result occurences
                    blood_glucose_results.forEach(blood_glucose_item => {
                    
                        // Get the previous result to the current one
                        BloodGlucoseModel.find({_id: {$lt: blood_glucose_item._id}}).sort({_id: -1 }).limit(1)
                        .exec((err, previous_blood_glucose) => {

                            let causes = {
                                low_carb:false,
                                high_carb:false,
                                low_activity:false,
                                high_activity:false
                            };

                            // Do we have a previous result?
                            if(previous_blood_glucose.length > 0){
        
                                if(err) console.log(err);
                                
                                // Get the previous result from the array
                                previous_blood_glucose = previous_blood_glucose[0];
        
                                // Tally up causation counts
                                if(blood_glucose_operations.getCarbohydrateRepresentation(previous_blood_glucose.carb_consumption) === 'H'){
                                    heavy_carb_count++;
                                } else if(blood_glucose_operations.getCarbohydrateRepresentation(previous_blood_glucose.carb_consumption) === 'L'){
                                    low_carb_count++;
                                }
                                
                                if(blood_glucose_operations.getPhysicalActivityRepresentation(previous_blood_glucose.physical_activity) === 'H'){
                                    high_activity_count++;
                                } else if(blood_glucose_operations.getPhysicalActivityRepresentation(previous_blood_glucose.physical_activity) === 'L'){
                                    low_activity_count++
                                }
        
                                // Increase the number of items processed so we know when to break out of the loop
                                itemsProcessed++;
                              
                                // Have we finished processing all items?
                                if(itemsProcessed === blood_glucose_results.length) {
                                    
                                    // Get the number of blood glucose results
                                    let num_results = blood_glucose_results.length;
                    
                                    // Do 2/3% of these results make up these counts?
                                    const THRESHOLD = 0.66;

                                    // Tell the object if it's a high or low result we're look at 
                                    causes.high = pattern.symbol.blood_glucose_classSymbol == 'H';
                                    causes.low = pattern.symbol.blood_glucose_classSymbol == 'L';

                                    // Check if any of the causes can be said to be true
                                    if((heavy_carb_count / num_results) >= THRESHOLD){
                                        causes.high_carb = true;
                                    }
                    
                                    if((low_carb_count / num_results) >= THRESHOLD){
                                        causes.low_carb = true;
                                    }
                                    if((high_activity_count / num_results) >= THRESHOLD){
                                        causes.high_activity = true;
                                    }
                                    if((low_activity_count / num_results) >= THRESHOLD){
                                        causes.low_activity = true;
                                    }

                                    // Get the previous meal 
                                    causes.meal = blood_glucose_operations.getPreviousMeal(pattern.symbol.mealSymbol);
                                            
                                    // If this was breakfast then we need to go back 1 day
                                    if(pattern.symbol.mealSymbol == 'B'){
                                        causes.day = blood_glucose_operations.getPreviousDay(pattern.symbol.daySymbol);
                                    } else {
                                        causes.day = blood_glucose_operations.getFullDay(pattern.symbol.daySymbol);
                                    }
                            
                                    // Send back the cause evaluation
                                    res.send(JSON.stringify(causes));
                                } 
                            } else {
                                res.send(JSON.stringify(causes));
                            }
                        });
                    });
                })
            });
        } else {
            res.send(JSON.stringify({success:false}));
        }
    },

    getPatterns: (patternType, negative_results) => {

        // Initialise our original patterns array
        let patterns_counts = [];
        
        // Loop through all blood glucose results
        negative_results.forEach((pattern, index) => {
   
            // Get the symbols 
            const blood_glucose_symbols = pattern.patternSymbols;            

            let inArray = false;
            
            // Check if the pattern has been identified yet
            for(count = 0; count < patterns_counts.length; count++){
                
                if(patterns_counts[count].pattern){

                    // Check if the patterns match
                    if(module.exports.doPatternsMatch(patterns_counts[count], blood_glucose_symbols, patternType)){
                        inArray = true;
                    }
                }
            }
               
            // It's not already in the array
            if(!inArray){
            
                // Initialise the data
                let data = {
                    pattern:blood_glucose_symbols,
                    ids:[pattern.id],
                    count: 1
                }

                // Push it to the array of already identified patterns
                patterns_counts.push(data);

            } else {
                
                let patternIndex;

                // Find where in the identified patterns array this pattern is
                if(patternType === "Daily Pattern"){

                    // Is in the array so get the index of it
                    patternIndex = patterns_counts.findIndex(
                        bgItem => 
                        JSON.stringify(bgItem['pattern'].blood_glucose_classSymbol) === JSON.stringify(blood_glucose_symbols.blood_glucose_classSymbol) &&
                        JSON.stringify(bgItem['pattern'].mealSymbol) === JSON.stringify(blood_glucose_symbols.mealSymbol) && 
                        JSON.stringify(bgItem['pattern'].daySymbol) === JSON.stringify(blood_glucose_symbols.daySymbol)
                    );
                    
                } else {
                     
                    // Is in the array so get the index of it
                    patternIndex = patterns_counts.findIndex(
                        bgItem => 
                        JSON.stringify(bgItem['pattern'].blood_glucose_classSymbol) === JSON.stringify(blood_glucose_symbols.blood_glucose_classSymbol) &&
                        JSON.stringify(bgItem['pattern'].mealSymbol) === JSON.stringify(blood_glucose_symbols.mealSymbol)
                    );
                }

                // We've already found the pattern, so let's push it to the array of instances
                patterns_counts[patternIndex].ids.push(pattern.id);

                // Increase the count of the pattern
                patterns_counts[patternIndex].count++;
            }
        });

        
        // Remove non-frequent patterns from the array
        let frequent_patterns = patterns_counts.filter(function(pattern) {
            return pattern.count >= (patternType == "Daily Pattern" ? 3 : 5);
        });

        return frequent_patterns;

    },

    doPatternsMatch:(original, symbols, patternType) => {

        // Set initial flag
        let match = false;
        
        // Check if this pattern is a direct match based upon the parameters that need to be equal
        if(patternType === "Daily Pattern"){
            if(
                JSON.stringify(original.pattern.blood_glucose_classSymbol) == JSON.stringify(symbols.blood_glucose_classSymbol) &&
                JSON.stringify(original.pattern.mealSymbol) == JSON.stringify(symbols.mealSymbol) &&
                JSON.stringify(original.pattern.daySymbol) == JSON.stringify(symbols.daySymbol)
            ){
                match = true;
            }
        } else {
            if(
                JSON.stringify(original.pattern.blood_glucose_classSymbol) == JSON.stringify(symbols.blood_glucose_classSymbol) &&
                JSON.stringify(original.pattern.mealSymbol) == JSON.stringify(symbols.mealSymbol)
            ){
                match = true;
            }
        }

        return match;
    },
}