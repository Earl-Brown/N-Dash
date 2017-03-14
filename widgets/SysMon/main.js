/*
	TODO list:
		*	create and use "callback list" base class


*/

(
	() => {
		'use strict';

		Sugar.extend();

		// this requires electron!!!
		var os = electron.require("os");

		const services = (() => {
			const module = angular.module("electronService", []);

			const memoryDetailsProvider = (() => {
				const api = {
					free() { return os.freemem()},
					total() {return os.totalmem()},
					current() {
						return {
							total: api.total(),
							free: api.free()
						}
					},
				}

				return api;
			})();

			const cpuDetailsProvider = (() => {
				return {
					current: () => os.cpus()
				}
			})();

			const memService = module.service( 
				"electronMemoryService", 
				function () { return memoryDetailsProvider; }
			); 

			const cpuService = module.service(
				"electronCPUService",
				function () { return cpuDetailsProvider; }
			)
		})(); 

		const app = angular.module('app', ["electronService"]);

		const memoryController = app.controller("memoryController", [
			"$scope",
			"$interval",
			"electronMemoryService", 
			function ($scope, $interval, memoryService) {

				$scope.abbreviateTotal = () => {
					return Number($scope.total).bytes(0, true, "si")
				}

				var getCurrent = () => {
					var current = memoryService.current();
					$scope.free = current.free, 
					$scope.total  = current.total,
					$scope.percentFree = ($scope.free / $scope.total) * 100,
					$scope.percentUsed = 100 - $scope.percentFree
				}

				$interval(getCurrent, 1000);
			}
		]);
		
		const memoryHistoryController = app.controller("memoryHistoryController", [
			"$scope", 
			"$controller",
			function ($scope, $controller) {
				// inherit from memoryController
				$controller("memoryController", {$scope: $scope});
				$scope.history = [];

				$scope.$watch("free", function(is, was) {
					$scope.history.push({free: $scope.free, total: $scope.total});
					if ($scope.history.length > 10) $scope.history.shift();
				})

				$scope.history.getPercentFree = (idx) => {
					if (idx >= $scope.history.length) return 0;

					var selected = $scope.history[idx],
						free = selected.free,
						total = selected.total;

					return 100 * free / total;
				}
				$scope.history.getPercentUsed = (idx) => (100 - $scope.history.getPercentFree(idx));
			}
		]);

		const MemoryHistoryChartComponent = app.component(
			"memoryHistoryChart", {
				bindings: {
					source: "=source"
				},
				template: [
					"<div>",
					"<div ng-repeat='item in $ctrl.source'><span ng-if='item.free && item.total'>{{$ctrl.source.getPercent($index).toFixed(2)}}</span></div>",
					"</div>"
				].join("")
			}
		)

		const MemoryHistoryGraphComponent = app.component(
			"memoryHistoryGraph", {
				bindings: {
					source: "=source"
				},
				template: [
					"<table class='memory-history-graph'>",
					"<tr><td ng-repeat='item in $ctrl.source'><div class='data-point' ng-style='{height: $ctrl.source.getPercentUsed($index) + \"%\"}'></div></td></tr>",
					"</table>",
				].join("")
			}
		)

		const cpuController = app.controller("cpuController", [
			"$scope",
			"$interval",
			"electronCPUService", 
			function($scope, $interval, cpuService) {
				var priorList = cpuService.current();
				var getCurrent = () => {
					var currentList = cpuService.current();

					var state = {
						total: 0,
						totalActive: 0,
						totalIdle: 0,
						totalPercent: 0
					}

					state.currentValues = currentList.map(
						(cpu, idx) => {
							var prior = priorList[idx],
								times = cpu.times,
								priorTimes = prior.times,
								newValues = {
									user: times.user - priorTimes.user,
									nice: times.nice - priorTimes.nice,
									sys: times.sys - priorTimes.sys,
									idle: times.idle - priorTimes.idle,
									irq: times.irq - priorTimes.irq
								}

							newValues.active = 
								newValues.user 
								+ newValues.nice 
								+ newValues.sys 
								+ newValues.irq;
							newValues.total = 
								newValues.active 
								+ newValues.idle;
							newValues.activePercent = (
								newValues.active / newValues.total
							) * 100;

							state.totalActive += newValues.active;
							state.totalIdle += newValues.idle;
							state.total += newValues.total;

							return newValues;
						}
					);

					state.totalPercent = (state.totalActive / state.total) * 100;

					Sugar.Object.merge($scope, state);

					priorList = currentList;
				};

				$interval(getCurrent, 1000);
			}
		]);

		const cpuHistoryController = app.controller("cpuHistoryController", [
			"$scope",
			"$controller",
			function($scope, $controller) {

				var maxEntries = 50;

				$controller("cpuController", {$scope: $scope});
				$scope.history = Sugar.Array.construct(maxEntries, () => {
					return {
						totalActive: 0,
						totalIdle: 0,
						totalPercent: 0,
						total: 0
					}
				});

				$scope.$watch("total", function(is, was) {
					$scope.history.push(
						{
							totalActive: $scope.totalActive, 
							totalIdle: $scope.totalIdle, 
							totalPercent: $scope.totalPercent,
							total: is
						}
					);
					if ($scope.history.length >= maxEntries) $scope.history.shift();
				})
			}
		])

		const CPUStateChartComponent= app.component(
			"cpuStateChart", {
				bindings: {
					source: "=source"
				},
				template: [
					"<table class='cpu-state-chart'>",
					"<tbody ng-repeat='cpu in $ctrl.source'>",
					"<tr>",
						"<th><label>{{cpu.activePercent.toFixed(0)}}%</label></th>",
						"<td><div class='blue-meter' ng-style='{width: cpu.activePercent + \"%\"}'></div></td>",
					"</tr>",
					"</tbody>",
					"</table>"
				].join("")
			}
		)

		const CPUHistoryChartComponent = app.component(
			"cpuHistoryChart", {
				bindings: {
					source: "=source"
				},
				template: [
					"<div>",
					"<div ng-repeat='item in $ctrl.source'><span ng-if='item.totalPercent'>{{item.totalPercent}}</span></div>",
					"</div>"
				].join("")
			}
		)

		const CPUHistoryGraphComponent = app.component(
			"cpuHistoryGraph", {
				bindings: {
					source: "=source"
				},
				template: [
					"<table class='cpu-history-graph'>",
					"<tr><td ng-repeat='item in $ctrl.source'><div class='data-point' ng-style='{height: item.totalPercent + \"%\"}'></div></td></tr>",
					"</table>"
				].join("")
			}
		)

		const dateTimeController = app.controller(
			"dateTimeController", [
				"$scope",
				"$interval",
				function ($scope, $interval) {
					function update() {
						$scope.date = Sugar.Date.create();
					}
					$interval(update, 1000);
				}
			]
		)

	}

)();
