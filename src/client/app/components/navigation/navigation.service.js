angular
	.module('Scheduling')
	.service('navigationService',[ '$http', function($http){

		return {
			getCompany: function(company_id){
				return $http.get('/api/users/company/' + company_id)
										.then(function(res){
										  return res;
										})
										.catch(function(err){
										  return err;
										});
			},
			getEmployee: function(employee_id){
				return $http.get('/api/users/employee/' + employee_id) // '/employee/ <-- needs to be singular'
										.then(function(res){
										  return res;
										})
										.catch(function(err){
										  return err;
										});
			}
		};

}]);