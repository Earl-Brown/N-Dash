os.freemem() to see how much physical memory is free

os.totalMem() to see the total

calculate cpu usage using os.cpus()
* command-line for polling frequency (default to one second)
* subtract all current values from prior values to get delta-since-last-check
* calculate load by adding all values and dividing that by idle time values
	* it might be that we need to use (total - idle/total)

Components to make:

* PercentBar
* PercentValue
* ScrollingGraph
* DateLabel
* TimeLabel
* DateTimeLabel

use [electron](http://electron.atom.io/docs/) for UI

Todo:

<input type="checkbox"> UI 
<br/>
<input type="checkbox"> Data capture
<br/>
<input type="checkbox"> blur on mouse over
<br/>
<input type="checkbox"> save position when moved
<br/>
<input type="checkbox"> restore position on load
<br/>
<input type="checkbox"> replace webcam
<br/>
<input type="checkbox"> Make a UI for configuration


