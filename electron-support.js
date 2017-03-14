// this must be run as a VERY early script; any 
//	scripts that use "require" will fail if they are run before this one.
process.once("loaded", () => {
	global.electron = {
		require: window.require || require || function() {},
		exports: window.exports || exports || null,
		module: window.module || module || null
	};

	delete window.require;
	delete window.exports;
	delete window.module;
});
