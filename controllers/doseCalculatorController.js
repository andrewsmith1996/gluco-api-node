// Get our model
const BloodGlucoseModel = require('../models/blood_glucose_level');
module.exports = {
   
    getRecommendedDose: async (req, res, next) => {

        try {
          
            // Weights for normalisation
            const BG_WEIGHT = 0.4;
            const PHYSICAL_ACTIVITY_WEIGHT = 0.3;
            const CARB_CONSUMPTION_WEIGHT = 0.3;
            const SIMILARITY_THRESHOLD = 0.7;
            const OUTCOME_LOWER_BOUND = 4.0;
            const OUTCOME_UPPER_BOUND = 13.0;

            // max and minimium values for normalisation
            const MIN_LEVEL = 0.0;
            const MIN_ACTIVITY = 0;
            const MIN_CARBS = 0;
    
            const MAX_LEVEL = 35;
            const MAX_ACTIVITY = 120;
            const MAX_CARBS = 100;
                
            // Initialise array to hold cases and data object to return
            let similar_cases = [];
            let return_data = {};
            
            // Get the whole case base
            let case_base = await BloodGlucoseModel.find({}).sort({datetime: 'descending'});

            // Construct our new case parameters from the POST body
            let new_case = {
                level:parseFloat(req.body.bg_level).toFixed(1),
                insulin_dose:parseFloat(req.body.insulin_dose).toFixed(1),
                meal: req.body.meal,
                physical_activity: parseInt(req.body.physical_activity),
                carb_consumption: parseInt(req.body.carb_consumption),
            };
            
            // Normalise the new case
            let normalised_bg_new_case = BG_WEIGHT * ((new_case.level) / (MAX_LEVEL - MIN_LEVEL));
            let normalised_activity_new_case = PHYSICAL_ACTIVITY_WEIGHT * ((new_case.physical_activity) / (MAX_ACTIVITY - MIN_ACTIVITY));
            let normalised_carbs_new_case = CARB_CONSUMPTION_WEIGHT * ((new_case.carb_consumption) / (MAX_CARBS - MIN_CARBS));
            
            // Calculate the similarity for all cases
            case_base.forEach((case_base_item) => {
    
                // Is the outcome of this case suitable?
                if(case_base_item.outcome >= OUTCOME_LOWER_BOUND && case_base_item.outcome <= OUTCOME_UPPER_BOUND){
                   
                    // Normalise the current case
                    let normalised_bg_current_case = BG_WEIGHT * ((case_base_item.level) / (MAX_LEVEL - MIN_LEVEL));
                    let normalised_activity_current_case = PHYSICAL_ACTIVITY_WEIGHT * ((case_base_item.physical_activity) / (MAX_ACTIVITY - MIN_ACTIVITY));
                    let normalised_carbs_current_case = CARB_CONSUMPTION_WEIGHT * ((case_base_item.carb_consumption) / (MAX_CARBS - MIN_CARBS));

                    let case_similarity = Math.sqrt(Math.pow(normalised_bg_new_case - normalised_bg_current_case, 2) + Math.pow(normalised_activity_new_case - normalised_activity_current_case, 2) + Math.pow(normalised_carbs_new_case - normalised_carbs_current_case, 2));
                    
                    // Thresholding to measure quality of case
                    if(case_similarity < SIMILARITY_THRESHOLD){
                        
                        // Turn it to an object
                        let potential_case = case_base_item.toObject({ getters: true })
                        
                        // Add the similarity
                        potential_case.similarity = case_similarity
                        
                        // Add the result to the array
                        similar_cases.push(potential_case);
                    }
                }
            });
    
            // Do we have a match?
            if(similar_cases === undefined || similar_cases.length == 0){
                
                // No match so initialise return data to unsuccessful
                return_data = {success:false}
                
            } else {
                
                // Sort the cases to get lowest similarity
                similar_cases.sort(function(a, b){
                    return a.similarity - b.similarity;
                });   

                // Initialise return data to successful and add the most similar case to it
                return_data = {
                    success:true,
                    recommended_dose:similar_cases[0]
                }
            }
      
            // Finally send back the response
            res.send(JSON.stringify(return_data));
        
        } catch(err) {

            return next(err);
        }
    }
}

