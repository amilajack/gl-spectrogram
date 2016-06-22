/**
 * Lightweight canvas version of a spectrogram.
 * @module gl-spectrogram/2d
 */

var Spectrogram = require('./lib/core');
var parseColor = require('color-parse');
var clamp = require('mumath/clamp');

module.exports = Spectrogram;

Spectrogram.prototype.context = '2d';
Spectrogram.prototype.autostart = false;

Spectrogram.prototype.init = function () {
	var ctx = this.context;

	//render only on pushes
	this.on('push', (magnitudes) => {
		this.render(magnitudes);
	});

	//on color update
	this.on('update', () => {
		this.colorValues = parseColor(this.color).values;
		this.bgValues = parseColor(this.canvas.style.background).values;
	});
};


//get mapped frequency
function lg (x) {
	return Math.log(x) / Math.log(10);
}

Spectrogram.prototype.f = function (ratio) {
	var halfRate = this.sampleRate * .5;
	if (this.logarithmic) {
		var logF = Math.pow(10., Math.log10(this.minFrequency) + ratio * (Math.log10(this.maxFrequency) - Math.log10(this.minFrequency)) );
		ratio = (logF - this.minFrequency) / (this.maxFrequency - this.minFrequency);
	}

	var leftF = this.minFrequency / halfRate;
	var rightF = this.maxFrequency / halfRate;

	ratio = leftF + ratio * (rightF - leftF);

	return ratio;
}

//return color based on current palette
Spectrogram.prototype.getColor = function (ratio) {
	var cm = this.colormap;
	var idx = ratio*cm.length*.25;
	var left = cm.slice(Math.floor(idx)*4, Math.floor(idx)*4 + 4);
	var right = cm.slice(Math.ceil(idx)*4, Math.ceil(idx)*4 + 4);
	var amt = idx % 1;
	var values = left.map((v,i) => (v * (1 - amt) + right[i] * amt)|0 );
	return `rgba(${values.join(',')})`;
}

Spectrogram.prototype.draw = function (data) {
	var ctx = this.context;
	var width = this.viewport[2],
		height = this.viewport[3];

	if (!this.bgValues) {
		return;
	}

	//displace canvas
	var imgData = ctx.getImageData(this.viewport[0], this.viewport[1], width, height);
	ctx.putImageData(imgData, this.viewport[0]-1, this.viewport[1]);


	//put new slice
	for (var i = 0; i < height; i++) {
		var ratio = i / height;
		var amt = data[(this.f(ratio) * data.length)|0] / 255;
		amt = clamp((amt * 100. - 100 - this.minDecibels) / (this.maxDecibels - this.minDecibels), 0, 1);
		ctx.fillStyle = this.getColor(amt);
		ctx.fillRect(this.viewport[0] + width - 1, this.viewport[1] + height - i, 1, 1);
	}
}