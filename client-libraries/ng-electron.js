// run this script after the angular script has loaded.

if (angular) {
	var service = angular.module("electronServices", []);
	
	var comms = electron.require("electron").ipcRenderer;

	var settingsService = service.service("settings", [
		function() {
			var api = {
				current: {},
				Save: save,
				save: save
			}

			api.Load = () => new Promise((resolve, reject) => {
				comms.once("settings", (evt, args) => {
					api.current = args;
					resolve(api.current);
				});

				comms.send("getConfig");
			});

			function save() {
				console.log("save called");	
				comms.send("saveConfig", JSON.stringify(this.current, undefined, 2));
			}

			return api;
		}
	]);

}