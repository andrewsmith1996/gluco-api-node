// Get our model
const BloodGlucoseModel = require('../models/blood_glucose_level');
const RecommendationModel = require('../models/recommendation');
const PatternModel = require('../models/pattern');

const pattern_operations = require('./patternController.js');

const blood_glucose_operations = require('./bloodGlucoseController.js');

module.exports = {

    refreshRecommendations: async (req, res, next) => {

        // First define our async function
        var checkForRecommendations = async (patterns_counts, patternType) => {
            
            try {

                let pattern_found = false;
                let pattern_made = null, recommendation_given = null, identified_pattern_id = null;

                const DAILY_PATTERN = patternType == "Daily Pattern";

                // Check if we actually have any potential patterns
                if(patterns_counts.length > 0){
        
                    // Go through all the potential patterns
                    for(var pattern_index = 0; pattern_index < patterns_counts.length; pattern_index++){
        
                        // Get the pattern
                        let pattern = patterns_counts[pattern_index];
                       
                        // Get the IDs of every blood glucose result this pattern occured at
                        let events = pattern.ids;
                        let recent_occurences = [];
                        
                        let recent_count = 0;
                        
                        // Get the pattern's date and subtract the days away it
                        let latest_blood_glucose_result = await BloodGlucoseModel.findOne({}, {}, {sort: {'datetime': -1}});
                        
                        let latest_blood_glucose_date = new Date(latest_blood_glucose_result.datetime);
                        let past_date = new Date(latest_blood_glucose_result.datetime);
                        past_date.setDate(past_date.getDate() - (DAILY_PATTERN ? 30 : 14));
                        
                        // Check if the patterns are within the last X days
                        for(let event_index = 0; event_index < events.length; event_index++){

                            // Get the date of each blood glucose event
                            let blood_glucose_result = await BloodGlucoseModel.findById(events[event_index]);
                            let event_date = blood_glucose_result.datetime;
                            
                            // Check if the event dates falls between the past date and the latest date
                            if(event_date >= past_date && event_date <= latest_blood_glucose_date){
                                recent_count++;
                                recent_occurences.push(events[event_index]);
                            }
                        }
                        
                        let in_span = true;
                       
                        // If it's a meal pattern also check how far between days
                        if(!DAILY_PATTERN){

                            let events = await BloodGlucoseModel.find({ _id: { $in: recent_occurences }}).sort({datetime: 'ascending'});
    
                            for(let recent_occurence_index = 0; recent_occurence_index < events.length; recent_occurence_index++){
                                
                                // Get the date of each blood glucose event
                                let blood_glucose_result = await BloodGlucoseModel.findById(events[recent_occurence_index]);
                                let event_date = blood_glucose_result.datetime;
                                
                                if(recent_occurence_index < events.length - 1){
                                 
                                    let next_blood_glucose_result = await BloodGlucoseModel.findById(events[recent_occurence_index + 1]);
                    
                                    let days_apart = Math.round(Math.abs((new Date(event_date).getTime() - new Date(next_blood_glucose_result.datetime).getTime())/(24*60*60*1000)));
                                 
                                    // If any of the results are more than 5 days apart 
                                    if(days_apart > 3){
                                        in_span = false;
                                    }
                                }
                            }   
                        }  

                        // Have we reached the threshold for this pattern in the last number of days?
                        if(recent_count >= (DAILY_PATTERN ? 3 : 5) && in_span){
                    
                            // Get the actual pattern
                            let pattern_symbols = pattern.pattern;
                
                            // Initialise our recommendation
                            let recommendation, PREVIOUS_DAY;
            
                            // Get the day of the pattern
                            const CURRENT_DAY = blood_glucose_operations.getFullDay(pattern_symbols.daySymbol);
                            
                            // Get the previous day of the pattern
                            if(DAILY_PATTERN) PREVIOUS_DAY = blood_glucose_operations.getPreviousDay(pattern_symbols.daySymbol);
            
                            // Get the previous meal of the pattern
                            let PREVIOUS_MEAL = blood_glucose_operations.getPreviousMeal(pattern_symbols.mealSymbol);
                
                            // Is this a hyperglycaemic result?
                            if(pattern_symbols.blood_glucose_classSymbol == 'H'){
                
                                // If this is a breakfast pattern then reduce insulin administered on the previous night
                                if(pattern_symbols.mealSymbol == 'B')
            
                                    // Is this a daily pattern or a random occurence?
                                    if(DAILY_PATTERN){
                                        recommendation = `Increase ${PREVIOUS_DAY} bedtime basal insulin or once daily basal insulin by 10%.`;
                                    } else {
                                        recommendation = `Increase bedtime basal insulin or once daily basal insulin by 10%.`;
                                    }
                                    
                                else {
                                    // Not a breakfast pattern, so we're looking at the previous meal in the day
                                    // Create the recommendation
                                    if(DAILY_PATTERN){
                                        recommendation = `Increase ${CURRENT_DAY} ${PREVIOUS_MEAL} quick acting insulin by 1-2 units or 10%.`;
                                    } else {
                                        recommendation = `Increase ${PREVIOUS_MEAL} quick acting insulin dose by 1-2 units or 10%.`;
                                    }
                                }
                
                            // Is this a hypoglycaemic result?
                            } else {
                            
                                // If this is a breakfast then decrease the night before's insulin
                                if(pattern_symbols.mealSymbol == 'B'){
                                    
                                    // Is this a daily pattern or a random occurence?
                                    if(DAILY_PATTERN){
                                        recommendation = `Reduce ${PREVIOUS_DAY} basal insulin by 10% if blood glucose is 3.0‐4.0mmol/L or by 20% if blood glucose is below 3.0mmol/L.`;
                                    } else {
                                        recommendation = `Reduce previous night basal insulin by 10% if blood glucose is 3.0‐4.0mmol/L or by 20% if blood glucose is below 3.0mmol/L.`;
                                    }
                            
                                } else {
                                    
                                    // Not a breakfast pattern, so we're looking at the previous meal
                                    // Create the recommendation
                                    if(DAILY_PATTERN){
                                        recommendation = `Reduce ${CURRENT_DAY} ${PREVIOUS_MEAL} insulin dose by 10% if blood glucose between 3.0mmol/L and 4.0mmol/L or by 20% if below 3.0mmol/L.`;
                                    } else {
                                        recommendation = `Reduce ${PREVIOUS_MEAL} meal time insulin dose by 10% if blood glucose between 3.0mmol/L and 4.0mmol/L or by 20% if below 3.0mmol/L.`;
                                    }   
                                }
                            }
            
                            let queryParam;
            
                            if(DAILY_PATTERN){
                                queryParam = {
                                    'symbol.blood_glucose_classSymbol':pattern_symbols.blood_glucose_classSymbol,
                                    'symbol.mealSymbol':pattern_symbols.mealSymbol,
                                    'symbol.daySymbol':pattern_symbols.daySymbol,
                                    in_progress:true
                                }
                            } else {
                                queryParam = {
                                    'symbol.blood_glucose_classSymbol':pattern_symbols.blood_glucose_classSymbol,
                                    'symbol.mealSymbol':pattern_symbols.mealSymbol,
                                    'symbol.daySymbol':null,
                                    in_progress:true
                                }
                            }

                            // Check if the pattern is already in the database
                            let numResults = await PatternModel.countDocuments(queryParam);

                            // Does this pattern already exist?
                            if(numResults === 0){
                                    
                                // Pattern doesn't exist so let's create our pattern
                                const pattern = new PatternModel({ 
                                    symbol:pattern_symbols,
                                    frequency: recent_count,
                                    type:patternType,
                                    datetime: latest_blood_glucose_date,
                                    in_progress: true,
                                    blood_glucose_results: recent_occurences
                                });
                                    
                                // Save the pattern to the database
                                let saved_pattern = await pattern.save();

                                if(saved_pattern){

                                    pattern_found = true;
                                    pattern_made = saved_pattern.symbol;
                                    identified_pattern_id = saved_pattern._id;

                                    // Add the recommendation to the database if it's a new pattern    
                                    let number_recommendations = await RecommendationModel.countDocuments({patternID:saved_pattern._id});

                                    // Recommendation doesn't exist so let's add it
                                    if(number_recommendations === 0){
                
                                        // Create a title for this recomendation
                                        let recommendationTitle = module.exports.getRecommendationTitle(pattern_symbols, recent_count);
                
                                        // Add the recommendation to the database
                                        const recommendationObject = new RecommendationModel({ 
                                            title:recommendationTitle,
                                            text: recommendation,
                                            seen: false,
                                            patternID: saved_pattern._id,
                                        });
                                            
                                        // Save the pattern
                                        let saved_recommendation = await recommendationObject.save();

                                        if(saved_recommendation){
                                            recommendation_given = saved_recommendation.text;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                return {
                    finished:true, 
                    pattern_found:pattern_found, 
                    pattern_id:identified_pattern_id,
                    pattern_made:pattern_made, 
                    recommendation_given:recommendation_given
                };

                

            } catch (err){
                console.log(err)
            }
        }

        // Here is our actual processing
        try {
            
            // Get all blood glucose results that are hypo + hyperglycaemic
            let boundary_entries = await BloodGlucoseModel
                .find({$or: [{level: {$gte: 13.0}},{level: {$lte: 4.0 }}]})
                .sort({datetime: 'descending'});

            // Get the symbololic reprsentation for all these levels
            let day_pattern_symbols = await blood_glucose_operations.convertToSymbolsWithDay(boundary_entries);

            // Get all results that have these patterns by interval
            let meal_pattern_symbols = await blood_glucose_operations.convertToSymbolsWithMeal(boundary_entries);
            
            // Check for any negative patterns
            let daily_patterns = await pattern_operations.getPatterns("Daily Pattern", day_pattern_symbols);
            let meal_patterns = await pattern_operations.getPatterns("Meal Pattern", meal_pattern_symbols);

            // Check for any recommendations
            let daily_pattern_data = await checkForRecommendations(daily_patterns, "Daily Pattern");
            let meal_pattern_data = await checkForRecommendations(meal_patterns, "Meal Pattern");         

            // If both checks have finished processing then return the data
            if(daily_pattern_data.finished && meal_pattern_data.finished){
                
                let resp_data = {
                    success: true,
                    daily_pattern_found: daily_pattern_data.pattern_found,
                    daily_pattern:daily_pattern_data.pattern_made,
                    daily_pattern_id:daily_pattern_data.pattern_id,
                    daily_recommendation:daily_pattern_data.recommendation_given,
                    meal_pattern_found: meal_pattern_data.pattern_found,
                    meal_pattern_id:meal_pattern_data.pattern_id,
                    meal_pattern: meal_pattern_data.pattern_made,
                    meal_recommendation:meal_pattern_data.recommendation_given,
                };

                res.send(JSON.stringify(resp_data));
            }

        } catch (err){
            console.log(err);
        }
    },


    getRecommendationTitle(pattern, next){
      
        let level = pattern.blood_glucose_classSymbol == 'H' ? "High" : "Low";
        let meal = blood_glucose_operations.getFullMeal(pattern.mealSymbol).toLowerCase();
        let text = "";
        
        if(pattern.daySymbol){
            text += (level + " at " + blood_glucose_operations.getFullDay(pattern.daySymbol) + " " + meal);
        } else {
            text += (level + " at " + meal);
        }
	  	return text;

    },

    getRecommendations: (req, res, next) => {

        let return_recommendations = [];

        let items = 0;

        // Get all recommendations
        RecommendationModel.find({}).sort({'_id': -1}).exec((err, recommendations) => {
       
            if (err) return next(err);

            if(recommendations.length > 0){
                recommendations.forEach(recommendation => {
                    PatternModel.find({_id:recommendation.patternID}, (err, pattern) => {
                       
                        recommendation = recommendation.toObject({ getters: true })
    
                        recommendation.frequency = pattern[0].frequency;
    
                        return_recommendations.push(recommendation);
                        items++;
                        
                        if(items == recommendations.length){
                            // Send back our response
                            res.send(JSON.stringify(return_recommendations));
                        }
                    });
                });

            } else {
                res.send(JSON.stringify(return_recommendations));
            }
            
        });

    },

    getUnseenRecommendations: (req, res, next) => {
        
        // Get all unseen recommendations
        RecommendationModel.find({seen:false}, (err, unseen_recommendations) => {
            if (err) return next(err);
            
            // Send back our response
            res.send(JSON.stringify(unseen_recommendations));
        });
    },

    markRecommendationAsSeen: (req, res, next) => {
        
        // Find recommendation and update it
        RecommendationModel.findById(req.params.id, function (err, recommendation) {

            if (err) return next(err);
          
            // Update object
            recommendation.seen = true;

            // Resave object
            recommendation.save(function (err, updatedRecommendation) {
                if (err) return next(err);
        
                // Send back our response
                res.send(JSON.stringify({success:true}));
            });
        });
    },

}