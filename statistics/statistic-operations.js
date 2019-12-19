const statistic_operations = {
   
    // Get mean
    getMean: (blood_glucose_results) => {
        
        let total = 0;

        // Loop through levels and find mean
        blood_glucose_results.forEach((result) => {
            total += parseFloat(result.level);
        });


        // Return mean
        return (total / blood_glucose_results.length).toFixed(1);
    },

    getMedian: (blood_glucose_results) => {
        
        let median = 0;
        let count = blood_glucose_results.length;

        // Loop through levels and find mean
        blood_glucose_results.sort(function(a, b){
            return a.level - b.level;
        });   

        // Is the split an even number?
        if (count % 2 === 0) { 
            median = (blood_glucose_results[count / 2 - 1].level + blood_glucose_results[count / 2].level) / 2;
        } else {
            median = blood_glucose_results[(count - 1) / 2].level;
        }

        // Return the median
        return median.toFixed(1);
    }
}

module.exports = statistic_operations;