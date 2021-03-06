var express = require("express");
var router = express.Router();
var moment = require('moment');
var jwt = require('jwt-simple');
var knex = require('../../../db/knex.js');
var queries = require("../../../queries");


// get ALL employees and their conflicts (by company)
router.get('/employees/:company_id', function(req, res, next){
	var company_id = req.params.company_id;
		queries.getEmployeesAndConflicts(company_id)
			.then(function(data) {
				// console.log('Array of Employees: ', data);

				var uniqBy = function(a, key) {
				    var seen = {};
				    return a.filter(function(item) {
				        var k = key(item);
				        return seen.hasOwnProperty(k) ? false : (seen[k] = true);
				    });
				};

				var employeesArray = uniqBy(data, function(item){return item.id;});

				var employees = employeesArray.map(function(employee){
					return {
						id: employee.id,
				    first_name: employee.first_name,
				    last_name: employee.last_name,
				    email: employee.email,
				    phone: employee.phone,
				    admin: employee.admin,
				    company_id: employee.company_id,
				    picture: employee.picture,
				    conflicts: []
					};
				});

				var employeesWithConflicts = function(){
					for(var i=0; i<employees.length; i++){
						for(var j=0; j<data.length; j++){
							if(data[j].employee_id == employees[i].id){
								employees[i].conflicts.push(
									{
										conflict_id: data[j].conflict_id,
										employee_id: data[j].employee_id,
										date: data[j].date
									}
									);
							}
						}
					}
					return employees;
				};

			  res.status(200).json({
			    status: 'success',
			    data: employeesWithConflicts()
			  });
			})
			.catch(function (err) {
			  return next(err);
			});
});


// get company by id
router.get('/company/:company_id', function(req, res, next){
	var company_id = req.params.company_id;
		queries.getCompany(company_id)
			.then(function(company) {
				console.log('company: ', company);
			  res.status(200).json({
			    status: 'success',
			    data: company
			  });
			})
			.catch(function (err) {
			  return next(err);
			});
});


// get employee by id '/employee/ <-- needs to be singular'
router.get('/employee/:employee_id', function(req, res, next){
	var employee_id = req.params.employee_id;
		queries.getEmployee(employee_id)
			.then(function(employee) {
				console.log('employee: ', employee);
			  res.status(200).json({
			    status: 'success',
			    data: employee
			  });
			})
			.catch(function (err) {
			  return next(err);
			});
});

// get employee by id '/employee/ <-- needs to be singular'
router.get('/employee/profile/:employee_id', function(req, res, next){

	var employee_id = req.params.employee_id;
		
		queries.getEmployeeAndConflicts(employee_id)
			.then(function(employee) {
				// console.log('employee--: ', employee);

				var employeeData = {
					id: employee[0].id,
					first_name: employee[0].first_name,
					last_name: employee[0].last_name,
					email: employee[0].email,
					phone: employee[0].phone,
					admin: employee[0].admin,
					company_id: employee[0].company_id,
					picture: employee[0].picture,
					conflicts: []
				};

				// console.log('employeeData 1: ', employeeData);

				var employeeObject = function(){
					for(var i=0; i<employee.length; i++){
						employeeData.conflicts.push({
							conflict_id: employee[i].conflict_id,
							employee_id: employee[i].employee_id,
							date: employee[i].date
						});
					}
					// console.log('employeeData 2: ', employeeData);
					return employeeData;
				};

				res.status(200).json({
				  status: 'success',
				  data: employeeObject()
				});
			})
			.catch(function (err) {
			  return next(err);
			});
});


// add new employee (with company id)
router.post('/employees', function(req, res, next) {
	queries.NewUser(req.body)
		.then(function(newUser) {
		    res.status(200).json({
		        status: 'success',
		        data: {
		            new_employee: newUser
		        }
		    });
		})
		.catch(function(err) {
		    console.log(err);
		    res.send(err);
		});
});


// delete employee (by employee_id)
router.delete('/employees/delete/:employee_id', function(req, res, next){
	var employee_id = req.params.employee_id;

		queries.deleteConflicts(employee_id)
					 .then(function(){
					 		queries.deleteEmployee(employee_id)
					 			.then(function() {
					 			    res.status(200).json({
					 			        status: 'deleted employee'
					 			    });
					 			});
					 })
					 .catch(function(error){
					 		console.log(error);
					 		res.send(error);
					 });
});

// + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + 
// edit employee (by employee_id)
router.put('/employees/edit', function(req, res, next){
	
	var employee = req.body;

	var employeeData = {
		id: employee.id,
		first_name: employee.first_name,
		last_name: employee.last_name,
		email: employee.email,
		phone: employee.phone,
		picture: employee.picture,
		notes: employee.notes
	};


		if(employee.newConflicts.length){
			var promises = employee.newConflicts.map(function(conflict){
					var dateData = {
							employee_id: employee.id,
							date: conflict,
					};
				return queries.addConflict(employee.id, dateData);
			});

			var promises2 = employee.conflicts.map(function(conflict){
					if(conflict.remove){
						return queries.deleteConflict(conflict.conflict_id);
					}
			});


			promises = promises.concat(promises2);
			console.log("length: ", promises.length);
			// promises.map(function(conflict){
			// 		if(conflict.remove){
			// 			return queries.deleteConflict(conflict.conflict_id);
			// 		}
			// });

			Promise.all(promises)
						 .then(function(){
							 	queries.editEmployee(employeeData)
							 		.then(function(edited_employee) {
							 		    res.status(200).json({
							 		        status: 'success',
							 		        data: {
							 		            edited_employee: edited_employee
							 		        }
							 		    });
							 		});
						 })
						 .catch(function(err) {
						     console.log(err);
						     res.send(err);
						 });

		} else if(employee.conflicts.length){

				var proms = employee.conflicts.map(function(conflict){
							// var conflictData = {
							// 	id: conflict.conflict_id,
							// 	employee_id: conflict.employee_id,
							// 	date: conflict.date
							// };
						if(conflict.remove){
							return queries.deleteConflict(conflict.conflict_id);
						}
				});
			Promise.all(proms)
						 .then(function(){
							 	queries.editEmployee(employeeData)
							 		.then(function(edited_employee) {
							 		    res.status(200).json({
							 		        status: 'success',
							 		        data: {
							 		            edited_employee: edited_employee
							 		        }
							 		    });
							 		});
						 })
						 .catch(function(err) {
						     console.log(err);
						     res.send(err);
						 });
		} else {
			queries.editEmployee(employeeData)
				.then(function(edited_employee) {
				    res.status(200).json({
				        status: 'success',
				        data: {
				            edited_employee: edited_employee
				        }
				    });
				});
		}
			
});

// get conflicts by employee_id
router.get('/conflicts/:employee_id', function(req, res, next){
	var employee_id = req.params.employee_id;
		queries.getConflicts(employee_id)
			.then(function(conflicts) {
				console.log('conflicts: ', conflicts);
			  res.status(200).json({
			    status: 'success',
			    data: conflicts
			  });
			})
			.catch(function (err) {
			  return next(err);
			});
});

// update conflicts by employee_id
router.put('/conflicts/update/:employee_id', function(req, res, next){
	var employee_id = req.params.employee_id;
	var conflicts = req.body;

	// need to delete conflicts with remove == true
	// need to update conflicts with remove == false

	var promises = conflicts.map(function(conflict){
		var conflictData = {
			id: conflict.id,
			employee_id: conflict.employee,
			date: conflict.date
		};

			if(conflict.remove){
				return queries.deleteConflict(conflictData.id);
			} else {
				return queries.updateConflict(employee_id, conflictData);
			}

	});

	Promise.all(promises)
				 .then(function(conflicts){
			 			console.log('conflicts: ', conflicts);
			 		  res.status(200).json({
			 		    status: 'success',
			 		    data: conflicts
			 		  });
				 })
				 .catch(function(err){
				 		return next(err);
				 });
});

// + + + + + + + + + + + + + + + + + + + + + + + + + +
// get on_call_schedule by company_id
router.get('/on_call_schedule/:company_id', function(req, res, next){
	var company_id = req.params.company_id;
		queries.getOnCallDates(company_id)
			.then(function(on_call_dates) {
				console.log('on_call_dates: ', on_call_dates);
			  res.status(200).json({
			    status: 'success',
			    data: on_call_dates
			  });
			})
			.catch(function (err) {
			  return next(err);
			});
});
// + + + + + + + + + + + + + + + + + + + + + + + + + +
// need to eliminate the possiblity of double booking
router.post('/on_call_schedule/:company_id', function(req, res, next) {

	var company_id = req.params.company_id;
	var employees = req.body;

	var weekdays = employees.map(function(employee){
			return employee.onCall.weekdays.map(function(date){
				var onCallData = {
					employee_id: employee.id,
					company_id: company_id,
					date: date,
					type: 1
				};
				return queries.addOnCallDate(onCallData);
			});
	});

	weekdays = weekdays.reduce(function (prev, curr) {
		return prev.concat(curr);
	});
	// console.log("weekdays: ", weekdays); 
	// returns unresloved promises pertaining to weekdays 

	// if queries.findOnCallDate == true, skip date

	var weekends = employees.map(function(employee){
			return employee.onCall.weekends.map(function(date){
				var onCallData = {
					employee_id: employee.id,
					company_id: company_id,
					date: date,
					type: 2
				};
				return queries.addOnCallDate(onCallData);
			});
	});

	weekends = weekends.reduce(function (prev, curr) {
		return prev.concat(curr);
	});

	var holidays = employees.map(function(employee){
			return employee.onCall.holidays.map(function(date){
				var onCallData = {
					employee_id: employee.id,
					company_id: company_id,
					date: date,
					type: 3
				};
				return queries.addOnCallDate(onCallData);
			});
	});

	holidays = holidays.reduce(function (prev, curr) {
		return prev.concat(curr);
	});
	
	var promises = weekdays.concat(weekends).concat(holidays);

	Promise.all(promises)
		.then(function(schedule) {
		    console.log('schedule', schedule);
		    res.status(200).json({
		        status: 'success',
		        data: {
		            on_call_schedule: schedule
		        }
		    });
		})
		.catch(function(err) {
		    console.log(err);
		    res.send(err);
		});
});

// delete employee (by employee_id)
router.delete('/on_call_schedule/:company_id', function(req, res, next){
	var company_id = req.params.company_id;

		queries.deleteSchedule(company_id)
			 		 .then(function() {
			 			    res.status(200).json({
			 			        status: "deleted company's schedule" 
			 			    });
			 			})
					 .catch(function(error){
					 		console.log(error);
					 		res.send(error);
					 });
});


module.exports = router;
