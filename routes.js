var express = require('express');

var bloodGlucoseController = require('./controllers/bloodGlucoseController');
var recommendationController = require('./controllers/recommendationController');
var patternController = require('./controllers/patternController');
var doseCalculatorController = require('./controllers/doseCalculatorController');
var statisticController = require('./controllers/statisticController');

var router = express.Router();

router.route('/').get(function (req, res) {
    res.send('API successfully running.')
})

// Blood Glucose Diary Routes
router.route('/add_diary_entry').post(bloodGlucoseController.addBloodGlucoseEntry);
router.route('/get_diary').get(bloodGlucoseController.getDiary);
router.route('/get_blood_glucose_by_id/:id').get(bloodGlucoseController.getBloodGlucoseEntryById);

// Recommendation Routes
router.route('/refresh_recommendations').get(recommendationController.refreshRecommendations);
router.route('/get_recommendations').get(recommendationController.getRecommendations);
router.route('/get_unseen_recommendations').get(recommendationController.getUnseenRecommendations);
router.route('/mark_recommendation_as_seen/:id').get(recommendationController.markRecommendationAsSeen);

// Pattern Routes
router.route('/get_pattern_by_id/:id').get(patternController.getPatternById);
router.route('/check_for_fixed_patterns').get(patternController.checkIfFixedPatterns);
router.route('/check_for_pattern_causes/:id').get(patternController.checkPatternCauses);

// Recommended Dose Case Based Reasoning Routes
router.route('/get_recommended_dose').post(doseCalculatorController.getRecommendedDose);

// Statistics Routes
router.route('/get_averages').get(statisticController.getAverages);
router.route('/get_results_by_level').get(statisticController.getResultsByLevel);
router.route('/get_average_by_time').get(statisticController.getAverageByTime);
router.route('/get_lows_by_meal').get(statisticController.getLowsByMeal);
router.route('/get_highs_by_meal').get(statisticController.getHighsByMeal);
router.route('/get_median_by_time').get(statisticController.getMedianByTime);

module.exports = router;