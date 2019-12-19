// Get our model
const BloodGlucoseModel = require('../models/blood_glucose_level');

// Get our operations
const statistic_operations = require('../statistics/statistic-operations');

module.exports = {
    
    getAverages: async (req, res, next) => {       
        
        try {

            // Query for data in last 30 days
            let week_results = await BloodGlucoseModel.find({"datetime": {$gte: new Date((new Date().getTime() - (7 * 24 * 60 * 60 * 1000))), $lt: new Date()}}).sort({ "datetime": -1 });
            let month_results = await BloodGlucoseModel.find({"datetime": {$gte: new Date((new Date().getTime() - (30 * 24 * 60 * 60 * 1000))), $lt: new Date()}}).sort({ "datetime": -1 });
            let three_month_results = await BloodGlucoseModel.find({"datetime": {$gte: new Date((new Date().getTime() - (90 * 24 * 60 * 60 * 1000))), $lt: new Date()}}).sort({ "datetime": -1 });
                
            let averages;
            let average_week;
            let average_month;
            let average_three_month;
            
            if(week_results === undefined || week_results.length == 0){
                average_week = 0;
            } else {
                average_week = await statistic_operations.getMean(week_results);
            }
            
            if(month_results === undefined || month_results.length == 0){
                average_month = 0;
            } else {
                average_month = await statistic_operations.getMean(month_results);
            }
            
            if(three_month_results === undefined || three_month_results.length == 0){
                average_three_month = 0;
            } else {
                average_three_month =  await statistic_operations.getMean(three_month_results);
            }

            // Construct our JSON object to return
            averages = {
                week:average_week,
                month:average_month,
                three_month:average_three_month
            };
    
            // Send back our response
            res.send(JSON.stringify(averages));
            
        } catch(err) {
            return next(err);
        }
    },

    getResultsByLevel: async (req, res, next) => {

        try {
            
            // Get results by category 
            const VL = await BloodGlucoseModel.countDocuments({$and: [{level: {$gte: 0.0}},{level: {$lt: 2.0 }}]})
            const L = await BloodGlucoseModel.countDocuments({$and: [{level: {$gte: 2.0}},{level: {$lt: 4.0 }}]})
            const N = await BloodGlucoseModel.countDocuments({$and: [{level: {$gte: 4.0}},{level: {$lt: 13.0 }}]})
            const H = await BloodGlucoseModel.countDocuments({$and: [{level: {$gte: 13.0}},{level: {$lt: 16.0 }}]})
            const VH = await BloodGlucoseModel.countDocuments({$and: [{level: {$gte: 16.0}},{level: {$lte: 30.0 }}]})
    
            // Construct our JSON object to return
            let category_counts = {
                very_low: VL,
                low: L,
                normal: N,
                high: H,
                very_high: VH
            };
    
            // Send back our response
            res.send(JSON.stringify(category_counts));

        } catch(err) {
            return next(err);
        }
    },

    getAverageByTime: async(req, res, next) => {

        try {
            
            // Get the averages for the time
            const breakfast_levels = await BloodGlucoseModel.find({meal: 'breakfast'});
            const lunch_levels = await BloodGlucoseModel.find({meal: 'lunch'});
            const dinner_levels = await BloodGlucoseModel.find({meal: 'dinner'});
            const bed_levels = await BloodGlucoseModel.find({meal: 'bed'});
    
            // Check if undefined, if so then make 0, else get the mean
            let averages_by_time = {
                breakfast_average: breakfast_levels === undefined || breakfast_levels.length == 0 ? 0 : await statistic_operations.getMean(breakfast_levels),
                lunch_average: lunch_levels === undefined || lunch_levels.length == 0 ? 0 : await statistic_operations.getMean(lunch_levels),
                dinner_average: dinner_levels === undefined || dinner_levels.length == 0 ? 0 : await statistic_operations.getMean(dinner_levels),
                bed_average: bed_levels === undefined || bed_levels.length == 0 ? 0 : await statistic_operations.getMean(bed_levels),
            };        
    
            // Send back our response
            res.send(JSON.stringify(averages_by_time));

        } catch(err) {
            return next(err);
        }

    },

    getLowsByMeal: async(req, res, next) => {

        try {
      
            // Get the counts for each meal
            const breaksfast_lows = await BloodGlucoseModel.countDocuments({$and: [{level: {$gte: 0.0}},{level: {$lte: 4.0 }},{meal:'breakfast'}]});
            const lunch_lows = await BloodGlucoseModel.countDocuments({$and: [{level: {$gte: 0.0}},{level: {$lte: 4.0 }}, {meal:'lunch'}]});
            const dinner_lows = await BloodGlucoseModel.countDocuments({$and: [{level: {$gte: 0.0}},{level: {$lte: 4.0 }}, {meal:'dinner'}]}); 
            const bed_lows = await BloodGlucoseModel.countDocuments({$and: [{level: {$gte: 0.0}},{level: {$lte: 4.0 }}, {meal:'bed'}]}); 
    
            // Construct our JSON object to return
            let lows_by_meal= {
                breakfast_lows: breaksfast_lows,
                lunch_lows: lunch_lows,
                dinner_lows: dinner_lows,
                bed_lows: bed_lows
            }
    
            // Send back our response
            res.send(JSON.stringify(lows_by_meal));

        } catch(err) {
            return next(err);
        }
        
    },
    
    getHighsByMeal: async(req, res, next) => {

        try {

            // Get the counts for each meal
            const breaksfast_highs = await BloodGlucoseModel.countDocuments({$and: [{level: {$gte: 13.0}},{level: {$lt: 40.0 }},{meal:'breakfast'}]});
            const lunch_highs = await BloodGlucoseModel.countDocuments({$and: [{level: {$gte: 13.0}},{level: {$lt: 40.0 }}, {meal:'lunch'}]});
            const dinner_highs = await BloodGlucoseModel.countDocuments({$and: [{level: {$gte: 13.0}},{level: {$lt: 40.0 }}, {meal:'dinner'}]}); 
            const bed_highs = await BloodGlucoseModel.countDocuments({$and: [{level: {$gte: 13.0}},{level: {$lt: 40.0 }}, {meal:'bed'}]}); 
    
             // Construct our JSON object to return
             let highs_by_meal = {
                breakfast_highs: breaksfast_highs,
                lunch_highs: lunch_highs,
                dinner_highs: dinner_highs,
                bed_highs: bed_highs
            }
    
            // Send back our response
            res.send(JSON.stringify(highs_by_meal));
        } catch(err) {
            return next(err);
        }
       
    },

    getMedianByTime: async(req, res, next) => {

        try {
            
            // Get the medians for the time
            const breakfast_levels = await BloodGlucoseModel.find({meal: 'breakfast'});
            const lunch_levels = await BloodGlucoseModel.find({meal: 'lunch'});
            const dinner_levels = await BloodGlucoseModel.find({meal: 'dinner'});
            const bed_levels = await BloodGlucoseModel.find({meal: 'bed'});
    
                // Check if undefined, if so then make 0, else get the median
            let medians_by_time = {
                breakfast_median: breakfast_levels === undefined || breakfast_levels.length == 0 ? 0 : await statistic_operations.getMedian(breakfast_levels),
                lunch_median: lunch_levels === undefined || lunch_levels.length == 0 ? 0 : await statistic_operations.getMedian(lunch_levels),
                dinner_median: dinner_levels === undefined || dinner_levels.length == 0 ? 0 : await statistic_operations.getMedian(dinner_levels),
                bed_median: bed_levels === undefined || bed_levels.length == 0 ? 0 : await statistic_operations.getMedian(bed_levels),
            };        
    
            // Send back our response
            res.send(JSON.stringify(medians_by_time));

        } catch(err) {
            if (err) return next(err);
        }

    }
}