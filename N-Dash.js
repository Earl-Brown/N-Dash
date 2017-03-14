// TODO:
//	* when windows close from user closing them, mark them disabled in the config
//	* add system tray icon
//		+ Exit
//		+ Show/hide widgets (checkmark)
//		+ Edit configuration
//		+ install widgets
//	* expose system tray API - allow for sub-widgets
//	* when instance-specific settings not found in widget config, copy them 
//		from package.json
//	* per-user configurations instead of global
//		+ global widgets
//		* per-user widgets
//		* make configurations all per-user (copy global configuration to user configuration)

let
	fs = require("fs"),
	path = require("path"),
	url = require("url"),

	widgetsFolder = path.join(__dirname, "widgets"),
	librariesFolder = path.join(__dirname, "client-libraries"),

 	Sugar = require(
		path.join(librariesFolder, "sugar.js")
	),

	packagePath = path.join(__dirname, "package.json"),
	package = require(packagePath),
	{mappedFolders, configDefaults} = package,
	installedWidgets = package.widgets,

	cmdLine = require("yargs")
		.option("d", {
			alias: "debug",
			demand: false,
			default: false, 
			describe: "Enable debugging features",
			type: "boolean"
		})
		.argv,

	{app, BrowserWindow, protocol, ipcMain} = require("electron"),

	Promise = require(
		path.join(librariesFolder, "bluebird.js")
	),

	mainWindow = null,

	_undefined = undefined
	;

Sugar.extend();

function CreateWindow(url, cfg) {
	let config = Object.add(
		{
			webPreferences: {
				preload: path.join(__dirname, "electron-support.js")
			}
		}, 
		cfg, 
		{
			resolve: true
		}
	);

	_win = new BrowserWindow(config);

	_win.once("ready-to-show", _win.show);
	_win.on("closed", () => _win = null);

	_win.loadURL(url);
	if (config.debug) _win.webContents.openDevTools();

	return _win;
}

const saveSettings = (configPath, settingsObj, propertyName) => {

	if(propertyName) {
		var fullSettings = require(configPath);
		fullSettings[propertyName] = settingsObj;
		settingsObj = fullSettings;
	}

	var toSave = JSON.stringify(settingsObj, undefined, 2);

	fs.writeFile(configPath, toSave, (err, value) => {
		if (!err) console.log("settings saved");
		else {
			console.log("error saving settings", JSON.stringify(err, undefined, 2));
		}
	});
}


function saveWindowMetrics(evt, widget) {

	// do we get the source window in any of the parameters?  
	var {x, y, width, height} = widget.window.getBounds();
	widget.config.windowMetrics = {
		x: x, y: y,
		width: width, height: height
	}

	saveSettings(widget.configPath, widget.config, widget.name);
}


// normalize folder mappings to suit the file system.
for(var key in mappedFolders) {
	var value = mappedFolders[key];
	if (key.charAt(0) != path.sep) key = path.join(path.sep, key);
	if (value.charAt(0) != path.sep) value = path.join(path.sep, value);
	mappedFolders[path.normalize(key)] = path.normalize(value);
}

function GetMappedPath(pathToMap) {
// pathToMap is expected to be an absolute path
		var 
			pathSeparator = path.sep,
			requestedFilePath = path.normalize(pathToMap),
			requestedPathNodes = requestedFilePath.split(path.sep),
			relativePath = path.normalize( 
				requestedPathNodes
				.slice(1)
				.join(pathSeparator)
			),
			absolutePath = path.join(pathSeparator, relativePath)
		;

		function FixupMappedPath(requestedRoot, mappedRoot) {
			return path.join(__dirname, mappedRoot, absolutePath.substr(requestedRoot.length));
		}

		for(var key in mappedFolders) {
			var value = mappedFolders[key],
				idx = absolutePath.toLowerCase().indexOf(key.toLowerCase())
			;
			if (idx == 0) return FixupMappedPath(key, value);
		}
		return requestedFilePath;
}

app.on("ready", 
() => {

	protocol.interceptFileProtocol("file", (request, callback) => {
//	Assumptions:
//		by the time this gets called, the url will have been made an absolute path - even if the requested file doesn't exist
//		the absolute path wil be a "file:///" url

	var mappedPath = GetMappedPath(request.url.substr(8));
		
		callback({path: path.normalize(mappedPath)});
	});

	app.on("quit", () => {
		protocol.uninterceptProtocol("http");
	});


	widgets = installedWidgets.map(widget => {
		if (!widget.enabled) return;

		widget.url = path.join(__dirname, "widgets", widget.folder, widget.entryPoint);
		widget.configPath = path.join(widgetsFolder, widget.folder, "config.json");
		try {
			var config = require(widget.configPath);
			widget.config = config[widget.name] || {};
		} catch(ex) {
			widget.config = {};
		}

// debugger items
		widget.config.debug = cmdLine.debug && widget.config.debug;
		widget.webPreferences = {
			devTools: widget.config.debug
		};

		var windowConfig = Object.merge({}, widget.config),
			metrics = windowConfig.windowMetrics || null;
		if (metrics) Object.merge(windowConfig, metrics);

		windowConfig.widget = widget;

		widget.window = CreateWindow(widget.url, windowConfig);
		widget.window.on("resize", (evt) => saveWindowMetrics(evt, widget));
		widget.window.on("move", (evt) => saveWindowMetrics(evt, widget));
	})
	
});

ipcMain.on("saveConfig", (evt, args) => {
	console.log("got it", args);
	//	update evt.sender.webContents.browserWindowOptions.widget.config.client
	//	but save evt.sender.webContents.browserWindowOptions.widget.config
	var 
		bwo = evt.sender.webContents.browserWindowOptions,
		widget = bwo.widget || {}
	;
		
// todo: double-check that widget is real
		if (!widget.config) widget.config = {};
		if (!widget.config.client) widget.config.client = {};

	var 
		config = widget.config,
		current = config.client || {},
		toSave = JSON.parse(args)
	;
	
	Object.merge(current, toSave);
	saveSettings(widget.configPath, config, widget.name);

});

ipcMain.on("getConfig", (evt) => {
	console.log("got it");

	// get the settings from the widget,
	//	evt.sender.webContents.browserWindowOptions.widget.config.client
	var bwo = evt.sender.webContents.browserWindowOptions,
		widget = bwo.widget || null,
		config = widget.config || null,
		current = config.client || {}
	;

	//	then send the message that has the settings back to the requester
	evt.sender.send("settings", current);
});


app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit()
})

app.on("activate", () => {
	if (win === null) createWindow();
})